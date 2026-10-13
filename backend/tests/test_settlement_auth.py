"""
AgriLedger AI — Settlement Authorization Tests
================================================
Uses unittest.mock to patch get_current_user and all Settlement
/ related model queries. The live database is NEVER accessed.

Run from the project root:
    python backend/tests/test_settlement_auth.py
  or
    python -m pytest backend/tests/test_settlement_auth.py -v
"""

import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import date, datetime

# ---------------------------------------------------------------------------
# 1. Project root on sys.path first.
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# ---------------------------------------------------------------------------
# 2. Stub MySQL / SQLAlchemy MySQL dialect before ANY backend import.
#    MagicMock satisfies any attribute access (BIGINT, etc.) automatically.
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# 3. Pre-stub User model so auth_utils.py can import without a DB.
# ---------------------------------------------------------------------------
_user_mod = MagicMock()
_user_mod.User = MagicMock()
sys.modules["backend.models.user"] = _user_mod

# ---------------------------------------------------------------------------
# 4. Import Flask and project modules (safe after stubs above).
# ---------------------------------------------------------------------------
from flask import Flask
from backend.extensions import db as _db  # noqa: E402

# Prevent any real DB connection during test bootstrap.
_db.create_all = lambda: None

from backend.routes.settlement_routes import settlement_bp  # noqa: E402


# ---------------------------------------------------------------------------
# 5. Test app factory.
# ---------------------------------------------------------------------------
def build_test_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret-key"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    _db.init_app(app)
    app.register_blueprint(settlement_bp)
    return app


# ---------------------------------------------------------------------------
# 6. Fixture helpers.
# ---------------------------------------------------------------------------

def _make_admin():
    u = MagicMock()
    u.id = 1
    u.role = "ADMIN"
    u.farmer_id = None
    u.is_active = True
    return u


def _make_farmer(farmer_id: int):
    u = MagicMock()
    u.id = 100 + farmer_id
    u.role = "FARMER"
    u.farmer_id = farmer_id
    u.is_active = True
    return u


def _make_settlement(sid: int, farmer_id: int):
    s = MagicMock()
    s.id = sid
    s.farmer_id = farmer_id
    s.crop_season_id = 1
    s.settlement_date = date(2024, 10, 1)
    s.total_crop_sales = 100_000
    s.total_input_credit = 20_000
    s.total_labour_credit = 10_000
    s.total_transport = 5_000
    s.total_deductions = 3_000
    s.total_interest = 4_000
    s.total_payments = 10_000
    s.final_amount = 58_000
    s.settlement_status = "PENDING"
    s.notes = "Test"
    s.created_at = datetime(2024, 10, 1)
    return s


# ---------------------------------------------------------------------------
# 7. Test cases.
# ---------------------------------------------------------------------------

class TestSettlementAuth(unittest.TestCase):

    def setUp(self):
        self.app = build_test_app()
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    # -------------------------------------------------------------------
    # Tests 1–7: Unauthenticated requests receive 401
    # -------------------------------------------------------------------

    def _assert_401(self, method, url, **kwargs):
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=None,
        ):
            resp = getattr(self.client, method)(url, **kwargs)
        self.assertEqual(
            resp.status_code, 401,
            f"Expected 401 for unauthenticated {method.upper()} {url}, "
            f"got {resp.status_code}",
        )

    def test_01_unauthenticated_get_all_returns_401(self):
        self._assert_401("get", "/api/settlements")
        print("PASS  test_01_unauthenticated_get_all_returns_401")

    def test_02_unauthenticated_get_single_returns_401(self):
        self._assert_401("get", "/api/settlements/1")
        print("PASS  test_02_unauthenticated_get_single_returns_401")

    def test_03_unauthenticated_post_returns_401(self):
        self._assert_401(
            "post", "/api/settlements",
            json={"farmerId": 1, "settlementDate": "2024-10-01"},
        )
        print("PASS  test_03_unauthenticated_post_returns_401")

    def test_04_unauthenticated_put_returns_401(self):
        self._assert_401("put", "/api/settlements/1", json={"notes": "x"})
        print("PASS  test_04_unauthenticated_put_returns_401")

    def test_05_unauthenticated_delete_returns_401(self):
        self._assert_401("delete", "/api/settlements/1")
        print("PASS  test_05_unauthenticated_delete_returns_401")

    def test_06_unauthenticated_calculate_returns_401(self):
        self._assert_401("get", "/api/settlements/calculate/1/1")
        print("PASS  test_06_unauthenticated_calculate_returns_401")

    def test_07_unauthenticated_generate_returns_401(self):
        self._assert_401("post", "/api/settlements/generate/1/1")
        print("PASS  test_07_unauthenticated_generate_returns_401")

    # -------------------------------------------------------------------
    # Test 8: ADMIN lists all settlements
    # -------------------------------------------------------------------

    def test_08_admin_can_list_all_settlements(self):
        """ADMIN GET /api/settlements → 200 with all records."""
        settlements = [
            _make_settlement(1, farmer_id=10),
            _make_settlement(2, farmer_id=20),
        ]
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=_make_admin(),
        ), patch(
            "backend.routes.settlement_routes.Settlement"
        ) as M:
            M.query.all.return_value = settlements
            resp = self.client.get("/api/settlements")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.get_json()), 2)
        print("PASS  test_08_admin_can_list_all_settlements")

    # -------------------------------------------------------------------
    # Test 9: FARMER gets only own settlements (not all)
    # -------------------------------------------------------------------

    def test_09_farmer_gets_only_own_settlements(self):
        """FARMER GET /api/settlements → 200, filtered to own farmer_id."""
        own = _make_settlement(1, farmer_id=10)
        farmer = _make_farmer(10)
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=farmer,
        ), patch(
            "backend.routes.settlement_routes.Settlement"
        ) as M:
            fb = MagicMock()
            fb.all.return_value = [own]
            M.query.filter_by.return_value = fb

            resp = self.client.get("/api/settlements")

        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["farmerId"], 10)
        M.query.filter_by.assert_called_once_with(farmer_id=10)
        print("PASS  test_09_farmer_gets_only_own_settlements")

    # -------------------------------------------------------------------
    # Test 10: FARMER cannot access another farmer's settlement by ID
    # -------------------------------------------------------------------

    def test_10_farmer_cannot_access_other_farmer_settlement(self):
        """FARMER GET /api/settlements/<id> for another farmer → 403."""
        other = _make_settlement(99, farmer_id=20)
        farmer = _make_farmer(10)
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=farmer,
        ), patch(
            "backend.routes.settlement_routes.Settlement"
        ) as M:
            M.query.get.return_value = other
            resp = self.client.get("/api/settlements/99")

        self.assertEqual(resp.status_code, 403)
        print("PASS  test_10_farmer_cannot_access_other_farmer_settlement")

    # -------------------------------------------------------------------
    # Test 11: FARMER can access their own settlement by ID
    # -------------------------------------------------------------------

    def test_11_farmer_can_access_own_settlement(self):
        """FARMER GET /api/settlements/<id> for own record → 200."""
        own = _make_settlement(1, farmer_id=10)
        farmer = _make_farmer(10)
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=farmer,
        ), patch(
            "backend.routes.settlement_routes.Settlement"
        ) as M:
            M.query.get.return_value = own
            resp = self.client.get("/api/settlements/1")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["farmerId"], 10)
        print("PASS  test_11_farmer_can_access_own_settlement")

    # -------------------------------------------------------------------
    # Test 12: FARMER cannot create a settlement
    # -------------------------------------------------------------------

    def test_12_farmer_cannot_create_settlement(self):
        """FARMER POST /api/settlements → 403."""
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=_make_farmer(10),
        ):
            resp = self.client.post(
                "/api/settlements",
                json={"farmerId": 10, "settlementDate": "2024-10-01"},
            )
        self.assertEqual(resp.status_code, 403)
        print("PASS  test_12_farmer_cannot_create_settlement")

    # -------------------------------------------------------------------
    # Test 13: FARMER cannot update a settlement
    # -------------------------------------------------------------------

    def test_13_farmer_cannot_update_settlement(self):
        """FARMER PUT /api/settlements/<id> → 403."""
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=_make_farmer(10),
        ):
            resp = self.client.put(
                "/api/settlements/1", json={"notes": "tamper"}
            )
        self.assertEqual(resp.status_code, 403)
        print("PASS  test_13_farmer_cannot_update_settlement")

    # -------------------------------------------------------------------
    # Test 14: FARMER cannot delete a settlement
    # -------------------------------------------------------------------

    def test_14_farmer_cannot_delete_settlement(self):
        """FARMER DELETE /api/settlements/<id> → 403."""
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=_make_farmer(10),
        ):
            resp = self.client.delete("/api/settlements/1")
        self.assertEqual(resp.status_code, 403)
        print("PASS  test_14_farmer_cannot_delete_settlement")

    # -------------------------------------------------------------------
    # Test 15: FARMER cannot generate a settlement
    # -------------------------------------------------------------------

    def test_15_farmer_cannot_generate_settlement(self):
        """FARMER POST /api/settlements/generate/<id>/<id> → 403."""
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=_make_farmer(10),
        ):
            resp = self.client.post("/api/settlements/generate/10/1")
        self.assertEqual(resp.status_code, 403)
        print("PASS  test_15_farmer_cannot_generate_settlement")

    # -------------------------------------------------------------------
    # Test 16: FARMER cannot calculate for another farmer's ID
    # -------------------------------------------------------------------

    def test_16_farmer_cannot_calculate_for_other_farmer(self):
        """FARMER GET /api/settlements/calculate/<other_id>/<season> → 403."""
        farmer = _make_farmer(10)  # farmer_id=10
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=farmer,
        ):
            # URL uses farmer_id=20 — different from session farmer_id=10
            resp = self.client.get("/api/settlements/calculate/20/1")
        self.assertEqual(resp.status_code, 403)
        print("PASS  test_16_farmer_cannot_calculate_for_other_farmer")

    # -------------------------------------------------------------------
    # Test 17: FARMER can calculate for their own farmer_id
    # -------------------------------------------------------------------

    def test_17_farmer_can_calculate_own_settlement(self):
        """FARMER GET /api/settlements/calculate/<own_id>/<season> → 200."""
        farmer = _make_farmer(10)

        # A universal empty mock for all query chains.
        empty = MagicMock()
        empty.all.return_value = []
        empty.first.return_value = None
        empty.filter.return_value = empty
        empty.filter_by.return_value = empty

        # Build model mocks with proper query attributes.
        def _model_mock():
            m = MagicMock()
            m.query = empty
            return m

        extra_models = {
            "backend.models.market_sale":
                MagicMock(MarketSale=_model_mock()),
            "backend.models.input_purchase":
                MagicMock(InputPurchase=_model_mock()),
            "backend.models.labour_expense":
                MagicMock(LabourExpense=_model_mock()),
            "backend.models.sale_deduction":
                MagicMock(SaleDeduction=_model_mock()),
            "backend.models.transport_record":
                MagicMock(TransportRecord=_model_mock()),
            "backend.models.interest_charge":
                MagicMock(InterestCharge=_model_mock()),
            "backend.models.farmer_payment":
                MagicMock(FarmerPayment=_model_mock()),
            "backend.models.harvest":
                MagicMock(Harvest=_model_mock()),
        }

        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=farmer,
        ), patch(
            "backend.routes.settlement_routes.Settlement"
        ) as MockSettlement, patch.dict("sys.modules", extra_models):
            MockSettlement.query.filter_by.return_value = empty
            resp = self.client.get("/api/settlements/calculate/10/1")

        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn("finalAmount", data)
        self.assertEqual(data["status"], "CALCULATED")
        print("PASS  test_17_farmer_can_calculate_own_settlement")

    # -------------------------------------------------------------------
    # Test 18: ADMIN can access any settlement by ID
    # -------------------------------------------------------------------

    def test_18_admin_can_access_any_settlement(self):
        """ADMIN GET /api/settlements/<id> → 200 regardless of farmer_id."""
        settlement = _make_settlement(5, farmer_id=99)
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=_make_admin(),
        ), patch(
            "backend.routes.settlement_routes.Settlement"
        ) as M:
            M.query.get.return_value = settlement
            resp = self.client.get("/api/settlements/5")

        self.assertEqual(resp.status_code, 200)
        print("PASS  test_18_admin_can_access_any_settlement")

    # -------------------------------------------------------------------
    # Test 19: Nonexistent settlement returns 404
    # -------------------------------------------------------------------

    def test_19_get_nonexistent_settlement_returns_404(self):
        """GET /api/settlements/<missing_id> → 404."""
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=_make_admin(),
        ), patch(
            "backend.routes.settlement_routes.Settlement"
        ) as M:
            M.query.get.return_value = None
            resp = self.client.get("/api/settlements/9999")

        self.assertEqual(resp.status_code, 404)
        print("PASS  test_19_get_nonexistent_settlement_returns_404")

    # -------------------------------------------------------------------
    # Test 20: calculate_final_amount formula is unchanged
    # -------------------------------------------------------------------

    def test_20_calculate_final_amount_formula_unchanged(self):
        """
        The settlement formula must be:
          final = sales - input_credit - labour_credit - transport
                  - deductions - interest
        """
        from backend.routes.settlement_routes import calculate_final_amount

        result = calculate_final_amount(
            total_crop_sales=100_000,
            total_input_credit=20_000,
            total_labour_credit=10_000,
            total_transport=5_000,
            total_deductions=3_000,
            total_interest=4_000,
        )
        expected = round(
            100_000 - 20_000 - 10_000 - 5_000 - 3_000 - 4_000, 2
        )
        self.assertAlmostEqual(result, expected, places=2)
        print(
            f"PASS  test_20_calculate_final_amount_formula_unchanged"
            f"  ({result} == {expected})"
        )

    # -------------------------------------------------------------------
    # Test 21: ADMIN POST body validation still works (reaches biz logic)
    # -------------------------------------------------------------------

    def test_21_admin_post_missing_body_returns_400(self):
        """ADMIN POST /api/settlements with no body → 400 (not 403/401)."""
        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=_make_admin(),
        ):
            resp = self.client.post(
                "/api/settlements",
                data="",
                content_type="application/json",
            )
        # Auth passes; missing body triggers 400.
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_21_admin_post_missing_body_returns_400")

    # -------------------------------------------------------------------
    # Test 22: ADMIN DELETE auth passes, reaches business logic
    # -------------------------------------------------------------------

    def test_22_admin_delete_auth_passes(self):
        """ADMIN DELETE auth guard must not block (status ≠ 401 / 403)."""
        settlement = _make_settlement(1, farmer_id=10)
        mock_session = MagicMock()
        mock_session.delete = MagicMock()
        mock_session.commit = MagicMock()

        with patch(
            "backend.routes.settlement_routes.get_current_user",
            return_value=_make_admin(),
        ), patch(
            "backend.routes.settlement_routes.Settlement"
        ) as M, patch(
            "backend.routes.settlement_routes.db"
        ) as mock_db:
            M.query.get.return_value = settlement
            mock_db.session = mock_session
            resp = self.client.delete("/api/settlements/1")

        self.assertNotIn(resp.status_code, [401, 403])
        print(
            f"PASS  test_22_admin_delete_auth_passes"
            f"  (status={resp.status_code})"
        )


# ---------------------------------------------------------------------------
# Entry point.
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestSettlementAuth)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
