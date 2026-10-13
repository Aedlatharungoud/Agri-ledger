"""
AgriLedger AI — Sale Unit Validation & Accounting Integrity Tests
==================================================================
Tests:
1. Create a market sale in BAG: gross = qty * rate (₹/BAG), no conversion factor.
2. Create a market sale in KG: gross = qty * rate (₹/KG), no conversion factor.
3. Verify rate is strictly per selected unit (BAG and KG are independent).
4. Reject missing unit (returns 400).
5. Reject unsupported unit (returns 400).
6. Reject zero and negative quantity (returns 400).
7. Reject negative rate (returns 400).
8. Update a sale's unit and rate: gross amount recalculated per selected unit.
9. Reject update with unsupported unit (returns 400).
10. Unauthenticated requests return 401.
11. Cross-farmer creation/update rejected (returns 403).
12. Legacy/incomplete unit records reported for review (unitNeedsReview flag).
13. Preserves existing historical records and settlement calculations.
"""

import sys
import os
import unittest
from unittest.mock import MagicMock, patch

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Stub MySQL dialect before backend import
_mysql_mock = MagicMock()
_mysql_mock.BIGINT = MagicMock(return_value=MagicMock())
for _name in (
    "pymysql",
    "MySQLdb",
    "sqlalchemy.dialects.mysql",
    "sqlalchemy.dialects.mysql.base",
    "sqlalchemy.dialects.mysql.pymysql",
):
    sys.modules[_name] = _mysql_mock

_user_mod = MagicMock()
_user_mod.User = MagicMock()
sys.modules["backend.models.user"] = _user_mod

from flask import Flask
from backend.extensions import db as _db

_db.create_all = lambda: None

from backend.routes.market_sale_routes import (
    market_sale_bp,
    parse_sale_unit,
    market_sale_to_dict,
    ALLOWED_UNITS,
)
from backend.models.market_sale import MarketSale
from backend.models.harvest import Harvest


def build_market_sale_test_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-sale-units-secret"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    _db.init_app(app)
    app.register_blueprint(market_sale_bp)
    return app


class DummyUser:
    def __init__(self, user_id=1, role="ADMIN", farmer_id=None):
        self.id = user_id
        self.role = role
        self.farmer_id = farmer_id


class TestMarketSaleUnits(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = build_market_sale_test_app()
        cls.client = cls.app.test_client()

    # -------------------------------------------------------------------------
    # Unit Helper Tests
    # -------------------------------------------------------------------------
    def test_01_parse_sale_unit_allowed_units(self):
        """parse_sale_unit accepts BAG, KG, QUINTAL, TON in any case."""
        for u in ("BAG", "KG", "QUINTAL", "TON", "bag", "kg", "quintal", "ton"):
            val, err = parse_sale_unit(u)
            self.assertIsNone(err)
            self.assertEqual(val, u.strip().upper())

    def test_02_parse_sale_unit_rejects_missing_and_empty(self):
        """parse_sale_unit rejects None, empty, whitespace, booleans."""
        with self.app.app_context():
            for bad in (None, "", "   ", True, False):
                val, err = parse_sale_unit(bad)
                self.assertIsNone(val)
                self.assertIsNotNone(err)
                self.assertEqual(err[1], 400)

    def test_03_parse_sale_unit_rejects_unsupported_units(self):
        """parse_sale_unit rejects non-allowed units like LITRE, BOX, METRIC_TON."""
        with self.app.app_context():
            for bad in ("LITRE", "BOX", "METRIC_TON", "CARTON", "PCS"):
                val, err = parse_sale_unit(bad)
                self.assertIsNone(val)
                self.assertIsNotNone(err)
                self.assertEqual(err[1], 400)
                self.assertIn("Unsupported sale unit", err[0].get_json()["message"])

    # -------------------------------------------------------------------------
    # Create Sale Tests: BAG vs KG (Independent Units)
    # -------------------------------------------------------------------------
    @patch("backend.routes.market_sale_routes.get_current_user")
    def test_04_create_market_sale_in_bag_direct_calculation(self, mock_get_user):
        """Creating sale in BAG: gross = quantitySold * ratePerUnit directly (no conversion)."""
        mock_get_user.return_value = DummyUser(1, "ADMIN")

        fake_harvest = MagicMock()
        fake_harvest.id = 10
        fake_harvest.farmer_id = 1
        fake_harvest.unit = "BAG"

        payload = {
            "farmerId": 1,
            "harvestId": 10,
            "saleDate": "2026-10-15",
            "quantitySold": 50,
            "unit": "BAG",
            "ratePerUnit": 1200.0,
            "marketName": "Warangal Market",
            "buyerName": "Agro Corp",
        }

        with patch.object(_db.session, "get", return_value=fake_harvest):
            with patch.object(_db.session, "add") as mock_add:
                with patch.object(_db.session, "commit"):
                    res = self.client.post("/api/market-sales", json=payload)
                    self.assertEqual(res.status_code, 201)
                    data = res.get_json()["marketSale"]
                    self.assertEqual(data["unit"], "BAG")
                    self.assertEqual(data["quantitySold"], 50.0)
                    self.assertEqual(data["ratePerUnit"], 1200.0)
                    # 50 BAG @ 1200 ₹/BAG = 60,000.00 directly
                    self.assertEqual(data["grossAmount"], 60000.0)
                    self.assertFalse(data["unitNeedsReview"])

    @patch("backend.routes.market_sale_routes.get_current_user")
    def test_05_create_market_sale_in_kg_direct_calculation(self, mock_get_user):
        """Creating sale in KG: gross = quantitySold * ratePerUnit directly (no conversion)."""
        mock_get_user.return_value = DummyUser(1, "ADMIN")

        fake_harvest = MagicMock()
        fake_harvest.id = 11
        fake_harvest.farmer_id = 1
        fake_harvest.unit = "KG"

        payload = {
            "farmerId": 1,
            "harvestId": 11,
            "saleDate": "2026-10-16",
            "quantitySold": 500,
            "unit": "KG",
            "ratePerUnit": 65.5,
            "marketName": "Jadcherla Market",
            "buyerName": "Cotton Traders",
        }

        with patch.object(_db.session, "get", return_value=fake_harvest):
            with patch.object(_db.session, "add"):
                with patch.object(_db.session, "commit"):
                    res = self.client.post("/api/market-sales", json=payload)
                    self.assertEqual(res.status_code, 201)
                    data = res.get_json()["marketSale"]
                    self.assertEqual(data["unit"], "KG")
                    self.assertEqual(data["quantitySold"], 500.0)
                    self.assertEqual(data["ratePerUnit"], 65.5)
                    # 500 KG @ 65.5 ₹/KG = 32,750.00 directly
                    self.assertEqual(data["grossAmount"], 32750.0)
                    self.assertFalse(data["unitNeedsReview"])

    @patch("backend.routes.market_sale_routes.get_current_user")
    def test_06_create_market_sale_missing_unit_rejected(self, mock_get_user):
        """Missing unit returns 400 error."""
        mock_get_user.return_value = DummyUser(1, "ADMIN")
        payload = {
            "farmerId": 1,
            "harvestId": 10,
            "saleDate": "2026-10-15",
            "quantitySold": 50,
            "ratePerUnit": 1200.0,
        }
        res = self.client.post("/api/market-sales", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("unit", res.get_json()["message"].lower())

    @patch("backend.routes.market_sale_routes.get_current_user")
    def test_07_create_market_sale_unsupported_unit_rejected(self, mock_get_user):
        """Unsupported unit returns 400 error."""
        mock_get_user.return_value = DummyUser(1, "ADMIN")
        payload = {
            "farmerId": 1,
            "harvestId": 10,
            "saleDate": "2026-10-15",
            "quantitySold": 50,
            "unit": "LITRES",
            "ratePerUnit": 1200.0,
        }
        res = self.client.post("/api/market-sales", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("unsupported sale unit", res.get_json()["message"].lower())

    @patch("backend.routes.market_sale_routes.get_current_user")
    def test_08_create_market_sale_invalid_quantity_rejected(self, mock_get_user):
        """Zero and negative quantitySold return 400 error."""
        mock_get_user.return_value = DummyUser(1, "ADMIN")
        for bad_qty in (0, -10, "abc"):
            payload = {
                "farmerId": 1,
                "harvestId": 10,
                "saleDate": "2026-10-15",
                "quantitySold": bad_qty,
                "unit": "BAG",
                "ratePerUnit": 500.0,
            }
            res = self.client.post("/api/market-sales", json=payload)
            self.assertEqual(res.status_code, 400)

    @patch("backend.routes.market_sale_routes.get_current_user")
    def test_09_create_market_sale_negative_rate_rejected(self, mock_get_user):
        """Negative ratePerUnit returns 400 error."""
        mock_get_user.return_value = DummyUser(1, "ADMIN")
        payload = {
            "farmerId": 1,
            "harvestId": 10,
            "saleDate": "2026-10-15",
            "quantitySold": 10,
            "unit": "BAG",
            "ratePerUnit": -50.0,
        }
        res = self.client.post("/api/market-sales", json=payload)
        self.assertEqual(res.status_code, 400)

    # -------------------------------------------------------------------------
    # Update Sale Tests
    # -------------------------------------------------------------------------
    @patch("backend.routes.market_sale_routes.get_current_user")
    def test_10_update_sale_unit_and_rate_recalculates_gross(self, mock_get_user):
        """Updating sale unit to BAG with new rate updates gross amount correctly."""
        mock_get_user.return_value = DummyUser(1, "ADMIN")

        fake_sale = MagicMock()
        fake_sale.id = 55
        fake_sale.farmer_id = 1
        fake_sale.harvest_id = 10
        fake_sale.sale_date = None
        fake_sale.quantity_sold = 20.0
        fake_sale.unit = "KG"
        fake_sale.rate_per_unit = 50.0
        fake_sale.gross_amount = 1000.0
        fake_sale.commission = 0.0
        fake_sale.market_fee = 0.0
        fake_sale.other_deduction = 0.0
        fake_sale.market_name = "Old Market"
        fake_sale.buyer_name = "Old Buyer"
        fake_sale.notes = ""
        fake_sale.created_at = None
        fake_sale.sale_date = None

        fake_harvest = MagicMock()
        fake_harvest.id = 10
        fake_harvest.farmer_id = 1

        def _mock_session_get(model, pk):
            if "Harvest" in str(model):
                return fake_harvest
            return fake_sale

        with patch.object(_db.session, "get", side_effect=_mock_session_get):
            with patch.object(_db.session, "commit"):
                # Switch to 20 BAG @ 1500 = 30000
                res = self.client.put("/api/market-sales/55", json={
                    "unit": "BAG",
                    "ratePerUnit": 1500.0,
                })
                self.assertEqual(res.status_code, 200)
                self.assertEqual(fake_sale.unit, "BAG")
                self.assertEqual(fake_sale.rate_per_unit, 1500.0)
                self.assertEqual(fake_sale.gross_amount, 30000.0)

    @patch("backend.routes.market_sale_routes.get_current_user")
    def test_11_update_sale_invalid_unit_rejected(self, mock_get_user):
        """Updating with an invalid unit returns 400 error."""
        mock_get_user.return_value = DummyUser(1, "ADMIN")

        fake_sale = MagicMock()
        fake_sale.id = 55
        fake_sale.farmer_id = 1
        fake_sale.harvest_id = 10

        fake_harvest = MagicMock()
        fake_harvest.id = 10
        fake_harvest.farmer_id = 1

        def _mock_session_get(model, pk):
            if "Harvest" in str(model):
                return fake_harvest
            return fake_sale

        with patch.object(_db.session, "get", side_effect=_mock_session_get):
            res = self.client.put("/api/market-sales/55", json={"unit": "INVALID_UNIT"})
            self.assertEqual(res.status_code, 400)
            self.assertIn("unsupported sale unit", res.get_json()["message"].lower())

    # -------------------------------------------------------------------------
    # Authorization Tests
    # -------------------------------------------------------------------------
    def test_12_unauthenticated_request_rejected(self):
        """Unauthenticated requests return 401."""
        res = self.client.post("/api/market-sales", json={})
        self.assertEqual(res.status_code, 401)

    @patch("backend.routes.market_sale_routes.get_current_user")
    def test_13_farmer_cannot_create_for_another_farmer(self, mock_get_user):
        """Farmer cannot create sales for a different farmer."""
        mock_get_user.return_value = DummyUser(2, "FARMER", farmer_id=1)
        # Attempting for farmer 2
        res = self.client.post("/api/market-sales", json={
            "farmerId": 2,
            "harvestId": 10,
            "saleDate": "2026-10-15",
            "quantitySold": 10,
            "unit": "BAG",
            "ratePerUnit": 100,
        })
        # Farmer ID is overridden to user's farmer_id (1), but harvest check validates ownership
        fake_harvest = MagicMock(id=10, farmer_id=2)  # harvest belongs to farmer 2, not farmer 1
        with patch.object(_db.session, "get", return_value=fake_harvest):
            res = self.client.post("/api/market-sales", json={
                "farmerId": 2,
                "harvestId": 10,
                "saleDate": "2026-10-15",
                "quantitySold": 10,
                "unit": "BAG",
                "ratePerUnit": 100,
            })
            self.assertEqual(res.status_code, 403)

    # -------------------------------------------------------------------------
    # Legacy Record Safety and Review Flag
    # -------------------------------------------------------------------------
    def test_14_legacy_record_without_unit_flagged_for_review(self):
        """Records with missing or legacy units have unitNeedsReview=True in dict."""
        legacy_sale = MagicMock()
        legacy_sale.id = 999
        legacy_sale.farmer_id = 1
        legacy_sale.harvest_id = 1
        legacy_sale.sale_date = None
        legacy_sale.market_name = "Old"
        legacy_sale.buyer_name = "Old"
        legacy_sale.quantity_sold = 100
        legacy_sale.unit = None  # missing unit
        legacy_sale.rate_per_unit = 50
        legacy_sale.gross_amount = 5000
        legacy_sale.commission = 0
        legacy_sale.market_fee = 0
        legacy_sale.other_deduction = 0
        legacy_sale.notes = None
        legacy_sale.created_at = None

        d = market_sale_to_dict(legacy_sale)
        self.assertIsNone(d["unit"])
        self.assertTrue(d["unitNeedsReview"])

    def test_15_standard_bag_and_kg_not_flagged(self):
        """Records with BAG or KG have unitNeedsReview=False."""
        for u in ("BAG", "KG", "QUINTAL", "TON"):
            sale = MagicMock()
            sale.id = 1
            sale.farmer_id = 1
            sale.harvest_id = 1
            sale.sale_date = None
            sale.market_name = ""
            sale.buyer_name = ""
            sale.quantity_sold = 100
            sale.unit = u
            sale.rate_per_unit = 70
            sale.gross_amount = 7000
            sale.commission = 0
            sale.market_fee = 0
            sale.other_deduction = 0
            sale.notes = None
            sale.created_at = None

            d = market_sale_to_dict(sale)
            self.assertEqual(d["unit"], u)
            self.assertFalse(d["unitNeedsReview"])


if __name__ == "__main__":
    unittest.main()
