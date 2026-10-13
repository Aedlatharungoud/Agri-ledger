"""
AgriLedger AI — Transport Accounting & Settlement Deduplication Tests
======================================================================
Tests:
1. Transport recorded in both tables is counted once (canonical transport_records).
2. Non-transport deductions remain counted in full.
3. Multiple legitimate transport records are summed correctly.
4. Missing transport records do not create an invented charge, and legacy deductions are preserved.
5. Repeated settlement generation does not duplicate deductions (returns 409).
6. Helper is_transport_deduction accurately classifies transport keywords.
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

# Pre-stub MySQL dialect
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

from backend.routes.settlement_routes import (
    settlement_bp,
    is_transport_deduction,
    calculate_final_amount,
)


def build_test_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    _db.init_app(app)
    app.register_blueprint(settlement_bp)
    return app


class DummyUser:
    def __init__(self, user_id=1, role="ADMIN", farmer_id=None):
        self.id = user_id
        self.role = role
        self.farmer_id = farmer_id


class TestTransportAccounting(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = build_test_app()
        cls.client = cls.app.test_client()

    def test_01_is_transport_deduction_keyword_matching(self):
        """is_transport_deduction matches transport-related strings and rejects others."""
        self.assertTrue(is_transport_deduction("TRUCK TRANSPORT"))
        self.assertTrue(is_transport_deduction("transport"))
        self.assertTrue(is_transport_deduction("Freight charge"))
        self.assertTrue(is_transport_deduction("Lorry hire"))
        self.assertTrue(is_transport_deduction("Transportation fee"))

        self.assertFalse(is_transport_deduction("WEIGHING"))
        self.assertFalse(is_transport_deduction("MARKET COMMISSION"))
        self.assertFalse(is_transport_deduction("MOISTURE QUALITY"))
        self.assertFalse(is_transport_deduction("OTHER MARKET CHARGES"))
        self.assertFalse(is_transport_deduction(""))
        self.assertFalse(is_transport_deduction(None))

    def test_02_transport_in_both_tables_counted_once(self):
        """When transport is in transport_records AND sale_deductions, it is counted once."""
        farmer_id = 1
        season_id = 1

        # Mock Harvest
        fake_harvest = MagicMock()
        fake_harvest.id = 101

        # Mock MarketSale
        fake_sale = MagicMock()
        fake_sale.id = 201
        fake_sale.gross_amount = 70000.0

        # Mock TransportRecord (canonical ₹1500)
        fake_transport = MagicMock()
        fake_transport.freight_amount = 1500.0
        fake_transport.loading_charges = 0.0
        fake_transport.unloading_charges = 0.0

        # Mock SaleDeductions: ₹1500 Truck Transport + ₹200 Weighing + ₹700 Commission = ₹2400 total
        d1 = MagicMock(deduction_type="TRUCK TRANSPORT", amount=1500.0)
        d2 = MagicMock(deduction_type="WEIGHING", amount=200.0)
        d3 = MagicMock(deduction_type="MARKET COMMISSION", amount=700.0)

        # Build mocks
        mock_admin = DummyUser(1, "ADMIN")

        def _make_query_mock(items):
            m = MagicMock()
            m.query.filter_by.return_value.all.return_value = items
            m.query.filter.return_value.all.return_value = items
            m.query.get.return_value = MagicMock()
            return m

        extra = {
            "backend.models.farmer": MagicMock(Farmer=MagicMock(query=MagicMock(get=lambda x: MagicMock()))),
            "backend.models.crop_season": MagicMock(CropSeason=MagicMock(query=MagicMock(get=lambda x: MagicMock(field_id=1)))),
            "backend.models.field": MagicMock(Field=MagicMock(query=MagicMock(get=lambda x: MagicMock(farmer_id=1)))),
            "backend.models.harvest": MagicMock(Harvest=_make_query_mock([fake_harvest])),
            "backend.models.market_sale": MagicMock(MarketSale=_make_query_mock([fake_sale])),
            "backend.models.transport_record": MagicMock(TransportRecord=_make_query_mock([fake_transport])),
            "backend.models.sale_deduction": MagicMock(SaleDeduction=_make_query_mock([d1, d2, d3])),
            "backend.models.input_purchase": MagicMock(InputPurchase=_make_query_mock([])),
            "backend.models.labour_expense": MagicMock(LabourExpense=_make_query_mock([])),
            "backend.models.interest_charge": MagicMock(InterestCharge=_make_query_mock([])),
            "backend.models.farmer_payment": MagicMock(FarmerPayment=_make_query_mock([])),
        }

        with patch("backend.routes.settlement_routes.get_current_user", return_value=mock_admin), \
             patch("backend.routes.settlement_routes.Settlement") as mock_settlement_cls, \
             patch.dict("sys.modules", extra):

            mock_settlement_cls.query.filter_by.return_value.first.return_value = None

            res = self.client.get(f"/api/settlements/calculate/{farmer_id}/{season_id}")
            self.assertEqual(res.status_code, 200)
            data = res.get_json()

            # Canonical transport should be ₹1500
            self.assertEqual(data["totalTransport"], 1500.0)
            # Non-transport deductions should be ₹200 + ₹700 = ₹900 (TRUCK TRANSPORT deduplicated)
            self.assertEqual(data["totalDeductions"], 900.0)
            # Total deducted = 1500 + 900 = 2400 (not 1500 + 2400 = 3900)
            self.assertEqual(data["totalCropSales"], 70000.0)
            self.assertEqual(data["finalAmount"], 70000.0 - 1500.0 - 900.0)

    def test_03_non_transport_deduction_remains_counted(self):
        """Non-transport deductions remain fully counted when transport records are present."""
        fake_harvest = MagicMock(id=101)
        fake_sale = MagicMock(id=201, gross_amount=50000.0)
        fake_transport = MagicMock(freight_amount=1000.0, loading_charges=200.0, unloading_charges=100.0)

        # Only non-transport deductions
        d1 = MagicMock(deduction_type="WEIGHING", amount=150.0)
        d2 = MagicMock(deduction_type="MARKET COMMISSION", amount=500.0)

        def _make_query_mock(items):
            m = MagicMock()
            m.query.filter_by.return_value.all.return_value = items
            m.query.filter.return_value.all.return_value = items
            return m

        extra = {
            "backend.models.farmer": MagicMock(Farmer=MagicMock(query=MagicMock(get=lambda x: MagicMock()))),
            "backend.models.crop_season": MagicMock(CropSeason=MagicMock(query=MagicMock(get=lambda x: MagicMock(field_id=1)))),
            "backend.models.field": MagicMock(Field=MagicMock(query=MagicMock(get=lambda x: MagicMock(farmer_id=1)))),
            "backend.models.harvest": MagicMock(Harvest=_make_query_mock([fake_harvest])),
            "backend.models.market_sale": MagicMock(MarketSale=_make_query_mock([fake_sale])),
            "backend.models.transport_record": MagicMock(TransportRecord=_make_query_mock([fake_transport])),
            "backend.models.sale_deduction": MagicMock(SaleDeduction=_make_query_mock([d1, d2])),
            "backend.models.input_purchase": MagicMock(InputPurchase=_make_query_mock([])),
            "backend.models.labour_expense": MagicMock(LabourExpense=_make_query_mock([])),
            "backend.models.interest_charge": MagicMock(InterestCharge=_make_query_mock([])),
            "backend.models.farmer_payment": MagicMock(FarmerPayment=_make_query_mock([])),
        }

        with patch("backend.routes.settlement_routes.get_current_user", return_value=DummyUser(1, "ADMIN")), \
             patch("backend.routes.settlement_routes.Settlement") as mock_settlement_cls, \
             patch.dict("sys.modules", extra):

            mock_settlement_cls.query.filter_by.return_value.first.return_value = None

            res = self.client.get("/api/settlements/calculate/1/1")
            self.assertEqual(res.status_code, 200)
            data = res.get_json()

            self.assertEqual(data["totalTransport"], 1300.0)
            self.assertEqual(data["totalDeductions"], 650.0)
            self.assertEqual(data["finalAmount"], 50000.0 - 1300.0 - 650.0)

    def test_04_multiple_transport_records_handled_correctly(self):
        """Multiple legitimate transport records are summed accurately."""
        fake_harvest = MagicMock(id=101)
        fake_sale = MagicMock(id=201, gross_amount=60000.0)

        t1 = MagicMock(freight_amount=800.0, loading_charges=100.0, unloading_charges=50.0)  # 950
        t2 = MagicMock(freight_amount=600.0, loading_charges=50.0, unloading_charges=0.0)    # 650

        def _make_query_mock(items):
            m = MagicMock()
            m.query.filter_by.return_value.all.return_value = items
            m.query.filter.return_value.all.return_value = items
            return m

        extra = {
            "backend.models.farmer": MagicMock(Farmer=MagicMock(query=MagicMock(get=lambda x: MagicMock()))),
            "backend.models.crop_season": MagicMock(CropSeason=MagicMock(query=MagicMock(get=lambda x: MagicMock(field_id=1)))),
            "backend.models.field": MagicMock(Field=MagicMock(query=MagicMock(get=lambda x: MagicMock(farmer_id=1)))),
            "backend.models.harvest": MagicMock(Harvest=_make_query_mock([fake_harvest])),
            "backend.models.market_sale": MagicMock(MarketSale=_make_query_mock([fake_sale])),
            "backend.models.transport_record": MagicMock(TransportRecord=_make_query_mock([t1, t2])),
            "backend.models.sale_deduction": MagicMock(SaleDeduction=_make_query_mock([])),
            "backend.models.input_purchase": MagicMock(InputPurchase=_make_query_mock([])),
            "backend.models.labour_expense": MagicMock(LabourExpense=_make_query_mock([])),
            "backend.models.interest_charge": MagicMock(InterestCharge=_make_query_mock([])),
            "backend.models.farmer_payment": MagicMock(FarmerPayment=_make_query_mock([])),
        }

        with patch("backend.routes.settlement_routes.get_current_user", return_value=DummyUser(1, "ADMIN")), \
             patch("backend.routes.settlement_routes.Settlement") as mock_settlement_cls, \
             patch.dict("sys.modules", extra):

            mock_settlement_cls.query.filter_by.return_value.first.return_value = None

            res = self.client.get("/api/settlements/calculate/1/1")
            self.assertEqual(res.status_code, 200)
            data = res.get_json()

            self.assertEqual(data["totalTransport"], 1600.0)

    def test_05_missing_transport_records_does_not_invent_charge(self):
        """When no transport records exist, no invented transport charge is created; legacy deduction preserved."""
        fake_harvest = MagicMock(id=101)
        fake_sale = MagicMock(id=201, gross_amount=40000.0)

        # Legacy transport deduction present in sale_deductions but no TransportRecord
        d_legacy = MagicMock(deduction_type="TRUCK TRANSPORT", amount=1200.0)
        d_weigh = MagicMock(deduction_type="WEIGHING", amount=100.0)

        def _make_query_mock(items):
            m = MagicMock()
            m.query.filter_by.return_value.all.return_value = items
            m.query.filter.return_value.all.return_value = items
            return m

        extra = {
            "backend.models.farmer": MagicMock(Farmer=MagicMock(query=MagicMock(get=lambda x: MagicMock()))),
            "backend.models.crop_season": MagicMock(CropSeason=MagicMock(query=MagicMock(get=lambda x: MagicMock(field_id=1)))),
            "backend.models.field": MagicMock(Field=MagicMock(query=MagicMock(get=lambda x: MagicMock(farmer_id=1)))),
            "backend.models.harvest": MagicMock(Harvest=_make_query_mock([fake_harvest])),
            "backend.models.market_sale": MagicMock(MarketSale=_make_query_mock([fake_sale])),
            "backend.models.transport_record": MagicMock(TransportRecord=_make_query_mock([])),  # No records
            "backend.models.sale_deduction": MagicMock(SaleDeduction=_make_query_mock([d_legacy, d_weigh])),
            "backend.models.input_purchase": MagicMock(InputPurchase=_make_query_mock([])),
            "backend.models.labour_expense": MagicMock(LabourExpense=_make_query_mock([])),
            "backend.models.interest_charge": MagicMock(InterestCharge=_make_query_mock([])),
            "backend.models.farmer_payment": MagicMock(FarmerPayment=_make_query_mock([])),
        }

        with patch("backend.routes.settlement_routes.get_current_user", return_value=DummyUser(1, "ADMIN")), \
             patch("backend.routes.settlement_routes.Settlement") as mock_settlement_cls, \
             patch.dict("sys.modules", extra):

            mock_settlement_cls.query.filter_by.return_value.first.return_value = None

            res = self.client.get("/api/settlements/calculate/1/1")
            self.assertEqual(res.status_code, 200)
            data = res.get_json()

            # No transport records -> totalTransport = 0.0 (no invented charge)
            self.assertEqual(data["totalTransport"], 0.0)
            # Legacy deduction preserved in totalDeductions
            self.assertEqual(data["totalDeductions"], 1300.0)
            self.assertEqual(data["finalAmount"], 40000.0 - 1300.0)

    def test_06_repeated_settlement_generation_blocked(self):
        """Generating settlement when one already exists returns 409 Conflict."""
        mock_existing = MagicMock()
        mock_existing.id = 501
        mock_existing.farmer_id = 1
        mock_existing.crop_season_id = 1
        mock_existing.settlement_date = None
        mock_existing.total_crop_sales = 70000.0
        mock_existing.total_input_credit = 0.0
        mock_existing.total_labour_credit = 0.0
        mock_existing.total_transport = 1500.0
        mock_existing.total_deductions = 1700.0
        mock_existing.total_interest = 0.0
        mock_existing.total_payments = 0.0
        mock_existing.final_amount = 66800.0
        mock_existing.settlement_status = "SETTLED"
        mock_existing.notes = "Existing"
        mock_existing.created_at = None

        extra = {
            "backend.models.farmer": MagicMock(Farmer=MagicMock(query=MagicMock(get=lambda x: MagicMock()))),
            "backend.models.crop_season": MagicMock(CropSeason=MagicMock(query=MagicMock(get=lambda x: MagicMock(field_id=1)))),
            "backend.models.field": MagicMock(Field=MagicMock(query=MagicMock(get=lambda x: MagicMock(farmer_id=1)))),
        }

        with patch("backend.routes.settlement_routes.get_current_user", return_value=DummyUser(1, "ADMIN")), \
             patch("backend.routes.settlement_routes.Settlement") as mock_settlement_cls, \
             patch.dict("sys.modules", extra):

            mock_settlement_cls.query.filter_by.return_value.first.return_value = mock_existing

            res = self.client.post("/api/settlements/generate/1/1")
            self.assertEqual(res.status_code, 409)
            self.assertIn("already exists", res.get_json()["message"].lower())


if __name__ == "__main__":
    unittest.main()
