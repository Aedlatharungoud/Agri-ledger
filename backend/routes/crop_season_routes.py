
from datetime import datetime
import math

from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.crop_season import CropSeason
from backend.models.field import Field
from backend.models.farmer import Farmer
from backend.auth_utils import get_current_user


crop_season_bp = Blueprint("crop_season_bp", __name__)


# ============================================================
# AUTHENTICATION AND AUTHORIZATION
# ============================================================

def authenticated_user():
    """Return the current active user or an HTTP error response."""
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


def parse_positive_id(value, field_name):
    """Validate an ID without accepting booleans or fractional numbers."""
    if isinstance(value, bool):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a positive integer.",
            }),
            400,
        )

    try:
        parsed = int(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a positive integer.",
            }),
            400,
        )

    if parsed <= 0 or str(value).strip() != str(parsed):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a positive integer.",
            }),
            400,
        )

    return parsed, None


def get_accessible_field(field_id, user):
    """
    Return a field if it exists and the user may access it.

    Return (field, None) on success or (None, error_response) on failure.
    """
    parsed_id, error = parse_positive_id(field_id, "fieldId")

    if error:
        return None, error

    field = db.session.get(Field, parsed_id)

    if field is None:
        return None, (
            jsonify({
                "status": "error",
                "message": "Field not found.",
            }),
            404,
        )

    if user.role == "ADMIN":
        return field, None

    if user.role == "FARMER" and field.farmer_id == user.farmer_id:
        return field, None

    return None, (
        jsonify({
            "status": "error",
            "message": "You can access crop seasons only for your own fields.",
        }),
        403,
    )


def crop_season_to_dict(crop_season):
    """Keep the existing frontend JSON property names."""
    return {
        "id": crop_season.id,
        "fieldId": crop_season.field_id,
        "season": crop_season.season,
        "cropName": crop_season.crop_name,
        "year": crop_season.year,
        "sowingDate": (
            crop_season.sowing_date.isoformat()
            if crop_season.sowing_date
            else None
        ),
        "expectedHarvestDate": (
            crop_season.expected_harvest_date.isoformat()
            if crop_season.expected_harvest_date
            else None
        ),
        "status": crop_season.status,
        "createdAt": (
            crop_season.created_at.isoformat()
            if getattr(crop_season, "created_at", None)
            else None
        ),
        "updatedAt": (
            crop_season.updated_at.isoformat()
            if getattr(crop_season, "updated_at", None)
            else None
        ),
    }


def parse_date(value, field_name):
    """Parse an optional ISO date (YYYY-MM-DD)."""
    if value is None or value == "":
        return None

    if not isinstance(value, str):
        raise ValueError(f"{field_name} must use YYYY-MM-DD format.")

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(
            f"{field_name} must use YYYY-MM-DD format."
        ) from exc


def validate_crop_data(data, partial=False):
    """Validate supported crop-season fields before writing to the database."""
    allowed_fields = {
        "fieldId",
        "season",
        "cropName",
        "year",
        "sowingDate",
        "expectedHarvestDate",
        "status",
    }

    unknown_fields = set(data.keys()) - allowed_fields
    if unknown_fields:
        return None, (
            jsonify({
                "status": "error",
                "message": (
                    "Unsupported field(s): "
                    + ", ".join(sorted(unknown_fields))
                ),
            }),
            400,
        )

    required_fields = ("fieldId", "season", "cropName", "year", "status")

    if not partial:
        missing = [
            key for key in required_fields
            if key not in data or data[key] is None
        ]
        if missing:
            return None, (
                jsonify({
                    "status": "error",
                    "message": "Missing required field(s): " + ", ".join(missing),
                }),
                400,
            )

    cleaned = {}

    if "season" in data:
        if not isinstance(data["season"], str) or not data["season"].strip():
            return None, (
                jsonify({
                    "status": "error",
                    "message": "season must be a non-empty string.",
                }),
                400,
            )
        cleaned["season"] = data["season"].strip()

    if "cropName" in data:
        if not isinstance(data["cropName"], str) or not data["cropName"].strip():
            return None, (
                jsonify({
                    "status": "error",
                    "message": "cropName must be a non-empty string.",
                }),
                400,
            )
        cleaned["crop_name"] = data["cropName"].strip()

    if "year" in data:
        year, error = parse_positive_id(data["year"], "year")
        if error:
            return None, error
        if year < 1900 or year > 2200:
            return None, (
                jsonify({
                    "status": "error",
                    "message": "year must be between 1900 and 2200.",
                }),
                400,
            )
        cleaned["year"] = year

    if "status" in data:
        if not isinstance(data["status"], str) or not data["status"].strip():
            return None, (
                jsonify({
                    "status": "error",
                    "message": "status must be a non-empty string.",
                }),
                400,
            )
        cleaned["status"] = data["status"].strip()

    for request_key, model_key in (
        ("sowingDate", "sowing_date"),
        ("expectedHarvestDate", "expected_harvest_date"),
    ):
        if request_key in data:
            try:
                cleaned[model_key] = parse_date(data[request_key], request_key)
            except ValueError as exc:
                return None, (
                    jsonify({
                        "status": "error",
                        "message": str(exc),
                    }),
                    400,
                )

    if "fieldId" in data:
        field_id, error = parse_positive_id(data["fieldId"], "fieldId")
        if error:
            return None, error
        cleaned["field_id"] = field_id

    return cleaned, None


# ============================================================
# GET ALL CROP SEASONS
# ADMIN: ALL
# FARMER: OWN FIELDS ONLY
# ============================================================

@crop_season_bp.route("/api/crop-seasons", methods=["GET"])
def get_crop_seasons():
    user, error = authenticated_user()
    if error:
        return error

    try:
        query = CropSeason.query

        if user.role == "FARMER":
            query = (
                query.join(Field, CropSeason.field_id == Field.id)
                .filter(Field.farmer_id == user.farmer_id)
            )

        seasons = query.all()

        return jsonify([
            crop_season_to_dict(item)
            for item in seasons
        ]), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve crop seasons.",
        }), 500


# ============================================================
# GET CROP SEASON BY ID
# ============================================================

@crop_season_bp.route("/api/crop-seasons/<int:id>", methods=["GET"])
def get_crop_season(id):
    user, error = authenticated_user()
    if error:
        return error

    try:
        crop_season = db.session.get(CropSeason, id)

        if crop_season is None:
            return jsonify({
                "status": "error",
                "message": "Crop season not found.",
            }), 404

        _, access_error = get_accessible_field(crop_season.field_id, user)
        if access_error:
            return access_error

        return jsonify(crop_season_to_dict(crop_season)), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve the crop season.",
        }), 500


# ============================================================
# CREATE CROP SEASON
# ADMIN: ANY FIELD
# FARMER: OWN FIELDS ONLY
# ============================================================

@crop_season_bp.route("/api/crop-seasons", methods=["POST"])
def create_crop_season():
    user, error = authenticated_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON request body is required.",
        }), 400

    cleaned, error = validate_crop_data(data)
    if error:
        return error

    field, error = get_accessible_field(cleaned["field_id"], user)
    if error:
        return error

    try:
        crop_season = CropSeason(
            field_id=field.id,
            season=cleaned["season"],
            crop_name=cleaned["crop_name"],
            year=cleaned["year"],
            sowing_date=cleaned.get("sowing_date"),
            expected_harvest_date=cleaned.get("expected_harvest_date"),
            status=cleaned["status"],
        )

        db.session.add(crop_season)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Crop season created successfully.",
            "cropSeason": crop_season_to_dict(crop_season),
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to create crop season. Check the supplied data.",
        }), 500


# ============================================================
# UPDATE CROP SEASON
# ADMIN: ANY SEASON
# FARMER: SEASONS ON OWN FIELDS ONLY
# ============================================================

@crop_season_bp.route("/api/crop-seasons/<int:id>", methods=["PUT"])
def update_crop_season(id):
    user, error = authenticated_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            "status": "error",
            "message": "A non-empty JSON request body is required.",
        }), 400

    cleaned, error = validate_crop_data(data, partial=True)
    if error:
        return error

    try:
        crop_season = db.session.get(CropSeason, id)

        if crop_season is None:
            return jsonify({
                "status": "error",
                "message": "Crop season not found.",
            }), 404

        _, access_error = get_accessible_field(crop_season.field_id, user)
        if access_error:
            return access_error

        # A farmer may move a season only to another field they own.
        # An admin may move it to any existing field.
        if "field_id" in cleaned:
            new_field, access_error = get_accessible_field(
                cleaned["field_id"], user
            )
            if access_error:
                return access_error
            crop_season.field_id = new_field.id

        for key in (
            "season",
            "crop_name",
            "year",
            "sowing_date",
            "expected_harvest_date",
            "status",
        ):
            if key in cleaned:
                setattr(crop_season, key, cleaned[key])

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Crop season updated successfully.",
            "cropSeason": crop_season_to_dict(crop_season),
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to update crop season. Check the supplied data.",
        }), 500


# ============================================================
# DELETE CROP SEASON
# ADMIN: ANY SEASON
# FARMER: OWN FIELDS ONLY
# ============================================================

@crop_season_bp.route("/api/crop-seasons/<int:id>", methods=["DELETE"])
def delete_crop_season(id):
    user, error = authenticated_user()
    if error:
        return error

    try:
        crop_season = db.session.get(CropSeason, id)

        if crop_season is None:
            return jsonify({
                "status": "error",
                "message": "Crop season not found.",
            }), 404

        _, access_error = get_accessible_field(crop_season.field_id, user)
        if access_error:
            return access_error

        db.session.delete(crop_season)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Crop season deleted successfully.",
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": (
                "Unable to delete crop season. Check whether related records "
                "must be handled first."
            ),
        }), 500
