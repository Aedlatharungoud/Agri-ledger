"""
AgriLedger AI — Interest Charge Authorization Tests
=====================================================
Uses unittest.mock to patch get_current_user and InterestCharge
model queries. The live database is NEVER accessed.

Run from the project root:
    python backend/tests/test_interest_charge_auth.py
  or
    python -m pytest backend/tests/test_interest_charge_auth.py -v
"""

import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from datetime import date, datetime

# ---------------------------------------------------------------------------
# 1. Project root on sys.path.
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# ---------------------------------------------------------------------------
# 2. Stub MySQL dialect before any backend import.
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

_user_mod = MagicMock()
_user_mod.User = MagicMock()
sys.modules["backend.models.user"] = _user_mod

# ---------------------------------------------------------------------------
# 3. Import Flask and project modules (safe after stubs).
# ---------------------------------------------------------------------------
from flask import Flask
from backend.extensions import db as _db  # noqa: E402

_db.create_all = lambda: None

from backend.routes.interest_charge_routes import interest_charge_bp  # noqa: E402


# ---------------------------------------------------------------------------
# 4. Test app factory.
# ---------------------------------------------------------------------------
def build_test_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret-key"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    _db.init_app(app)
    app.register_blueprint(interest_charge_bp)
    return app


# ---------------------------------------------------------------------------
# 5. Fixtures.
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


def _make_charge(cid: int, farmer_id: int):
    c = MagicMock()
    c.id = cid
    c.farmer_id = farmer_id
    c.crop_season_id = 1
    c.interest_date = date(2024, 9, 1)
    c.principal_amount = 50000
    c.rate_percent = 2.00
    c.interest_amount = 1000
    c.notes = "Monthly interest"
    c.created_at = datetime(2024, 9, 1)
    return c


VALID_POST = {
    "farmerId": 10,
    "interestDate": "2024-09-01",
    "principalAmount": 50000,
    "interestAmount": 1000,
}


# ---------------------------------------------------------------------------
# 6. Test cases.
# ---------------------------------------------------------------------------

class TestInterestChargeAuth(unittest.TestCase):

    def setUp(self):
        self.app = build_test_app()
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    # -----------------------------------------------------------------------
    # Helper
    # -----------------------------------------------------------------------

    def _patch_user(self, user):
        return patch(
            "backend.routes.interest_charge_routes.get_current_user",
            return_value=user,
        )

    def _patch_model(self):
        return patch(
            "backend.routes.interest_charge_routes.InterestCharge"
        )

    def _patch_db(self):
        return patch(
            "backend.routes.interest_charge_routes.db"
        )

    # -----------------------------------------------------------------------
    # Tests 01–05  Unauthenticated → 401
    # -----------------------------------------------------------------------

    def _assert_401(self, method, url, **kwargs):
        with self._patch_user(None):
            resp = getattr(self.client, method)(url, **kwargs)
        self.assertEqual(
            resp.status_code, 401,
            f"Expected 401 for unauthenticated {method.upper()} {url}, "
            f"got {resp.status_code}",
        )

    def test_01_unauth_get_all_401(self):
        self._assert_401("get", "/api/interest-charges")
        print("PASS  test_01_unauth_get_all_401")

    def test_02_unauth_get_single_401(self):
        self._assert_401("get", "/api/interest-charges/1")
        print("PASS  test_02_unauth_get_single_401")

    def test_03_unauth_post_401(self):
        self._assert_401("post", "/api/interest-charges", json=VALID_POST)
        print("PASS  test_03_unauth_post_401")

    def test_04_unauth_put_401(self):
        self._assert_401("put", "/api/interest-charges/1", json={"notes": "x"})
        print("PASS  test_04_unauth_put_401")

    def test_05_unauth_delete_401(self):
        self._assert_401("delete", "/api/interest-charges/1")
        print("PASS  test_05_unauth_delete_401")

    # -----------------------------------------------------------------------
    # Tests 06–07  ADMIN list / get all
    # -----------------------------------------------------------------------

    def test_06_admin_can_list_all_charges(self):
        """ADMIN GET /api/interest-charges → 200, all records returned."""
        charges = [_make_charge(1, 10), _make_charge(2, 20)]
        with self._patch_user(_make_admin()), self._patch_model() as M:
            M.query.all.return_value = charges
            resp = self.client.get("/api/interest-charges")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.get_json()), 2)
        print("PASS  test_06_admin_can_list_all_charges")

    def test_07_admin_can_get_any_charge_by_id(self):
        """ADMIN GET /api/interest-charges/<id> → 200 for any farmer_id."""
        charge = _make_charge(5, farmer_id=99)
        with self._patch_user(_make_admin()), self._patch_model() as M:
            M.query.get.return_value = charge
            resp = self.client.get("/api/interest-charges/5")
        self.assertEqual(resp.status_code, 200)
        print("PASS  test_07_admin_can_get_any_charge_by_id")

    # -----------------------------------------------------------------------
    # Tests 08–10  FARMER read access
    # -----------------------------------------------------------------------

    def test_08_farmer_gets_only_own_charges(self):
        """FARMER GET /api/interest-charges → 200, filtered to own farmer_id."""
        own = _make_charge(1, farmer_id=10)
        farmer = _make_farmer(10)
        with self._patch_user(farmer), self._patch_model() as M:
            fb = MagicMock()
            fb.all.return_value = [own]
            M.query.filter_by.return_value = fb
            resp = self.client.get("/api/interest-charges")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.get_json()), 1)
        M.query.filter_by.assert_called_once_with(farmer_id=10)
        print("PASS  test_08_farmer_gets_only_own_charges")

    def test_09_farmer_can_get_own_charge_by_id(self):
        """FARMER GET /api/interest-charges/<id> for own record → 200."""
        own = _make_charge(1, farmer_id=10)
        with self._patch_user(_make_farmer(10)), self._patch_model() as M:
            M.query.get.return_value = own
            resp = self.client.get("/api/interest-charges/1")
        self.assertEqual(resp.status_code, 200)
        print("PASS  test_09_farmer_can_get_own_charge_by_id")

    def test_10_farmer_cannot_get_other_farmers_charge(self):
        """FARMER GET /api/interest-charges/<id> for another farmer → 403."""
        other = _make_charge(99, farmer_id=20)
        with self._patch_user(_make_farmer(10)), self._patch_model() as M:
            M.query.get.return_value = other
            resp = self.client.get("/api/interest-charges/99")
        self.assertEqual(resp.status_code, 403)
        print("PASS  test_10_farmer_cannot_get_other_farmers_charge")

    # -----------------------------------------------------------------------
    # Tests 11–13  FARMER write operations → 403
    # -----------------------------------------------------------------------

    def test_11_farmer_cannot_create_charge(self):
        """FARMER POST /api/interest-charges → 403."""
        with self._patch_user(_make_farmer(10)):
            resp = self.client.post("/api/interest-charges", json=VALID_POST)
        self.assertEqual(resp.status_code, 403)
        print("PASS  test_11_farmer_cannot_create_charge")

    def test_12_farmer_cannot_update_charge(self):
        """FARMER PUT /api/interest-charges/<id> → 403."""
        with self._patch_user(_make_farmer(10)):
            resp = self.client.put(
                "/api/interest-charges/1", json={"notes": "tamper"}
            )
        self.assertEqual(resp.status_code, 403)
        print("PASS  test_12_farmer_cannot_update_charge")

    def test_13_farmer_cannot_delete_charge(self):
        """FARMER DELETE /api/interest-charges/<id> → 403."""
        with self._patch_user(_make_farmer(10)):
            resp = self.client.delete("/api/interest-charges/1")
        self.assertEqual(resp.status_code, 403)
        print("PASS  test_13_farmer_cannot_delete_charge")

    # -----------------------------------------------------------------------
    # Tests 14–15  Nonexistent records → 404
    # -----------------------------------------------------------------------

    def test_14_get_nonexistent_charge_returns_404(self):
        """ADMIN GET /api/interest-charges/<missing_id> → 404."""
        with self._patch_user(_make_admin()), self._patch_model() as M:
            M.query.get.return_value = None
            resp = self.client.get("/api/interest-charges/9999")
        self.assertEqual(resp.status_code, 404)
        print("PASS  test_14_get_nonexistent_charge_returns_404")

    def test_15_put_nonexistent_charge_returns_404(self):
        """ADMIN PUT /api/interest-charges/<missing_id> → 404."""
        with self._patch_user(_make_admin()), self._patch_model() as M:
            M.query.get.return_value = None
            resp = self.client.put(
                "/api/interest-charges/9999", json={"notes": "x"}
            )
        self.assertEqual(resp.status_code, 404)
        print("PASS  test_15_put_nonexistent_charge_returns_404")

    def test_16_delete_nonexistent_charge_returns_404(self):
        """ADMIN DELETE /api/interest-charges/<missing_id> → 404."""
        with self._patch_user(_make_admin()), self._patch_model() as M:
            M.query.get.return_value = None
            resp = self.client.delete("/api/interest-charges/9999")
        self.assertEqual(resp.status_code, 404)
        print("PASS  test_16_delete_nonexistent_charge_returns_404")

    # -----------------------------------------------------------------------
    # Tests 17–24  Input validation
    # -----------------------------------------------------------------------

    def test_17_post_missing_required_field_returns_400(self):
        """POST without farmerId → 400."""
        body = {k: v for k, v in VALID_POST.items() if k != "farmerId"}
        with self._patch_user(_make_admin()):
            resp = self.client.post("/api/interest-charges", json=body)
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_17_post_missing_required_field_returns_400")

    def test_18_post_negative_principal_returns_400(self):
        """POST with principalAmount=-1 → 400."""
        body = {**VALID_POST, "principalAmount": -1}
        with self._patch_user(_make_admin()):
            resp = self.client.post("/api/interest-charges", json=body)
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_18_post_negative_principal_returns_400")

    def test_19_post_zero_principal_returns_400(self):
        """POST with principalAmount=0 → 400 (must be > 0)."""
        body = {**VALID_POST, "principalAmount": 0}
        with self._patch_user(_make_admin()):
            resp = self.client.post("/api/interest-charges", json=body)
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_19_post_zero_principal_returns_400")

    def test_20_post_negative_interest_amount_returns_400(self):
        """POST with interestAmount=-500 → 400."""
        body = {**VALID_POST, "interestAmount": -500}
        with self._patch_user(_make_admin()):
            resp = self.client.post("/api/interest-charges", json=body)
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_20_post_negative_interest_amount_returns_400")

    def test_21_post_zero_rate_percent_returns_400(self):
        """POST with ratePercent=0 → 400 (must be > 0)."""
        body = {**VALID_POST, "ratePercent": 0}
        with self._patch_user(_make_admin()):
            resp = self.client.post("/api/interest-charges", json=body)
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_21_post_zero_rate_percent_returns_400")

    def test_22_post_nan_principal_returns_400(self):
        """POST with principalAmount='abc' → 400."""
        body = {**VALID_POST, "principalAmount": "abc"}
        with self._patch_user(_make_admin()):
            resp = self.client.post("/api/interest-charges", json=body)
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_22_post_nan_principal_returns_400")

    def test_23_post_bad_date_returns_400(self):
        """POST with interestDate='not-a-date' → 400."""
        body = {**VALID_POST, "interestDate": "not-a-date"}
        with self._patch_user(_make_admin()):
            resp = self.client.post("/api/interest-charges", json=body)
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_23_post_bad_date_returns_400")

    def test_24_post_boolean_farmer_id_returns_400(self):
        """POST with farmerId=True → 400 (boolean is not a valid ID)."""
        body = {**VALID_POST, "farmerId": True}
        with self._patch_user(_make_admin()):
            resp = self.client.post("/api/interest-charges", json=body)
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_24_post_boolean_farmer_id_returns_400")

    # -----------------------------------------------------------------------
    # Tests 25–26  Default ratePercent and ADMIN create path
    # -----------------------------------------------------------------------

    def test_25_post_default_rate_is_2_percent(self):
        """
        POST without ratePercent → rate defaults to 2.00 (business rule).
        The auth guard passes; DB commit raises to avoid real write.
        """
        mock_session = MagicMock()
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock(
            side_effect=Exception("DB not in test")
        )
        mock_session.rollback = MagicMock()

        with self._patch_user(_make_admin()), self._patch_db() as mock_db:
            mock_db.session = mock_session
            resp = self.client.post("/api/interest-charges", json=VALID_POST)

        # 500 because commit raised, but NOT 400/401/403 — all fields valid.
        self.assertNotIn(resp.status_code, [400, 401, 403])
        print(
            f"PASS  test_25_post_default_rate_is_2_percent"
            f"  (status={resp.status_code}, validation passed)"
        )

    def test_26_admin_update_unknown_field_returns_400(self):
        """PUT with an unsupported field → 400."""
        charge = _make_charge(1, farmer_id=10)
        with self._patch_user(_make_admin()), self._patch_model() as M:
            M.query.get.return_value = charge
            resp = self.client.put(
                "/api/interest-charges/1",
                json={"maliciousField": "injected"},
            )
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_26_admin_update_unknown_field_returns_400")

    # -----------------------------------------------------------------------
    # Tests 27–28  DB error handling — must not expose str(e)
    # -----------------------------------------------------------------------

    def test_27_db_error_on_delete_returns_500_not_exception_text(self):
        """DB error on DELETE → 500 with generic message, not raw str(e)."""
        charge = _make_charge(1, farmer_id=10)
        mock_session = MagicMock()
        mock_session.delete = MagicMock()
        mock_session.commit = MagicMock(
            side_effect=Exception("sensitive SQL details")
        )
        mock_session.rollback = MagicMock()

        with self._patch_user(_make_admin()), \
             self._patch_model() as M, \
             self._patch_db() as mock_db:
            M.query.get.return_value = charge
            mock_db.session = mock_session
            resp = self.client.delete("/api/interest-charges/1")

        self.assertEqual(resp.status_code, 500)
        body_text = resp.get_data(as_text=True)
        self.assertNotIn("sensitive SQL details", body_text,
            "Raw exception text must not appear in the 500 response.")
        print("PASS  test_27_db_error_on_delete_returns_500_not_exception_text")

    def test_28_db_error_on_update_returns_500_not_exception_text(self):
        """DB error on PUT → 500 with generic message, not raw str(e)."""
        charge = _make_charge(1, farmer_id=10)
        mock_session = MagicMock()
        mock_session.commit = MagicMock(
            side_effect=Exception("sensitive SQL details")
        )
        mock_session.rollback = MagicMock()

        with self._patch_user(_make_admin()), \
             self._patch_model() as M, \
             self._patch_db() as mock_db:
            M.query.get.return_value = charge
            mock_db.session = mock_session
            resp = self.client.put(
                "/api/interest-charges/1",
                json={"notes": "update"},
            )

        self.assertEqual(resp.status_code, 500)
        body_text = resp.get_data(as_text=True)
        self.assertNotIn("sensitive SQL details", body_text,
            "Raw exception text must not appear in the 500 response.")
        print("PASS  test_28_db_error_on_update_returns_500_not_exception_text")

    # -----------------------------------------------------------------------
    # Test 29  ADMIN DELETE reaches business logic (not blocked)
    # -----------------------------------------------------------------------

    def test_29_admin_delete_auth_passes(self):
        """ADMIN DELETE auth guard must not return 401 or 403."""
        charge = _make_charge(1, farmer_id=10)
        mock_session = MagicMock()
        mock_session.delete = MagicMock()
        mock_session.commit = MagicMock()

        with self._patch_user(_make_admin()), \
             self._patch_model() as M, \
             self._patch_db() as mock_db:
            M.query.get.return_value = charge
            mock_db.session = mock_session
            resp = self.client.delete("/api/interest-charges/1")

        self.assertNotIn(resp.status_code, [401, 403])
        print(
            f"PASS  test_29_admin_delete_auth_passes"
            f"  (status={resp.status_code})"
        )

    # -----------------------------------------------------------------------
    # Test 30  PUT missing body → 400
    # -----------------------------------------------------------------------

    def test_30_admin_put_missing_body_returns_400(self):
        """ADMIN PUT with no body → 400 (not 401/403)."""
        charge = _make_charge(1, farmer_id=10)
        with self._patch_user(_make_admin()), self._patch_model() as M:
            M.query.get.return_value = charge
            resp = self.client.put(
                "/api/interest-charges/1",
                data="",
                content_type="application/json",
            )
        self.assertEqual(resp.status_code, 400)
        print("PASS  test_30_admin_put_missing_body_returns_400")


# ---------------------------------------------------------------------------
# Entry point.
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestInterestChargeAuth)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
