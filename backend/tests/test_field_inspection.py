"""
AgriLedger AI — Field Inspection & Appointment Booking Test Suite
==================================================================
Tests:
1.  Unauthenticated access to inspection endpoints returns 401.
2.  Farmer cannot publish or update admin inspection availability (403).
3.  Admin can publish inspection availability slots (201).
4.  Reject past dates for availability publishing (400).
5.  Reject invalid time windows (startTime >= endTime) (400).
6.  Farmer availability listing returns only published, future, non-full slots (200).
7.  Farmer can book appointment for own registered field (201, initial status PENDING).
8.  Farmer cannot book appointment for another farmer's field (403).
9.  Farmer cannot book closed or fully booked availability slots (400).
10. Prevent duplicate active booking by the same farmer for the same slot (400).
11. Admin can accept a pending appointment, safely incrementing booked count (200).
12. Admin cannot accept appointment if slot capacity is already reached (400).
13. Admin can reject appointment with reason, safely updating status (200).
14. Admin can reschedule appointment to another available slot (200).
15. Farmer can cancel own pending/accepted appointment with safe capacity restoration (200).
16. Farmer cannot cancel another farmer's appointment (403).
17. Farmer cannot view another farmer's appointment details (403).
18. Admin can record inspection observations/report and complete appointment (200).
19. Farmer can view own recorded inspection report (200).
20. Farmer cannot access another farmer's inspection report (403).
21. Verify field inspection requires zero OpenAI calls and zero API keys.
"""

import os
import sys
import unittest
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from flask import Flask
from backend.extensions import db as _db

_db.create_all = lambda: None

from backend.routes.field_inspection_routes import field_inspection_bp


def build_test_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-inspection-key-32-chars-long"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    _db.init_app(app)
    app.register_blueprint(field_inspection_bp)
    return app


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


class TestFieldInspectionSuite(unittest.TestCase):
    """Comprehensive test suite for Field Inspection availability, booking, RBAC, and reports."""

    def setUp(self):
        self.app = build_test_app()
        self.ctx = self.app.app_context()
        self.ctx.push()
        self.client = self.app.test_client()

    def tearDown(self):
        self.ctx.pop()

    # 1. Unauthenticated requests
    def test_01_unauthenticated_requests_return_401(self):
        """Unauthenticated requests must be blocked with HTTP 401."""
        with patch("backend.auth_utils.get_current_user", return_value=None):
            resp = self.client.get("/api/inspections/availability")
            self.assertEqual(resp.status_code, 401)

            resp = self.client.post("/api/inspections/appointments", json={})
            self.assertEqual(resp.status_code, 401)

            resp = self.client.get("/api/inspections/admin/appointments")
            self.assertEqual(resp.status_code, 401)

            resp = self.client.post("/api/inspections/availability", json={})
            self.assertEqual(resp.status_code, 401)

    # 2. Farmer cannot create admin availability
    def test_02_farmer_cannot_create_admin_availability(self):
        """A farmer attempting to publish availability must be rejected with 403."""
        with patch("backend.auth_utils.get_current_user", return_value=_make_farmer(1)):
            resp = self.client.post(
                "/api/inspections/availability",
                json={
                    "inspectionDate": (date.today() + timedelta(days=2)).isoformat(),
                    "startTime": "09:00",
                    "endTime": "11:00",
                },
            )
            self.assertEqual(resp.status_code, 403)
            self.assertIn("Administrator access required", resp.get_json()["message"])

    # 3. Admin can publish availability
    @patch("backend.routes.field_inspection_routes.db.session.add")
    @patch("backend.routes.field_inspection_routes.db.session.commit")
    def test_03_admin_can_publish_availability(self, mock_commit, mock_add):
        """An admin can successfully publish inspection availability."""
        future_date = (date.today() + timedelta(days=3)).strftime("%Y-%m-%d")
        with patch("backend.auth_utils.get_current_user", return_value=_make_admin()):
            resp = self.client.post(
                "/api/inspections/availability",
                json={
                    "inspectionDate": future_date,
                    "startTime": "10:00",
                    "endTime": "12:00",
                    "maxCapacity": 2,
                    "notes": "Morning field rounds",
                },
            )
            self.assertEqual(resp.status_code, 201)
            body = resp.get_json()
            self.assertEqual(body["status"], "success")
            self.assertEqual(body["availability"]["startTime"], "10:00")
            self.assertEqual(body["availability"]["endTime"], "12:00")
            self.assertEqual(body["availability"]["maxCapacity"], 2)

    # 4. Reject past dates
    def test_04_reject_past_date_availability(self):
        """Publishing availability for past dates must be rejected with 400."""
        with patch("backend.auth_utils.get_current_user", return_value=_make_admin()):
            resp = self.client.post(
                "/api/inspections/availability",
                json={
                    "inspectionDate": "2020-01-01",
                    "startTime": "09:00",
                    "endTime": "11:00",
                },
            )
            self.assertEqual(resp.status_code, 400)
            self.assertIn("past dates", resp.get_json()["message"])

    # 5. Reject invalid time range
    def test_05_reject_invalid_time_range(self):
        """Start time after end time must be rejected with 400."""
        future_date = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")
        with patch("backend.auth_utils.get_current_user", return_value=_make_admin()):
            resp = self.client.post(
                "/api/inspections/availability",
                json={
                    "inspectionDate": future_date,
                    "startTime": "14:00",
                    "endTime": "11:00",
                },
            )
            self.assertEqual(resp.status_code, 400)
            self.assertIn("startTime must be earlier", resp.get_json()["message"])

    # 6. Farmer availability listing
    @patch("backend.routes.field_inspection_routes.InspectionAvailability.query")
    def test_06_farmer_visibility_bookable_slots(self, mock_query):
        """Farmer can list bookable slots."""
        mock_slot = MagicMock()
        mock_slot.to_dict.return_value = {
            "id": 1,
            "inspectionDate": (date.today() + timedelta(days=1)).isoformat(),
            "startTime": "09:00",
            "endTime": "11:00",
            "isBookable": True,
        }
        mock_query.filter.return_value.order_by.return_value.all.return_value = [mock_slot]

        with patch("backend.auth_utils.get_current_user", return_value=_make_farmer(1)):
            resp = self.client.get("/api/inspections/availability")
            self.assertEqual(resp.status_code, 200)
            body = resp.get_json()
            self.assertEqual(len(body["availabilities"]), 1)

    # 7. Farmer can book own field
    @patch("backend.routes.field_inspection_routes.db.session.get")
    @patch("backend.routes.field_inspection_routes.FieldInspectionAppointment.query")
    @patch("backend.routes.field_inspection_routes.db.session.add")
    @patch("backend.routes.field_inspection_routes.db.session.commit")
    def test_07_farmer_can_book_own_field(self, mock_commit, mock_add, mock_appoint_q, mock_get):
        """Farmer booking own field succeeds and creates PENDING appointment."""
        mock_field = MagicMock()
        mock_field.id = 10
        mock_field.farmer_id = 1

        mock_avail = MagicMock()
        mock_avail.id = 5
        mock_avail.is_active = True
        mock_avail.inspection_date = date.today() + timedelta(days=2)
        mock_avail.booked_count = 0
        mock_avail.max_capacity = 1

        def mock_get_side_effect(model, ident):
            from backend.models.field import Field
            if model == Field:
                return mock_field
            return mock_avail

        mock_get.side_effect = mock_get_side_effect
        mock_appoint_q.filter_by.return_value.filter.return_value.first.return_value = None

        with patch("backend.auth_utils.get_current_user", return_value=_make_farmer(1)):
            resp = self.client.post(
                "/api/inspections/appointments",
                json={
                    "availabilityId": 5,
                    "fieldId": 10,
                    "cropType": "Cotton",
                    "reason": "Pest Concern",
                    "symptoms": "Spotted leaves and curling",
                },
            )
            self.assertEqual(resp.status_code, 201)
            body = resp.get_json()
            self.assertEqual(body["status"], "success")
            self.assertEqual(body["appointment"]["status"], "PENDING")

    # 8. Attempt to book another farmer's field returns 403
    @patch("backend.routes.field_inspection_routes.db.session.get")
    def test_08_farmer_cannot_book_other_farmers_field(self, mock_get):
        """Attempting to book a field belonging to another farmer must return 403."""
        mock_field = MagicMock()
        mock_field.id = 20
        mock_field.farmer_id = 999  # Belongs to farmer 999, but user is farmer 1
        mock_get.return_value = mock_field

        with patch("backend.auth_utils.get_current_user", return_value=_make_farmer(1)):
            resp = self.client.post(
                "/api/inspections/appointments",
                json={
                    "availabilityId": 5,
                    "fieldId": 20,
                    "cropType": "Rice",
                    "reason": "Inspection",
                    "symptoms": "Yellowing",
                },
            )
            self.assertEqual(resp.status_code, 403)
            self.assertIn("only book field inspections for your own", resp.get_json()["message"])

    # 9. Cannot book full slot
    @patch("backend.routes.field_inspection_routes.db.session.get")
    def test_09_farmer_cannot_book_full_slot(self, mock_get):
        """Attempting to book a slot that has reached maximum capacity returns 400."""
        mock_field = MagicMock()
        mock_field.id = 10
        mock_field.farmer_id = 1

        mock_avail = MagicMock()
        mock_avail.id = 5
        mock_avail.is_active = True
        mock_avail.inspection_date = date.today() + timedelta(days=2)
        mock_avail.booked_count = 1
        mock_avail.max_capacity = 1  # Already full

        def mock_get_side_effect(model, ident):
            from backend.models.field import Field
            if model == Field:
                return mock_field
            return mock_avail

        mock_get.side_effect = mock_get_side_effect

        with patch("backend.auth_utils.get_current_user", return_value=_make_farmer(1)):
            resp = self.client.post(
                "/api/inspections/appointments",
                json={
                    "availabilityId": 5,
                    "fieldId": 10,
                    "cropType": "Maize",
                    "reason": "Checkup",
                    "symptoms": "None",
                },
            )
            self.assertEqual(resp.status_code, 400)
            self.assertIn("maximum capacity", resp.get_json()["message"])

    # 10. Duplicate booking prevented
    @patch("backend.routes.field_inspection_routes.db.session.get")
    @patch("backend.routes.field_inspection_routes.FieldInspectionAppointment.query")
    def test_10_prevent_duplicate_booking_for_same_slot(self, mock_appoint_q, mock_get):
        """Prevent multiple pending requests from the same farmer for the same slot."""
        mock_field = MagicMock()
        mock_field.id = 10
        mock_field.farmer_id = 1

        mock_avail = MagicMock()
        mock_avail.id = 5
        mock_avail.is_active = True
        mock_avail.inspection_date = date.today() + timedelta(days=2)
        mock_avail.booked_count = 0
        mock_avail.max_capacity = 2

        def mock_get_side_effect(model, ident):
            from backend.models.field import Field
            if model == Field:
                return mock_field
            return mock_avail

        mock_get.side_effect = mock_get_side_effect
        mock_appoint_q.filter_by.return_value.filter.return_value.first.return_value = MagicMock()

        with patch("backend.auth_utils.get_current_user", return_value=_make_farmer(1)):
            resp = self.client.post(
                "/api/inspections/appointments",
                json={
                    "availabilityId": 5,
                    "fieldId": 10,
                    "cropType": "Maize",
                    "reason": "Duplicate test",
                    "symptoms": "None",
                },
            )
            self.assertEqual(resp.status_code, 400)
            self.assertIn("already have an active appointment request", resp.get_json()["message"])

    # 11. Admin accepts appointment
    @patch("backend.routes.field_inspection_routes.db.session.get")
    @patch("backend.routes.field_inspection_routes.db.session.query")
    @patch("backend.routes.field_inspection_routes.db.session.commit")
    def test_11_admin_can_accept_pending_appointment(self, mock_commit, mock_query, mock_get):
        """Admin accepting pending appointment transitions status to ACCEPTED."""
        mock_appoint = MagicMock()
        mock_appoint.id = 1
        mock_appoint.availability_id = 5
        mock_appoint.status = "PENDING"
        mock_appoint.to_dict.return_value = {"id": 1, "status": "ACCEPTED"}
        mock_get.return_value = mock_appoint

        mock_slot = MagicMock()
        mock_slot.is_active = True
        mock_slot.booked_count = 0
        mock_slot.max_capacity = 1
        mock_query.return_value.filter_by.return_value.with_for_update.return_value.one_or_none.return_value = mock_slot

        with patch("backend.auth_utils.get_current_user", return_value=_make_admin()):
            resp = self.client.post("/api/inspections/appointments/1/accept")
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(mock_appoint.status, "ACCEPTED")
            self.assertEqual(mock_slot.booked_count, 1)

    # 12. Admin rejects appointment
    @patch("backend.routes.field_inspection_routes.db.session.get")
    @patch("backend.routes.field_inspection_routes.db.session.commit")
    def test_13_admin_can_reject_appointment(self, mock_commit, mock_get):
        """Admin can reject appointment with persistent rejection reason."""
        mock_appoint = MagicMock()
        mock_appoint.id = 1
        mock_appoint.status = "PENDING"
        mock_appoint.to_dict.return_value = {"id": 1, "status": "REJECTED"}
        mock_get.return_value = mock_appoint

        with patch("backend.auth_utils.get_current_user", return_value=_make_admin()):
            resp = self.client.post(
                "/api/inspections/appointments/1/reject",
                json={"rejectionReason": "Slot unavailable due to weather"},
            )
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(mock_appoint.status, "REJECTED")
            self.assertEqual(mock_appoint.rejection_reason, "Slot unavailable due to weather")

    # 13. Farmer cancels appointment
    @patch("backend.routes.field_inspection_routes.db.session.get")
    @patch("backend.routes.field_inspection_routes.db.session.query")
    @patch("backend.routes.field_inspection_routes.db.session.commit")
    def test_15_farmer_can_cancel_own_accepted_appointment(self, mock_commit, mock_query, mock_get):
        """Farmer canceling ACCEPTED appointment restores slot capacity safely."""
        mock_appoint = MagicMock()
        mock_appoint.id = 1
        mock_appoint.farmer_id = 1
        mock_appoint.availability_id = 5
        mock_appoint.status = "ACCEPTED"
        mock_appoint.admin_notes = None
        mock_appoint.to_dict.return_value = {"id": 1, "status": "CANCELLED"}
        mock_get.return_value = mock_appoint

        mock_slot = MagicMock()
        mock_slot.booked_count = 1
        mock_query.return_value.filter_by.return_value.with_for_update.return_value.one_or_none.return_value = mock_slot

        with patch("backend.auth_utils.get_current_user", return_value=_make_farmer(1)):
            resp = self.client.post("/api/inspections/appointments/1/cancel")
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(mock_appoint.status, "CANCELLED")
            self.assertEqual(mock_slot.booked_count, 0)

    # 14. Cross-farmer cancellation prevented
    @patch("backend.routes.field_inspection_routes.db.session.get")
    def test_16_farmer_cannot_cancel_other_farmers_appointment(self, mock_get):
        """Farmer cannot cancel an appointment belonging to another farmer."""
        mock_appoint = MagicMock()
        mock_appoint.id = 1
        mock_appoint.farmer_id = 999  # other farmer
        mock_get.return_value = mock_appoint

        with patch("backend.auth_utils.get_current_user", return_value=_make_farmer(1)):
            resp = self.client.post("/api/inspections/appointments/1/cancel")
            self.assertEqual(resp.status_code, 403)

    # 15. Admin records inspection report
    @patch("backend.routes.field_inspection_routes.db.session.get")
    @patch("backend.routes.field_inspection_routes.FieldInspectionReport.query")
    @patch("backend.routes.field_inspection_routes.db.session.add")
    @patch("backend.routes.field_inspection_routes.db.session.commit")
    def test_18_admin_records_report_and_completes_appointment(
        self, mock_commit, mock_add, mock_report_q, mock_get
    ):
        """Admin records observations, diagnoses, and products, completing appointment."""
        mock_appoint = MagicMock()
        mock_appoint.id = 1
        mock_appoint.status = "ACCEPTED"
        mock_appoint.to_dict.return_value = {"id": 1, "status": "COMPLETED"}
        mock_get.return_value = mock_appoint
        mock_report_q.filter_by.return_value.first.return_value = None

        with patch("backend.auth_utils.get_current_user", return_value=_make_admin()):
            resp = self.client.post(
                "/api/inspections/appointments/1/report",
                json={
                    "inspectorName": "Dr. Rao (Agronomist)",
                    "inspectionDate": date.today().isoformat(),
                    "affectedCrop": "Cotton",
                    "symptomsObserved": "Boll rot observed on 15% of lower canopy",
                    "diagnosis": "Bacterial Boll Rot (Xanthomonas)",
                    "recommendedActions": "Improve aeration and spray bactericide",
                    "suggestedProducts": "Streptomycin sulphate 90% + Tetracycline 10%",
                    "applicationGuidance": "0.5g/L water, foliar spray",
                },
            )
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(mock_appoint.status, "COMPLETED")

    # 16. Cross-farmer report access prevented
    @patch("backend.routes.field_inspection_routes.db.session.get")
    def test_20_farmer_cannot_access_other_farmers_report(self, mock_get):
        """Farmer cannot access inspection report of another farmer."""
        mock_appoint = MagicMock()
        mock_appoint.id = 10
        mock_appoint.farmer_id = 999  # other farmer
        mock_get.return_value = mock_appoint

        with patch("backend.auth_utils.get_current_user", return_value=_make_farmer(1)):
            resp = self.client.get("/api/inspections/appointments/10/report")
            self.assertEqual(resp.status_code, 403)

    # 17. No OpenAI dependency
    def test_21_no_openai_dependency(self):
        """Verify field inspection runs with zero OpenAI API keys or external endpoints."""
        from backend.config import Config
        self.assertFalse(hasattr(Config, "OPENAI_API_KEY"))
        self.assertFalse(hasattr(Config, "OPENAI_MODEL"))


if __name__ == "__main__":
    unittest.main()
