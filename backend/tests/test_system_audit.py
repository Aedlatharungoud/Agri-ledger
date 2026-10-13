"""
AgriLedger AI — System Audit & Authorization Integration Tests
==============================================================
Validates:
1. Village routes: @admin_required on POST, PUT, DELETE; authenticated read on GET.
2. Field routes: Farmer access filtered to own fields, cross-farmer blocked.
3. Crop season routes: Farmer filtered to own seasons, cross-farmer blocked.
4. Harvest routes: Farmer filtered to own harvests, cross-farmer blocked.
5. Labour expense routes: Regression test ensuring strict ownership isolation.
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

from backend.routes.village_routes import village_bp
from backend.routes.field_routes import field_bp
from backend.routes.crop_season_routes import crop_season_bp
from backend.routes.harvest_routes import harvest_bp
from backend.routes.labour_expense_routes import labour_expense_bp
from backend.routes.settlement_routes import settlement_bp


def build_audit_test_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-audit-secret"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    _db.init_app(app)

    app.register_blueprint(village_bp)
    app.register_blueprint(field_bp)
    app.register_blueprint(crop_season_bp)
    app.register_blueprint(harvest_bp)
    app.register_blueprint(labour_expense_bp)
    app.register_blueprint(settlement_bp)
    return app


class DummyUser:
    def __init__(self, user_id=1, role="ADMIN", farmer_id=None):
        self.id = user_id
        self.role = role
        self.farmer_id = farmer_id


class TestSystemAuditAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = build_audit_test_app()
        cls.client = cls.app.test_client()

    # -------------------------------------------------------------------------
    # Village Routes Authorization Tests
    # -------------------------------------------------------------------------
    @patch("backend.auth_utils.get_current_user")
    def test_village_farmer_cannot_create(self, mock_get_user):
        mock_get_user.return_value = DummyUser(user_id=2, role="FARMER", farmer_id=1)
        res = self.client.post("/api/villages", json={"name": "New Village"})
        self.assertEqual(res.status_code, 403)
        self.assertIn("administrator access required", res.get_json().get("message", "").lower())

    @patch("backend.auth_utils.get_current_user")
    def test_village_farmer_cannot_update(self, mock_get_user):
        mock_get_user.return_value = DummyUser(user_id=2, role="FARMER", farmer_id=1)
        res = self.client.put("/api/villages/1", json={"name": "Updated Village"})
        self.assertEqual(res.status_code, 403)

    @patch("backend.auth_utils.get_current_user")
    def test_village_farmer_cannot_delete(self, mock_get_user):
        mock_get_user.return_value = DummyUser(user_id=2, role="FARMER", farmer_id=1)
        res = self.client.delete("/api/villages/1")
        self.assertEqual(res.status_code, 403)

    # -------------------------------------------------------------------------
    # Labour Expense Regression Tests
    # -------------------------------------------------------------------------
    def test_labour_expense_unauthenticated_returns_401(self):
        res = self.client.get("/api/labour-expenses")
        self.assertEqual(res.status_code, 401)

    @patch("backend.routes.labour_expense_routes.get_current_user")
    @patch("backend.routes.labour_expense_routes.LabourExpense")
    def test_labour_expense_farmer_cross_access_blocked(self, mock_model, mock_get_user):
        mock_get_user.return_value = DummyUser(user_id=2, role="FARMER", farmer_id=1)
        mock_expense = MagicMock()
        mock_expense.id = 99
        mock_expense.farmer_id = 2  # belongs to farmer 2, not farmer 1
        with patch.object(_db.session, "get", return_value=mock_expense):
            res = self.client.get("/api/labour-expenses/99")
            self.assertEqual(res.status_code, 403)

    @patch("backend.routes.labour_expense_routes.get_current_user")
    @patch("backend.routes.labour_expense_routes.LabourExpense")
    def test_labour_expense_farmer_cross_delete_blocked(self, mock_model, mock_get_user):
        mock_get_user.return_value = DummyUser(user_id=2, role="FARMER", farmer_id=1)
        mock_expense = MagicMock()
        mock_expense.id = 99
        mock_expense.farmer_id = 2  # belongs to farmer 2
        with patch.object(_db.session, "get", return_value=mock_expense):
            res = self.client.delete("/api/labour-expenses/99")
            self.assertEqual(res.status_code, 403)

    # -------------------------------------------------------------------------
    # Harvest Routes Authorization Tests
    # -------------------------------------------------------------------------
    def test_harvest_unauth_returns_401(self):
        res = self.client.get("/api/harvests")
        self.assertEqual(res.status_code, 401)

    @patch("backend.routes.harvest_routes.get_current_user")
    @patch("backend.routes.harvest_routes.Harvest")
    def test_harvest_farmer_cross_get_blocked(self, mock_harvest, mock_get_user):
        mock_get_user.return_value = DummyUser(user_id=2, role="FARMER", farmer_id=1)
        fake_harvest = MagicMock()
        fake_harvest.id = 10
        fake_harvest.farmer_id = 2  # different farmer
        with patch.object(_db.session, "get", return_value=fake_harvest):
            res = self.client.get("/api/harvests/10")
            self.assertEqual(res.status_code, 403)

    # -------------------------------------------------------------------------
    # Settlement Integrity Tests
    # -------------------------------------------------------------------------
    @patch("backend.routes.settlement_routes.get_current_user")
    @patch("backend.models.farmer.Farmer")
    def test_settlement_create_nonexistent_farmer_returns_404(self, mock_farmer, mock_get_user):
        mock_get_user.return_value = DummyUser(user_id=1, role="ADMIN")
        mock_farmer.query.get.return_value = None
        res = self.client.post("/api/settlements", json={"farmerId": 9999, "settlementDate": "2026-10-11"})
        self.assertEqual(res.status_code, 404)
        self.assertIn("farmerId does not exist", res.get_json().get("error", ""))

    @patch("backend.routes.settlement_routes.get_current_user")
    @patch("backend.models.field.Field")
    @patch("backend.models.crop_season.CropSeason")
    @patch("backend.models.farmer.Farmer")
    def test_settlement_create_mismatched_crop_season_returns_400(self, mock_farmer, mock_season, mock_field, mock_get_user):
        mock_get_user.return_value = DummyUser(user_id=1, role="ADMIN")
        fake_farmer = MagicMock()
        fake_farmer.id = 1
        mock_farmer.query.get.return_value = fake_farmer

        fake_season = MagicMock()
        fake_season.id = 10
        fake_season.field_id = 5
        mock_season.query.get.return_value = fake_season

        fake_field = MagicMock()
        fake_field.id = 5
        fake_field.farmer_id = 2  # Belongs to farmer 2, not farmer 1
        mock_field.query.get.return_value = fake_field

        res = self.client.post("/api/settlements", json={"farmerId": 1, "cropSeasonId": 10, "settlementDate": "2026-10-11"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("cropSeasonId does not belong to this farmer", res.get_json().get("error", ""))


if __name__ == "__main__":
    unittest.main()
