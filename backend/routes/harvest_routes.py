
from datetime import datetime
import math

from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.harvest import Harvest
from backend.models.field import Field
from backend.models.crop_season import CropSeason
from backend.auth_utils import get_current_user


harvest_bp = Blueprint("harvest_bp", __name__)


# ============================================================
# AUTHENTICATION AND AUTHORIZATION
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


def can_manage_farmer(user, farmer_id):
    if user.role == "ADMIN":
        return True

    try:
        return (
            user.role == "FARMER"
            and user.farmer_id is not None
            and int(user.farmer_id) == int(farmer_id)
        )
    except (TypeError, ValueError, OverflowError):
        return False


# ============================================================
# VALIDATION HELPERS
# ============================================================

def parse_positive_id(value, field_name):
    if isinstance(value, bool):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a positive integer."
            }),
            400
        )

    try:
        parsed = int(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a positive integer."
            }),
            400
        )

    if parsed <= 0 or str(value).strip() != str(parsed):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a positive integer."
            }),
            400
        )

    return parsed, None


def parse_quantity(value):
    if isinstance(value, bool):
        return None, (
            jsonify({
                "status": "error",
                "message": "quantity must be a valid number greater than zero."
            }),
            400
        )

    try:
        quantity = float(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({
                "status": "error",
                "message": "quantity must be a valid number greater than zero."
            }),
            400
        )

    if not math.isfinite(quantity) or quantity <= 0:
        return None, (
            jsonify({
                "status": "error",
                "message": "quantity must be a finite number greater than zero."
            }),
            400
        )

    return quantity, None


def parse_harvest_date(value):
    if not isinstance(value, str) or not value.strip():
        return None, (
            jsonify({
                "status": "error",
                "message": "harvestDate must use YYYY-MM-DD format."
            }),
            400
        )

    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date(), None
    except ValueError:
        return None, (
            jsonify({
                "status": "error",
                "message": "harvestDate must use YYYY-MM-DD format."
            }),
            400
        )


def validate_text(value, field_name, required=False):
    if value is None:
        if required:
            return None, (
                jsonify({
                    "status": "error",
                    "message": f"{field_name} is required."
                }),
                400
            )
        return None, None

    if not isinstance(value, str):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be text."
            }),
            400
        )

    value = value.strip()

    if required and not value:
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} is required."
            }),
            400
        )

    return value or None, None


def validate_harvest_relationships(farmer_id, field_id, crop_season_id):
    field_id, error = parse_positive_id(field_id, "fieldId")
    if error:
        return None, None, error

    crop_season_id, error = parse_positive_id(
        crop_season_id, "cropSeasonId"
    )
    if error:
        return None, None, error

    field = db.session.get(Field, field_id)

    if field is None:
        return None, None, (
            jsonify({
                "status": "error",
                "message": "Field not found."
            }),
            404
        )

    if int(field.farmer_id) != int(farmer_id):
        return None, None, (
            jsonify({
                "status": "error",
                "message": "The selected field does not belong to this farmer."
            }),
            403
        )

    crop_season = db.session.get(CropSeason, crop_season_id)

    if crop_season is None:
        return None, None, (
            jsonify({
                "status": "error",
                "message": "Crop season not found."
            }),
            404
        )

    if int(crop_season.field_id) != int(field.id):
        return None, None, (
            jsonify({
                "status": "error",
                "message": "The crop season does not belong to the selected field."
            }),
            403
        )

    return field, crop_season, None


# ============================================================
# CONVERT HARVEST TO JSON
# ============================================================

def harvest_to_dict(harvest):
    return {
        "id": harvest.id,
        "farmerId": harvest.farmer_id,
        "fieldId": harvest.field_id,
        "cropSeasonId": harvest.crop_season_id,
        "harvestDate": (
            harvest.harvest_date.isoformat()
            if harvest.harvest_date else None
        ),
        "cropName": harvest.crop_name,
        "quantity": (
            float(harvest.quantity)
            if harvest.quantity is not None else None
        ),
        "unit": harvest.unit,
        "qualityGrade": harvest.quality_grade,
        "lotNumber": harvest.lot_number,
        "notes": harvest.notes,
        "createdAt": (
            harvest.created_at.isoformat()
            if getattr(harvest, "created_at", None) else None
        )
    }


# ============================================================
# GET ALL HARVESTS
# ADMIN: ALL
# FARMER: OWN HARVESTS ONLY
# ============================================================

@harvest_bp.route("/api/harvests", methods=["GET"])
def get_harvests():
    user, error = require_user()
    if error:
        return error

    try:
        query = Harvest.query

        if user.role == "FARMER":
            query = query.filter_by(farmer_id=user.farmer_id)

        harvests = query.order_by(Harvest.id.desc()).all()

        return jsonify([
            harvest_to_dict(harvest)
            for harvest in harvests
        ]), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve harvest records."
        }), 500


# ============================================================
# GET HARVEST BY ID
# ============================================================

@harvest_bp.route("/api/harvests/<int:id>", methods=["GET"])
def get_harvest(id):
    user, error = require_user()
    if error:
        return error

    try:
        harvest = db.session.get(Harvest, id)

        if harvest is None:
            return jsonify({
                "status": "error",
                "message": "Harvest not found."
            }), 404

        if not can_manage_farmer(user, harvest.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You are not authorized to access this harvest."
            }), 403

        return jsonify(harvest_to_dict(harvest)), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve the harvest."
        }), 500


# ============================================================
# CREATE HARVEST
# ============================================================

@harvest_bp.route("/api/harvests", methods=["POST"])
def create_harvest():
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON request body is required."
        }), 400

    if user.role == "FARMER":
        data["farmerId"] = user.farmer_id

    required = [
        "farmerId",
        "fieldId",
        "cropSeasonId",
        "harvestDate",
        "cropName",
        "quantity"
    ]

    missing = [
        key for key in required
        if key not in data or data[key] is None or data[key] == ""
    ]

    if missing:
        return jsonify({
            "status": "error",
            "message": "Missing required field(s): " + ", ".join(missing)
        }), 400

    farmer_id, error = parse_positive_id(data["farmerId"], "farmerId")
    if error:
        return error

    if not can_manage_farmer(user, farmer_id):
        return jsonify({
            "status": "error",
            "message": "You can create harvest records only for your own farmer account."
        }), 403

    harvest_date, error = parse_harvest_date(data["harvestDate"])
    if error:
        return error

    crop_name, error = validate_text(data["cropName"], "cropName", True)
    if error:
        return error

    quantity, error = parse_quantity(data["quantity"])
    if error:
        return error

    unit, error = validate_text(data.get("unit", "KG"), "unit", True)
    if error:
        return error

    quality_grade, error = validate_text(data.get("qualityGrade"), "qualityGrade")
    if error:
        return error

    lot_number, error = validate_text(data.get("lotNumber"), "lotNumber")
    if error:
        return error

    notes, error = validate_text(data.get("notes"), "notes")
    if error:
        return error

    try:
        field, crop_season, error = validate_harvest_relationships(
            farmer_id, data["fieldId"], data["cropSeasonId"]
        )
        if error:
            return error

        harvest = Harvest(
            farmer_id=farmer_id,
            field_id=field.id,
            crop_season_id=crop_season.id,
            harvest_date=harvest_date,
            crop_name=crop_name,
            quantity=quantity,
            unit=unit,
            quality_grade=quality_grade,
            lot_number=lot_number,
            notes=notes
        )

        db.session.add(harvest)
        db.session.commit()

        return jsonify({
            "message": "Harvest created successfully",
            "harvest": harvest_to_dict(harvest)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to create harvest. Check the supplied data."
        }), 500


# ============================================================
# UPDATE HARVEST
# ============================================================

@harvest_bp.route("/api/harvests/<int:id>", methods=["PUT"])
def update_harvest(id):
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            "status": "error",
            "message": "A non-empty JSON request body is required."
        }), 400

    allowed = {
        "farmerId",
        "fieldId",
        "cropSeasonId",
        "harvestDate",
        "cropName",
        "quantity",
        "unit",
        "qualityGrade",
        "lotNumber",
        "notes"
    }

    unknown = set(data.keys()) - allowed
    if unknown:
        return jsonify({
            "status": "error",
            "message": "Unsupported field(s): " + ", ".join(sorted(unknown))
        }), 400

    try:
        harvest = db.session.get(Harvest, id)

        if harvest is None:
            return jsonify({
                "status": "error",
                "message": "Harvest not found."
            }), 404

        if not can_manage_farmer(user, harvest.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You are not authorized to update this harvest."
            }), 403

        target_farmer_id = harvest.farmer_id

        if "farmerId" in data:
            target_farmer_id, error = parse_positive_id(
                data["farmerId"], "farmerId"
            )
            if error:
                return error

            if user.role != "ADMIN" and target_farmer_id != user.farmer_id:
                return jsonify({
                    "status": "error",
                    "message": "Farmers cannot transfer harvest records to another farmer."
                }), 403

        target_field_id = data.get("fieldId", harvest.field_id)
        target_crop_season_id = data.get(
            "cropSeasonId", harvest.crop_season_id
        )

        field, crop_season, error = validate_harvest_relationships(
            target_farmer_id, target_field_id, target_crop_season_id
        )
        if error:
            return error

        target_date = harvest.harvest_date
        if "harvestDate" in data:
            target_date, error = parse_harvest_date(data["harvestDate"])
            if error:
                return error

        target_crop_name = harvest.crop_name
        if "cropName" in data:
            target_crop_name, error = validate_text(
                data["cropName"], "cropName", True
            )
            if error:
                return error

        target_quantity = float(harvest.quantity)
        if "quantity" in data:
            target_quantity, error = parse_quantity(data["quantity"])
            if error:
                return error

        target_unit = harvest.unit
        if "unit" in data:
            target_unit, error = validate_text(data["unit"], "unit", True)
            if error:
                return error

        target_quality = harvest.quality_grade
        if "qualityGrade" in data:
            target_quality, error = validate_text(
                data["qualityGrade"], "qualityGrade"
            )
            if error:
                return error

        target_lot = harvest.lot_number
        if "lotNumber" in data:
            target_lot, error = validate_text(data["lotNumber"], "lotNumber")
            if error:
                return error

        target_notes = harvest.notes
        if "notes" in data:
            target_notes, error = validate_text(data["notes"], "notes")
            if error:
                return error

        harvest.farmer_id = target_farmer_id
        harvest.field_id = field.id
        harvest.crop_season_id = crop_season.id
        harvest.harvest_date = target_date
        harvest.crop_name = target_crop_name
        harvest.quantity = target_quantity
        harvest.unit = target_unit
        harvest.quality_grade = target_quality
        harvest.lot_number = target_lot
        harvest.notes = target_notes

        db.session.commit()

        return jsonify({
            "message": "Harvest updated successfully",
            "harvest": harvest_to_dict(harvest)
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to update harvest. Check the supplied data."
        }), 500


# ============================================================
# DELETE HARVEST
# ============================================================

@harvest_bp.route("/api/harvests/<int:id>", methods=["DELETE"])
def delete_harvest(id):
    user, error = require_user()
    if error:
        return error

    try:
        harvest = db.session.get(Harvest, id)

        if harvest is None:
            return jsonify({
                "status": "error",
                "message": "Harvest not found."
            }), 404

        if not can_manage_farmer(user, harvest.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You are not authorized to delete this harvest."
            }), 403

        db.session.delete(harvest)
        db.session.commit()

        return jsonify({
            "message": "Harvest deleted successfully"
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to delete harvest. Check related records."
        }), 500
