import logging
from datetime import date, datetime
from flask import Blueprint, jsonify, request

from backend import auth_utils
from backend.auth_utils import (
    admin_required,
    farmer_required,
    login_required,
)

def get_current_user():
    return auth_utils.get_current_user()

from backend.extensions import db
from backend.models.crop_season import CropSeason
from backend.models.farmer import Farmer
from backend.models.field import Field
from backend.models.field_inspection import (
    FieldInspectionAppointment,
    FieldInspectionReport,
    InspectionAvailability,
)

logger = logging.getLogger(__name__)

field_inspection_bp = Blueprint(
    "field_inspections", __name__, url_prefix="/api/inspections"
)


# ============================================================================
# HELPER VALIDATORS
# ============================================================================

def _parse_time_str(time_val: str) -> str:
    """Validate and normalize HH:MM time string."""
    clean = str(time_val).strip()
    # Accept HH:MM or HH:MM:SS
    parts = clean.split(":")
    if len(parts) < 2:
        raise ValueError("Invalid time format. Expected HH:MM.")
    hour = int(parts[0])
    minute = int(parts[1])
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError("Invalid hour or minute value.")
    return f"{hour:02d}:{minute:02d}"


def _parse_date_str(date_val: str) -> date:
    """Validate and parse YYYY-MM-DD date string."""
    clean = str(date_val).strip()
    return datetime.strptime(clean, "%Y-%m-%d").date()


# ============================================================================
# ADMIN AVAILABILITY MANAGEMENT
# ============================================================================

@field_inspection_bp.route("/availability", methods=["POST"])
@admin_required
def create_availability():
    """
    Publish a new inspection availability window. (Admin only)
    Payload:
        inspectionDate: "YYYY-MM-DD"
        startTime: "HH:MM"
        endTime: "HH:MM"
        maxCapacity: int (default 1)
        notes: str (optional)
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Request body is required."}), 400

    raw_date = data.get("inspectionDate")
    raw_start = data.get("startTime")
    raw_end = data.get("endTime")
    raw_capacity = data.get("maxCapacity", 1)
    notes = data.get("notes")

    if not raw_date or not raw_start or not raw_end:
        return jsonify({
            "status": "error",
            "message": "inspectionDate, startTime, and endTime are required.",
        }), 400

    try:
        insp_date = _parse_date_str(raw_date)
    except Exception:
        return jsonify({"status": "error", "message": "Invalid inspectionDate format. Expected YYYY-MM-DD."}), 400

    if insp_date < date.today():
        return jsonify({"status": "error", "message": "Cannot publish availability for past dates."}), 400

    try:
        start_time = _parse_time_str(raw_start)
        end_time = _parse_time_str(raw_end)
    except ValueError as err:
        return jsonify({"status": "error", "message": str(err)}), 400

    if start_time >= end_time:
        return jsonify({"status": "error", "message": "startTime must be earlier than endTime."}), 400

    try:
        capacity = int(raw_capacity)
        if capacity < 1:
            raise ValueError()
    except Exception:
        return jsonify({"status": "error", "message": "maxCapacity must be a positive integer (minimum 1)."}), 400

    try:
        slot = InspectionAvailability(
            inspection_date=insp_date,
            start_time=start_time,
            end_time=end_time,
            max_capacity=capacity,
            booked_count=0,
            is_active=True,
            notes=str(notes).strip() if notes else None,
        )
        db.session.add(slot)
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Inspection availability slot published successfully.",
            "availability": slot.to_dict(),
        }), 201
    except Exception as err:
        db.session.rollback()
        logger.exception("Failed to create inspection availability")
        return jsonify({"status": "error", "message": "Failed to create availability slot."}), 500


@field_inspection_bp.route("/admin/availability", methods=["GET"])
@admin_required
def list_admin_availability():
    """List all published inspection slots for administrators with optional filtering."""
    try:
        query = InspectionAvailability.query
        date_filter = request.args.get("date")
        if date_filter:
            d = _parse_date_str(date_filter)
            query = query.filter(InspectionAvailability.inspection_date == d)

        active_only = request.args.get("activeOnly")
        if active_only is not None and active_only.lower() in ("true", "1"):
            query = query.filter(InspectionAvailability.is_active == True)

        slots = query.order_by(
            InspectionAvailability.inspection_date.asc(),
            InspectionAvailability.start_time.asc(),
        ).all()
        return jsonify({
            "status": "success",
            "availabilities": [s.to_dict() for s in slots],
        }), 200
    except Exception:
        logger.exception("Failed to list admin availabilities")
        return jsonify({"status": "error", "message": "Failed to load availability slots."}), 500


@field_inspection_bp.route("/availability/<int:id>", methods=["PUT"])
@admin_required
def update_availability(id):
    """
    Update or close/reopen an availability slot. (Admin only)
    Payload:
        isActive: bool
        maxCapacity: int
        notes: str
    """
    slot = db.session.get(InspectionAvailability, id)
    if not slot:
        return jsonify({"status": "error", "message": "Availability slot not found."}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Request body is required."}), 400

    if "isActive" in data:
        slot.is_active = bool(data["isActive"])

    if "maxCapacity" in data:
        try:
            new_cap = int(data["maxCapacity"])
            if new_cap < slot.booked_count:
                return jsonify({
                    "status": "error",
                    "message": f"maxCapacity cannot be less than currently booked count ({slot.booked_count}).",
                }), 400
            slot.max_capacity = new_cap
        except Exception:
            return jsonify({"status": "error", "message": "maxCapacity must be a positive integer."}), 400

    if "notes" in data:
        slot.notes = str(data["notes"]).strip() if data["notes"] else None

    try:
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Availability slot updated successfully.",
            "availability": slot.to_dict(),
        }), 200
    except Exception:
        db.session.rollback()
        logger.exception("Failed to update availability slot")
        return jsonify({"status": "error", "message": "Failed to update availability slot."}), 500


@field_inspection_bp.route("/availability/<int:id>", methods=["DELETE"])
@admin_required
def delete_availability(id):
    """
    Delete an availability slot if no appointments are linked.
    If appointments are linked, safely soft-deactivates instead of breaking foreign keys.
    """
    slot = db.session.get(InspectionAvailability, id)
    if not slot:
        return jsonify({"status": "error", "message": "Availability slot not found."}), 404

    try:
        if slot.appointments:
            # Soft-delete to preserve history
            slot.is_active = False
            db.session.commit()
            return jsonify({
                "status": "success",
                "message": "Slot has existing appointment history; deactivated slot to preserve records.",
                "availability": slot.to_dict(),
            }), 200

        db.session.delete(slot)
        db.session.commit()
        return jsonify({"status": "success", "message": "Availability slot deleted successfully."}), 200
    except Exception:
        db.session.rollback()
        logger.exception("Failed to delete availability slot")
        return jsonify({"status": "error", "message": "Failed to delete availability slot."}), 500


# ============================================================================
# FARMER AVAILABILITY LISTING (Bookable Slots Only)
# ============================================================================

@field_inspection_bp.route("/availability", methods=["GET"])
@login_required
def list_bookable_availability():
    """
    List only published, currently bookable availability slots for farmers.
    Criteria: is_active = True, inspection_date >= today, booked_count < max_capacity.
    """
    try:
        today = date.today()
        slots = (
            InspectionAvailability.query.filter(
                InspectionAvailability.is_active == True,
                InspectionAvailability.inspection_date >= today,
                InspectionAvailability.booked_count < InspectionAvailability.max_capacity,
            )
            .order_by(
                InspectionAvailability.inspection_date.asc(),
                InspectionAvailability.start_time.asc(),
            )
            .all()
        )
        return jsonify({
            "status": "success",
            "availabilities": [s.to_dict() for s in slots],
        }), 200
    except Exception:
        logger.exception("Failed to list bookable availabilities")
        return jsonify({"status": "error", "message": "Failed to load available inspection slots."}), 500


# ============================================================================
# APPOINTMENT BOOKING & FARMER ACTIONS
# ============================================================================

@field_inspection_bp.route("/appointments", methods=["POST"])
@login_required
def create_appointment():
    user = get_current_user()
    if not user:
        return jsonify({"status": "error", "message": "Authentication required."}), 401

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Request body is required."}), 400

    availability_id = data.get("availabilityId")
    field_id = data.get("fieldId")
    crop_season_id = data.get("cropSeasonId")
    crop_type = str(data.get("cropType", "")).strip()
    reason = str(data.get("reason", "")).strip()
    symptoms = str(data.get("symptoms", "")).strip()
    notes = data.get("notes")

    if not availability_id or not field_id or not crop_type or not reason or not symptoms:
        return jsonify({
            "status": "error",
            "message": "availabilityId, fieldId, cropType, reason, and symptoms are required.",
        }), 400

    # Determine farmer_id
    if user.role == "FARMER":
        if not user.farmer_id:
            return jsonify({
                "status": "error",
                "message": "This account is not associated with a registered farmer profile.",
            }), 403
        target_farmer_id = user.farmer_id
    else:
        # Admin booking on behalf of farmer
        raw_farmer = data.get("farmerId")
        if not raw_farmer:
            return jsonify({
                "status": "error",
                "message": "farmerId is required when an admin creates an appointment.",
            }), 400
        target_farmer_id = int(raw_farmer)

    # 1. Validate Field ownership
    field = db.session.get(Field, field_id)
    if not field:
        return jsonify({"status": "error", "message": "Field not found."}), 404

    if int(field.farmer_id) != int(target_farmer_id):
        return jsonify({
            "status": "error",
            "message": "You can only book field inspections for your own registered fields.",
        }), 403

    # 2. Validate Crop Season if provided
    if crop_season_id:
        season = db.session.get(CropSeason, crop_season_id)
        if not season or int(season.field_id) != int(field.id):
            return jsonify({
                "status": "error",
                "message": "The selected crop season does not belong to the selected field.",
            }), 400

    # 3. Validate Availability Slot
    avail = db.session.get(InspectionAvailability, availability_id)
    if not avail:
        return jsonify({"status": "error", "message": "Selected availability slot does not exist."}), 404

    if not avail.is_active:
        return jsonify({"status": "error", "message": "This availability slot is no longer open for booking."}), 400

    if avail.inspection_date < date.today():
        return jsonify({"status": "error", "message": "Cannot book appointments for past dates."}), 400

    if avail.booked_count >= avail.max_capacity:
        return jsonify({"status": "error", "message": "This slot has already reached maximum capacity."}), 400

    # 4. Check for duplicate pending/accepted request by this farmer for the same slot
    existing = FieldInspectionAppointment.query.filter_by(
        farmer_id=target_farmer_id, availability_id=avail.id
    ).filter(FieldInspectionAppointment.status.in_(["PENDING", "ACCEPTED"])).first()

    if existing:
        return jsonify({
            "status": "error",
            "message": "You already have an active appointment request for this time slot.",
        }), 400

    try:
        appointment = FieldInspectionAppointment(
            availability_id=avail.id,
            farmer_id=target_farmer_id,
            field_id=field.id,
            crop_season_id=int(crop_season_id) if crop_season_id else None,
            crop_type=crop_type,
            reason=reason,
            symptoms=symptoms,
            notes=str(notes).strip() if notes else None,
            status="PENDING",
        )
        db.session.add(appointment)
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Appointment request submitted successfully. Awaiting dealer/admin approval.",
            "appointment": appointment.to_dict(),
        }), 201
    except Exception:
        db.session.rollback()
        logger.exception("Failed to create appointment")
        return jsonify({"status": "error", "message": "Failed to create appointment request."}), 500


@field_inspection_bp.route("/my-appointments", methods=["GET"])
@farmer_required
def list_my_appointments():
    """List all inspection appointments belonging to the logged-in farmer."""
    user = get_current_user()
    if not user:
        return jsonify({"status": "error", "message": "Authentication required."}), 401
    try:
        appointments = (
            FieldInspectionAppointment.query.filter_by(farmer_id=user.farmer_id)
            .order_by(FieldInspectionAppointment.created_at.desc())
            .all()
        )
        return jsonify({
            "status": "success",
            "appointments": [a.to_dict(include_report=True) for a in appointments],
        }), 200
    except Exception:
        logger.exception("Failed to list farmer appointments")
        return jsonify({"status": "error", "message": "Failed to load appointment history."}), 500


@field_inspection_bp.route("/appointments/<int:id>", methods=["GET"])
@login_required
def get_appointment(id):
    """Get appointment details. Farmers can only access their own appointments."""
    user = get_current_user()
    if not user:
        return jsonify({"status": "error", "message": "Authentication required."}), 401
    appointment = db.session.get(FieldInspectionAppointment, id)
    if not appointment:
        return jsonify({"status": "error", "message": "Appointment not found."}), 404

    if user.role == "FARMER" and int(appointment.farmer_id) != int(user.farmer_id):
        return jsonify({"status": "error", "message": "You do not have permission to view this appointment."}), 403

    return jsonify({
        "status": "success",
        "appointment": appointment.to_dict(include_report=True),
    }), 200


@field_inspection_bp.route("/appointments/<int:id>/cancel", methods=["POST"])
@login_required
def cancel_appointment(id):
    """
    Cancel an appointment.
    Farmer can only cancel their own appointment.
    If the appointment was ACCEPTED, restores capacity to the slot safely.
    """
    user = get_current_user()
    if not user:
        return jsonify({"status": "error", "message": "Authentication required."}), 401
    appointment = db.session.get(FieldInspectionAppointment, id)
    if not appointment:
        return jsonify({"status": "error", "message": "Appointment not found."}), 404

    if user.role == "FARMER" and int(appointment.farmer_id) != int(user.farmer_id):
        return jsonify({"status": "error", "message": "You do not have permission to cancel this appointment."}), 403

    if appointment.status in ("COMPLETED", "REJECTED", "CANCELLED"):
        return jsonify({
            "status": "error",
            "message": f"Cannot cancel an appointment with status '{appointment.status}'.",
        }), 400

    data = request.get_json(silent=True) or {}
    cancellation_notes = data.get("reason", "Cancelled by user")

    try:
        # If accepted, lock and decrement availability booked_count
        if appointment.status == "ACCEPTED":
            slot = (
                db.session.query(InspectionAvailability)
                .filter_by(id=appointment.availability_id)
                .with_for_update()
                .one_or_none()
            )
            if slot and slot.booked_count > 0:
                slot.booked_count -= 1

        appointment.status = "CANCELLED"
        if appointment.admin_notes:
            appointment.admin_notes += f" | Cancelled: {cancellation_notes}"
        else:
            appointment.admin_notes = f"Cancelled: {cancellation_notes}"

        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Appointment cancelled successfully.",
            "appointment": appointment.to_dict(),
        }), 200
    except Exception:
        db.session.rollback()
        logger.exception("Failed to cancel appointment")
        return jsonify({"status": "error", "message": "Failed to cancel appointment."}), 500


# ============================================================================
# ADMIN APPOINTMENT MANAGEMENT WORKFLOW
# ============================================================================

@field_inspection_bp.route("/admin/appointments", methods=["GET"])
@admin_required
def list_admin_appointments():
    """
    List all appointments for administrators with optional filtering by status, farmer, or date.
    """
    try:
        query = FieldInspectionAppointment.query
        status_filter = request.args.get("status")
        if status_filter:
            query = query.filter(FieldInspectionAppointment.status == status_filter.upper())

        farmer_filter = request.args.get("farmerId")
        if farmer_filter:
            query = query.filter(FieldInspectionAppointment.farmer_id == int(farmer_filter))

        appointments = query.order_by(FieldInspectionAppointment.created_at.desc()).all()
        return jsonify({
            "status": "success",
            "appointments": [a.to_dict(include_report=True) for a in appointments],
        }), 200
    except Exception:
        logger.exception("Failed to list admin appointments")
        return jsonify({"status": "error", "message": "Failed to load appointments."}), 500


@field_inspection_bp.route("/appointments/<int:id>/accept", methods=["POST"])
@admin_required
def accept_appointment(id):
    """
    Accept a pending inspection appointment.
    Ensures slot has remaining capacity using transactional row-level lock.
    """
    appointment = db.session.get(FieldInspectionAppointment, id)
    if not appointment:
        return jsonify({"status": "error", "message": "Appointment not found."}), 404

    if appointment.status not in ("PENDING", "RESCHEDULED"):
        return jsonify({
            "status": "error",
            "message": f"Cannot accept appointment currently in '{appointment.status}' state.",
        }), 400

    data = request.get_json(silent=True) or {}
    admin_notes = data.get("adminNotes")

    try:
        # Row-level lock on availability slot to guarantee concurrency safety
        slot = (
            db.session.query(InspectionAvailability)
            .filter_by(id=appointment.availability_id)
            .with_for_update()
            .one_or_none()
        )
        if not slot:
            return jsonify({"status": "error", "message": "Associated availability slot not found."}), 404

        if not slot.is_active:
            return jsonify({"status": "error", "message": "The availability slot is closed."}), 400

        if slot.booked_count >= slot.max_capacity:
            return jsonify({
                "status": "error",
                "message": "This slot has already reached its maximum capacity. Cannot accept further appointments.",
            }), 400

        slot.booked_count += 1
        appointment.status = "ACCEPTED"
        if admin_notes:
            appointment.admin_notes = str(admin_notes).strip()

        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Appointment accepted successfully.",
            "appointment": appointment.to_dict(),
        }), 200
    except Exception:
        db.session.rollback()
        logger.exception("Failed to accept appointment")
        return jsonify({"status": "error", "message": "Failed to accept appointment."}), 500


@field_inspection_bp.route("/appointments/<int:id>/reject", methods=["POST"])
@admin_required
def reject_appointment(id):
    """
    Reject an appointment with an optional or required reason.
    If the appointment was previously ACCEPTED, decrements the slot booked_count.
    """
    appointment = db.session.get(FieldInspectionAppointment, id)
    if not appointment:
        return jsonify({"status": "error", "message": "Appointment not found."}), 404

    if appointment.status in ("COMPLETED", "CANCELLED", "REJECTED"):
        return jsonify({
            "status": "error",
            "message": f"Cannot reject an appointment in '{appointment.status}' state.",
        }), 400

    data = request.get_json(silent=True) or {}
    rejection_reason = data.get("rejectionReason", "Not specified")
    admin_notes = data.get("adminNotes")

    try:
        if appointment.status == "ACCEPTED":
            slot = (
                db.session.query(InspectionAvailability)
                .filter_by(id=appointment.availability_id)
                .with_for_update()
                .one_or_none()
            )
            if slot and slot.booked_count > 0:
                slot.booked_count -= 1

        appointment.status = "REJECTED"
        appointment.rejection_reason = str(rejection_reason).strip()
        if admin_notes:
            appointment.admin_notes = str(admin_notes).strip()

        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Appointment rejected.",
            "appointment": appointment.to_dict(),
        }), 200
    except Exception:
        db.session.rollback()
        logger.exception("Failed to reject appointment")
        return jsonify({"status": "error", "message": "Failed to reject appointment."}), 500


@field_inspection_bp.route("/appointments/<int:id>/reschedule", methods=["POST"])
@admin_required
def reschedule_appointment(id):
    """
    Reschedule an appointment to a new available slot.
    Payload:
        newAvailabilityId: int
        adminNotes: str (optional)
    """
    appointment = db.session.get(FieldInspectionAppointment, id)
    if not appointment:
        return jsonify({"status": "error", "message": "Appointment not found."}), 404

    if appointment.status in ("COMPLETED", "CANCELLED"):
        return jsonify({
            "status": "error",
            "message": f"Cannot reschedule an appointment in '{appointment.status}' state.",
        }), 400

    data = request.get_json(silent=True)
    if not data or not data.get("newAvailabilityId"):
        return jsonify({"status": "error", "message": "newAvailabilityId is required."}), 400

    new_slot_id = int(data["newAvailabilityId"])
    admin_notes = data.get("adminNotes")

    try:
        # Row lock on new slot
        new_slot = (
            db.session.query(InspectionAvailability)
            .filter_by(id=new_slot_id)
            .with_for_update()
            .one_or_none()
        )
        if not new_slot or not new_slot.is_active:
            return jsonify({"status": "error", "message": "The selected new slot is unavailable or closed."}), 400

        if new_slot.inspection_date < date.today():
            return jsonify({"status": "error", "message": "Cannot reschedule to a past date."}), 400

        if new_slot.booked_count >= new_slot.max_capacity:
            return jsonify({"status": "error", "message": "The selected new slot is already full."}), 400

        # Adjust capacity if current appointment is already accepted
        if appointment.status == "ACCEPTED":
            old_slot = (
                db.session.query(InspectionAvailability)
                .filter_by(id=appointment.availability_id)
                .with_for_update()
                .one_or_none()
            )
            if old_slot and old_slot.booked_count > 0:
                old_slot.booked_count -= 1
            new_slot.booked_count += 1
            appointment.status = "ACCEPTED"
        else:
            appointment.status = "RESCHEDULED"

        appointment.availability_id = new_slot.id
        if admin_notes:
            appointment.admin_notes = str(admin_notes).strip()

        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Appointment rescheduled successfully.",
            "appointment": appointment.to_dict(),
        }), 200
    except Exception:
        db.session.rollback()
        logger.exception("Failed to reschedule appointment")
        return jsonify({"status": "error", "message": "Failed to reschedule appointment."}), 500


@field_inspection_bp.route("/appointments/<int:id>/complete", methods=["POST"])
@admin_required
def complete_appointment(id):
    """Mark an accepted appointment as completed."""
    appointment = db.session.get(FieldInspectionAppointment, id)
    if not appointment:
        return jsonify({"status": "error", "message": "Appointment not found."}), 404

    if appointment.status != "ACCEPTED":
        return jsonify({
            "status": "error",
            "message": f"Cannot complete an appointment with status '{appointment.status}'. Must be ACCEPTED.",
        }), 400

    try:
        appointment.status = "COMPLETED"
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Appointment marked as completed.",
            "appointment": appointment.to_dict(),
        }), 200
    except Exception:
        db.session.rollback()
        logger.exception("Failed to mark appointment completed")
        return jsonify({"status": "error", "message": "Failed to mark appointment as completed."}), 500


# ============================================================================
# INSPECTION REPORT & CLINICAL OBSERVATIONS
# ============================================================================

@field_inspection_bp.route("/appointments/<int:id>/report", methods=["POST"])
@admin_required
def save_inspection_report(id):
    """
    Record or update official inspection observations, diagnosis, and recommendations.
    Automatically marks the appointment status as COMPLETED.
    Payload:
        inspectorName: str
        inspectionDate: "YYYY-MM-DD"
        affectedCrop: str
        symptomsObserved: str
        diagnosis: str
        recommendedActions: str
        suggestedProducts: str (optional)
        applicationGuidance: str (optional)
        followUpNotes: str (optional)
    """
    appointment = db.session.get(FieldInspectionAppointment, id)
    if not appointment:
        return jsonify({"status": "error", "message": "Appointment not found."}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Request body is required."}), 400

    inspector_name = str(data.get("inspectorName", "")).strip()
    raw_date = data.get("inspectionDate")
    affected_crop = str(data.get("affectedCrop", "")).strip()
    symptoms_observed = str(data.get("symptomsObserved", "")).strip()
    diagnosis = str(data.get("diagnosis", "")).strip()
    recommended_actions = str(data.get("recommendedActions", "")).strip()
    suggested_products = data.get("suggestedProducts")
    application_guidance = data.get("applicationGuidance")
    follow_up_notes = data.get("followUpNotes")

    if not inspector_name or not raw_date or not affected_crop or not symptoms_observed or not diagnosis or not recommended_actions:
        return jsonify({
            "status": "error",
            "message": "inspectorName, inspectionDate, affectedCrop, symptomsObserved, diagnosis, and recommendedActions are required.",
        }), 400

    try:
        insp_date = _parse_date_str(raw_date)
    except Exception:
        return jsonify({"status": "error", "message": "Invalid inspectionDate format. Expected YYYY-MM-DD."}), 400

    try:
        report = FieldInspectionReport.query.filter_by(appointment_id=appointment.id).first()
        if not report:
            report = FieldInspectionReport(
                appointment_id=appointment.id,
                inspector_name=inspector_name,
                inspection_date=insp_date,
                affected_crop=affected_crop,
                symptoms_observed=symptoms_observed,
                diagnosis=diagnosis,
                recommended_actions=recommended_actions,
                suggested_products=str(suggested_products).strip() if suggested_products else None,
                application_guidance=str(application_guidance).strip() if application_guidance else None,
                follow_up_notes=str(follow_up_notes).strip() if follow_up_notes else None,
            )
            db.session.add(report)
        else:
            report.inspector_name = inspector_name
            report.inspection_date = insp_date
            report.affected_crop = affected_crop
            report.symptoms_observed = symptoms_observed
            report.diagnosis = diagnosis
            report.recommended_actions = recommended_actions
            report.suggested_products = str(suggested_products).strip() if suggested_products else None
            report.application_guidance = str(application_guidance).strip() if application_guidance else None
            report.follow_up_notes = str(follow_up_notes).strip() if follow_up_notes else None

        appointment.status = "COMPLETED"
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Field inspection report saved successfully.",
            "report": report.to_dict(),
            "appointment": appointment.to_dict(include_report=True),
        }), 200
    except Exception:
        db.session.rollback()
        logger.exception("Failed to save inspection report")
        return jsonify({"status": "error", "message": "Failed to save inspection report."}), 500


@field_inspection_bp.route("/appointments/<int:id>/report", methods=["GET"])
@login_required
def get_inspection_report(id):
    """
    Retrieve inspection report for an appointment.
    Farmer can only retrieve reports for their own appointments.
    """
    user = get_current_user()
    if not user:
        return jsonify({"status": "error", "message": "Authentication required."}), 401

    appointment = db.session.get(FieldInspectionAppointment, id)
    if not appointment:
        return jsonify({"status": "error", "message": "Appointment not found."}), 404

    if user.role == "FARMER" and int(appointment.farmer_id) != int(user.farmer_id):
        return jsonify({"status": "error", "message": "You do not have permission to view this report."}), 403

    if not appointment.report:
        return jsonify({"status": "error", "message": "Inspection report has not been recorded yet."}), 404

    return jsonify({
        "status": "success",
        "report": appointment.report.to_dict(),
        "appointment": appointment.to_dict(include_report=False),
    }), 200
