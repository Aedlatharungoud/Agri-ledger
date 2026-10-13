
from datetime import datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.transport_record import TransportRecord
from backend.models.harvest import Harvest
from backend.auth_utils import get_current_user


transport_record_bp = Blueprint("transport_record_bp", __name__)


# ============================================================
# AUTHORIZATION
# ============================================================

def require_user():
    user = get_current_user()

    if user is None:
        return None, (
            jsonify({
                "status": "error",
                "message": "Authentication required."
            }),
            401
        )

    if user.role not in ("ADMIN", "FARMER"):
        return None, (
            jsonify({
                "status": "error",
                "message": "You do not have permission to access this resource."
            }),
            403
        )

    if user.role == "FARMER" and not user.farmer_id:
        return None, (
            jsonify({
                "status": "error",
                "message": "Farmer account is not linked to a farmer record."
            }),
            403
        )

    return user, None


def can_access_harvest(user, harvest):
    if user.role == "ADMIN":
        return True

    return (
        user.role == "FARMER"
        and user.farmer_id is not None
        and harvest.farmer_id is not None
        and int(user.farmer_id) == int(harvest.farmer_id)
    )


# ============================================================
# VALIDATION
# ============================================================

def parse_positive_id(value, field_name):
    if isinstance(value, bool):
        return None, (
            jsonify({"error": f"{field_name} must be a positive integer."}),
            400
        )

    try:
        parsed = int(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({"error": f"{field_name} must be a positive integer."}),
            400
        )

    if parsed <= 0 or str(value).strip() != str(parsed):
        return None, (
            jsonify({"error": f"{field_name} must be a positive integer."}),
            400
        )

    return parsed, None


def parse_date(value):
    if not isinstance(value, str) or not value.strip():
        return None, (
            jsonify({"error": "transportDate must use YYYY-MM-DD format."}),
            400
        )

    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date(), None
    except ValueError:
        return None, (
            jsonify({"error": "transportDate must use YYYY-MM-DD format."}),
            400
        )


def parse_nonnegative_amount(value, field_name):
    if isinstance(value, bool):
        return None, (
            jsonify({"error": f"{field_name} must be a non-negative number."}),
            400
        )

    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None, (
            jsonify({"error": f"{field_name} must be a non-negative number."}),
            400
        )

    if not amount.is_finite() or amount < 0:
        return None, (
            jsonify({"error": f"{field_name} must be a finite non-negative number."}),
            400
        )

    return amount, None


def validate_text(value, field_name):
    if value is None:
        return None, None

    if not isinstance(value, str):
        return None, (
            jsonify({"error": f"{field_name} must be text or null."}),
            400
        )

    return value.strip() or None, None


def get_harvest_for_user(user, harvest_id):
    harvest_id, error = parse_positive_id(harvest_id, "harvestId")
    if error:
        return None, error

    harvest = db.session.get(Harvest, harvest_id)

    if harvest is None:
        return None, (
            jsonify({"error": "Selected harvest does not exist."}),
            404
        )

    if not can_access_harvest(user, harvest):
        return None, (
            jsonify({
                "error": "You can manage transport only for your own harvests."
            }),
            403
        )

    return harvest, None


# ============================================================
# CONVERT TRANSPORT RECORD TO JSON
# ============================================================

def transport_record_to_dict(record):
    return {
        "id": record.id,
        "harvestId": record.harvest_id,
        "transportDate": (
            record.transport_date.isoformat()
            if record.transport_date else None
        ),
        "truckNumber": record.truck_number,
        "driverName": record.driver_name,
        "fromLocation": record.from_location,
        "toLocation": record.to_location,
        "quantityLoaded": (
            float(record.quantity_loaded)
            if record.quantity_loaded is not None else None
        ),
        "freightAmount": (
            float(record.freight_amount)
            if record.freight_amount is not None else None
        ),
        "loadingCharges": (
            float(record.loading_charges)
            if record.loading_charges is not None else None
        ),
        "unloadingCharges": (
            float(record.unloading_charges)
            if record.unloading_charges is not None else None
        ),
        "notes": record.notes,
        "createdAt": (
            record.created_at.isoformat()
            if record.created_at else None
        )
    }


# ============================================================
# GET ALL TRANSPORT RECORDS
# ============================================================

@transport_record_bp.route("/api/transport-records", methods=["GET"])
def get_transport_records():
    user, error = require_user()
    if error:
        return error

    try:
        query = TransportRecord.query.join(
            Harvest,
            TransportRecord.harvest_id == Harvest.id
        )

        if user.role == "FARMER":
            query = query.filter(Harvest.farmer_id == user.farmer_id)

        records = query.order_by(TransportRecord.id.desc()).all()

        return jsonify([
            transport_record_to_dict(record)
            for record in records
        ]), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve transport records."
        }), 500


# ============================================================
# GET TRANSPORT RECORD BY ID
# ============================================================

@transport_record_bp.route(
    "/api/transport-records/<int:id>",
    methods=["GET"]
)
def get_transport_record(id):
    user, error = require_user()
    if error:
        return error

    try:
        record = db.session.get(TransportRecord, id)

        if record is None:
            return jsonify({"error": "Transport record not found."}), 404

        harvest = db.session.get(Harvest, record.harvest_id)

        if harvest is None:
            return jsonify({"error": "Related harvest not found."}), 404

        if not can_access_harvest(user, harvest):
            return jsonify({
                "error": "You are not authorized to access this record."
            }), 403

        return jsonify(transport_record_to_dict(record)), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve the transport record."
        }), 500


# ============================================================
# CREATE TRANSPORT RECORD
# ============================================================

@transport_record_bp.route("/api/transport-records", methods=["POST"])
def create_transport_record():
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "A valid JSON request body is required."}), 400

    for key in ("harvestId", "transportDate"):
        if key not in data or data[key] is None or data[key] == "":
            return jsonify({"error": f"{key} is required."}), 400

    harvest, error = get_harvest_for_user(user, data["harvestId"])
    if error:
        return error

    transport_date, error = parse_date(data["transportDate"])
    if error:
        return error

    numeric_fields = {
        "quantityLoaded": data.get("quantityLoaded"),
        "freightAmount": data.get("freightAmount"),
        "loadingCharges": data.get("loadingCharges"),
        "unloadingCharges": data.get("unloadingCharges")
    }

    parsed_numbers = {}

    for key, value in numeric_fields.items():
        if value is None or value == "":
            parsed_numbers[key] = None
            continue

        number, error = parse_nonnegative_amount(value, key)
        if error:
            return error

        if key == "quantityLoaded" and number <= 0:
            return jsonify({
                "error": "quantityLoaded must be greater than zero."
            }), 400

        parsed_numbers[key] = number

    text_fields = {}
    for key in (
        "truckNumber", "driverName", "fromLocation",
        "toLocation", "notes"
    ):
        text_fields[key], error = validate_text(data.get(key), key)
        if error:
            return error

    try:
        record = TransportRecord(
            harvest_id=harvest.id,
            transport_date=transport_date,
            truck_number=text_fields["truckNumber"],
            driver_name=text_fields["driverName"],
            from_location=text_fields["fromLocation"],
            to_location=text_fields["toLocation"],
            quantity_loaded=parsed_numbers["quantityLoaded"],
            freight_amount=parsed_numbers["freightAmount"],
            loading_charges=parsed_numbers["loadingCharges"],
            unloading_charges=parsed_numbers["unloadingCharges"],
            notes=text_fields["notes"]
        )

        db.session.add(record)
        db.session.commit()

        return jsonify({
            "message": "Transport record created successfully",
            "transportRecord": transport_record_to_dict(record)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to create transport record. Check the supplied data."
        }), 500


# ============================================================
# UPDATE TRANSPORT RECORD
# ============================================================

@transport_record_bp.route(
    "/api/transport-records/<int:id>",
    methods=["PUT"]
)
def update_transport_record(id):
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            "error": "A non-empty JSON request body is required."
        }), 400

    allowed = {
        "harvestId", "transportDate", "truckNumber", "driverName",
        "fromLocation", "toLocation", "quantityLoaded", "freightAmount",
        "loadingCharges", "unloadingCharges", "notes"
    }

    unknown = set(data) - allowed
    if unknown:
        return jsonify({
            "error": "Unsupported field(s): " + ", ".join(sorted(unknown))
        }), 400

    try:
        record = db.session.get(TransportRecord, id)

        if record is None:
            return jsonify({"error": "Transport record not found."}), 404

        current_harvest = db.session.get(Harvest, record.harvest_id)

        if current_harvest is None:
            return jsonify({"error": "Related harvest not found."}), 404

        if not can_access_harvest(user, current_harvest):
            return jsonify({
                "error": "You are not authorized to update this record."
            }), 403

        target_harvest = current_harvest

        if "harvestId" in data:
            target_harvest, error = get_harvest_for_user(
                user, data["harvestId"]
            )
            if error:
                return error

        target_date = record.transport_date
        if "transportDate" in data:
            target_date, error = parse_date(data["transportDate"])
            if error:
                return error

        parsed_numbers = {}

        for key in (
            "quantityLoaded", "freightAmount",
            "loadingCharges", "unloadingCharges"
        ):
            current_value = getattr(
                record,
                {
                    "quantityLoaded": "quantity_loaded",
                    "freightAmount": "freight_amount",
                    "loadingCharges": "loading_charges",
                    "unloadingCharges": "unloading_charges"
                }[key]
            )

            value = data.get(key, current_value)

            if key in data and (value is None or value == ""):
                parsed_numbers[key] = None
                continue

            if value is None:
                parsed_numbers[key] = None
                continue

            number, error = parse_nonnegative_amount(value, key)
            if error:
                return error

            if key == "quantityLoaded" and number <= 0:
                return jsonify({
                    "error": "quantityLoaded must be greater than zero."
                }), 400

            parsed_numbers[key] = number

        text_attributes = {
            "truckNumber": "truck_number",
            "driverName": "driver_name",
            "fromLocation": "from_location",
            "toLocation": "to_location",
            "notes": "notes"
        }

        parsed_text = {}

        for key, attribute in text_attributes.items():
            value = data[key] if key in data else getattr(record, attribute)
            parsed_text[key], error = validate_text(value, key)
            if error:
                return error

        record.harvest_id = target_harvest.id
        record.transport_date = target_date
        record.truck_number = parsed_text["truckNumber"]
        record.driver_name = parsed_text["driverName"]
        record.from_location = parsed_text["fromLocation"]
        record.to_location = parsed_text["toLocation"]
        record.notes = parsed_text["notes"]
        record.quantity_loaded = parsed_numbers["quantityLoaded"]
        record.freight_amount = parsed_numbers["freightAmount"]
        record.loading_charges = parsed_numbers["loadingCharges"]
        record.unloading_charges = parsed_numbers["unloadingCharges"]

        db.session.commit()

        return jsonify({
            "message": "Transport record updated successfully",
            "transportRecord": transport_record_to_dict(record)
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to update transport record. Check the supplied data."
        }), 500


# ============================================================
# DELETE TRANSPORT RECORD
# ============================================================

@transport_record_bp.route(
    "/api/transport-records/<int:id>",
    methods=["DELETE"]
)
def delete_transport_record(id):
    user, error = require_user()
    if error:
        return error

    try:
        record = db.session.get(TransportRecord, id)

        if record is None:
            return jsonify({"error": "Transport record not found."}), 404

        harvest = db.session.get(Harvest, record.harvest_id)

        if harvest is None:
            return jsonify({"error": "Related harvest not found."}), 404

        if not can_access_harvest(user, harvest):
            return jsonify({
                "error": "You are not authorized to delete this record."
            }), 403

        db.session.delete(record)
        db.session.commit()

        return jsonify({
            "message": "Transport record deleted successfully"
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to delete transport record. Check related records."
        }), 500
