
from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.field import Field
from backend.models.farmer import Farmer
from backend.auth_utils import (
    get_current_user,
    can_access_farmer,
)


field_bp = Blueprint("field_bp", __name__)


# ============================================================
# AUTHORIZATION HELPERS
# ============================================================

def authentication_error():
    """Return an authentication error if no active user is logged in."""
    user = get_current_user()

    if user is None:
        return None, (
            jsonify({
                "status": "error",
                "message": "Authentication required.",
            }),
            401,
        )

    if user.role not in ("ADMIN", "FARMER"):
        return None, (
            jsonify({
                "status": "error",
                "message": "You do not have permission to access this resource.",
            }),
            403,
        )

    if user.role == "FARMER" and not user.farmer_id:
        return None, (
            jsonify({
                "status": "error",
                "message": "Farmer account is not linked to a farmer record.",
            }),
            403,
        )

    return user, None


def validate_positive_id(value, field_label):
    """Validate a positive integer ID supplied in request data."""
    if isinstance(value, bool):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_label} must be a positive integer.",
            }),
            400,
        )

    try:
        parsed_id = int(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_label} must be a positive integer.",
            }),
            400,
        )

    # Reject values such as 1.5 and strings such as "1.5".
    if parsed_id <= 0 or str(value).strip() != str(parsed_id):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_label} must be a positive integer.",
            }),
            400,
        )

    return parsed_id, None


def farmer_can_access_field(user, field):
    """Admins can access all fields; farmers can access only their own."""
    if user.role == "ADMIN":
        return True

    return (
        user.role == "FARMER"
        and user.farmer_id is not None
        and user.farmer_id == field.farmer_id
    )


def field_to_dict(field):
    """Convert a field model to the existing frontend JSON format."""
    return {
        "id": field.id,
        "farmerId": field.farmer_id,
        "fieldName": field.field_name,
        "surveyNumber": field.survey_number,
        "fieldVillageId": field.field_village_id,
        "areaAcres": (
            float(field.area_acres)
            if field.area_acres is not None
            else None
        ),
        "irrigationType": field.irrigation_type,
        "ownershipType": field.ownership_type,
        "createdAt": (
            field.created_at.isoformat()
            if getattr(field, "created_at", None)
            else None
        ),
        "updatedAt": (
            field.updated_at.isoformat()
            if getattr(field, "updated_at", None)
            else None
        ),
    }


# ============================================================
# GET ALL FIELDS
# ADMIN: ALL FIELDS
# FARMER: OWN FIELDS ONLY
# ============================================================

@field_bp.route("/api/fields", methods=["GET"])
def get_fields():
    user, error_response = authentication_error()

    if error_response:
        return error_response

    try:
        query = Field.query

        if user.role == "FARMER":
            query = query.filter_by(farmer_id=user.farmer_id)

        fields = query.all()

        return jsonify([
            field_to_dict(field)
            for field in fields
        ]), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve fields.",
        }), 500


# ============================================================
# GET FIELD BY ID
# ADMIN: ANY FIELD
# FARMER: OWN FIELD ONLY
# ============================================================

@field_bp.route("/api/fields/<int:id>", methods=["GET"])
def get_field(id):
    user, error_response = authentication_error()

    if error_response:
        return error_response

    try:
        field = db.session.get(Field, id)

        if field is None:
            return jsonify({
                "status": "error",
                "message": "Field not found.",
            }), 404

        if not farmer_can_access_field(user, field):
            return jsonify({
                "status": "error",
                "message": "You do not have access to this field.",
            }), 403

        return jsonify(field_to_dict(field)), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve the field.",
        }), 500


# ============================================================
# CREATE FIELD
# ADMIN: ANY FARMER
# FARMER: OWN FARMER RECORD ONLY
# ============================================================

@field_bp.route("/api/fields", methods=["POST"])
def create_field():
    user, error_response = authentication_error()

    if error_response:
        return error_response

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON request body is required.",
        }), 400

    if user.role == "FARMER":
        data["farmerId"] = user.farmer_id

    required_fields = [
        "farmerId",
        "fieldName",
        "fieldVillageId",
        "areaAcres",
        "ownershipType",
    ]

    for field_name in required_fields:
        if field_name not in data or data[field_name] is None:
            return jsonify({
                "status": "error",
                "message": f"{field_name} is required.",
            }), 400

    farmer_id, error_response = validate_positive_id(
        data["farmerId"],
        "farmerId",
    )

    if error_response:
        return error_response

    if user.role == "FARMER" and farmer_id != user.farmer_id:
        return jsonify({
            "status": "error",
            "message": "You can create fields only for your own farmer account.",
        }), 403

    if user.role == "ADMIN" and not can_access_farmer(farmer_id):
        return jsonify({
            "status": "error",
            "message": "Invalid farmer assignment.",
        }), 403

    farmer = db.session.get(Farmer, farmer_id)

    if farmer is None:
        return jsonify({
            "status": "error",
            "message": "Farmer not found.",
        }), 404

    field_name = data["fieldName"]

    if not isinstance(field_name, str) or not field_name.strip():
        return jsonify({
            "status": "error",
            "message": "fieldName must be a non-empty string.",
        }), 400

    ownership_type = data["ownershipType"]

    if ownership_type not in ("OWNED", "LEASED"):
        return jsonify({
            "status": "error",
            "message": "ownershipType must be OWNED or LEASED.",
        }), 400

    village_id, error_response = validate_positive_id(
        data["fieldVillageId"],
        "fieldVillageId",
    )

    if error_response:
        return error_response

    try:
        area_acres = float(data["areaAcres"])

        if not (0 < area_acres < float("inf")):
            raise ValueError

    except (TypeError, ValueError, OverflowError):
        return jsonify({
            "status": "error",
            "message": "areaAcres must be a positive finite number.",
        }), 400

    try:
        field = Field(
            farmer_id=farmer_id,
            field_name=field_name.strip(),
            survey_number=data.get("surveyNumber"),
            field_village_id=village_id,
            area_acres=area_acres,
            irrigation_type=data.get("irrigationType"),
            ownership_type=ownership_type,
        )

        db.session.add(field)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Field created successfully.",
            "field": field_to_dict(field),
        }), 201

    except Exception:
        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": "Unable to create field. Check the supplied data.",
        }), 500


# ============================================================
# UPDATE FIELD
# ADMIN: ANY FIELD
# FARMER: OWN FIELD ONLY
# FARMERS CANNOT TRANSFER FIELD OWNERSHIP
# ============================================================

@field_bp.route("/api/fields/<int:id>", methods=["PUT"])
def update_field(id):
    user, error_response = authentication_error()

    if error_response:
        return error_response

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON request body is required.",
        }), 400

    try:
        field = db.session.get(Field, id)

        if field is None:
            return jsonify({
                "status": "error",
                "message": "Field not found.",
            }), 404

        if not farmer_can_access_field(user, field):
            return jsonify({
                "status": "error",
                "message": "You do not have permission to update this field.",
            }), 403

        # Only admins may change the farmer assigned to a field.
        if "farmerId" in data:
            if user.role != "ADMIN":
                return jsonify({
                    "status": "error",
                    "message": "Farmers cannot transfer fields to another farmer.",
                }), 403

            new_farmer_id, error_response = validate_positive_id(
                data["farmerId"],
                "farmerId",
            )

            if error_response:
                return error_response

            if db.session.get(Farmer, new_farmer_id) is None:
                return jsonify({
                    "status": "error",
                    "message": "Target farmer not found.",
                }), 404

            field.farmer_id = new_farmer_id

        if "fieldName" in data:
            if (
                not isinstance(data["fieldName"], str)
                or not data["fieldName"].strip()
            ):
                return jsonify({
                    "status": "error",
                    "message": "fieldName must be a non-empty string.",
                }), 400

            field.field_name = data["fieldName"].strip()

        if "surveyNumber" in data:
            field.survey_number = data["surveyNumber"]

        if "fieldVillageId" in data:
            village_id, error_response = validate_positive_id(
                data["fieldVillageId"],
                "fieldVillageId",
            )

            if error_response:
                return error_response

            field.field_village_id = village_id

        if "areaAcres" in data:
            try:
                area_acres = float(data["areaAcres"])

                if not (0 < area_acres < float("inf")):
                    raise ValueError

            except (TypeError, ValueError, OverflowError):
                return jsonify({
                    "status": "error",
                    "message": "areaAcres must be a positive finite number.",
                }), 400

            field.area_acres = area_acres

        if "irrigationType" in data:
            field.irrigation_type = data["irrigationType"]

        if "ownershipType" in data:
            if data["ownershipType"] not in ("OWNED", "LEASED"):
                return jsonify({
                    "status": "error",
                    "message": "ownershipType must be OWNED or LEASED.",
                }), 400

            field.ownership_type = data["ownershipType"]

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Field updated successfully.",
            "field": field_to_dict(field),
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": "Unable to update field. Check the supplied data.",
        }), 500


# ============================================================
# DELETE FIELD
# ADMIN: ANY FIELD
# FARMER: OWN FIELD ONLY
# ============================================================

@field_bp.route("/api/fields/<int:id>", methods=["DELETE"])
def delete_field(id):
    user, error_response = authentication_error()

    if error_response:
        return error_response

    try:
        field = db.session.get(Field, id)

        if field is None:
            return jsonify({
                "status": "error",
                "message": "Field not found.",
            }), 404

        if not farmer_can_access_field(user, field):
            return jsonify({
                "status": "error",
                "message": "You do not have permission to delete this field.",
            }), 403

        db.session.delete(field)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Field deleted successfully.",
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": (
                "Unable to delete field. It may have related crop seasons "
                "or other records that must be handled first."
            ),
        }), 500
