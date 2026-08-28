from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.crop_season import CropSeason
from datetime import datetime


crop_season_bp = Blueprint(
    "crop_season_bp",
    __name__
)


# ============================================================
# CONVERT CROP SEASON TO JSON
# ============================================================

def crop_season_to_dict(crop_season):
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
            if crop_season.created_at
            else None
        ),

        "updatedAt": (
            crop_season.updated_at.isoformat()
            if crop_season.updated_at
            else None
        )
    }


# ============================================================
# GET ALL CROP SEASONS
# ============================================================

@crop_season_bp.route(
    "/api/crop-seasons",
    methods=["GET"]
)
def get_crop_seasons():

    crop_seasons = CropSeason.query.all()

    return jsonify([
        crop_season_to_dict(crop_season)
        for crop_season in crop_seasons
    ])


# ============================================================
# GET CROP SEASON BY ID
# ============================================================

@crop_season_bp.route(
    "/api/crop-seasons/<int:id>",
    methods=["GET"]
)
def get_crop_season(id):

    crop_season = CropSeason.query.get(id)

    if not crop_season:
        return jsonify({
            "error": "Crop season not found"
        }), 404

    return jsonify(
        crop_season_to_dict(crop_season)
    )


# ============================================================
# CREATE CROP SEASON
# ============================================================

@crop_season_bp.route(
    "/api/crop-seasons",
    methods=["POST"]
)
def create_crop_season():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "fieldId",
        "season",
        "cropName",
        "year",
        "status"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    try:

        sowing_date = None
        expected_harvest_date = None

        if data.get("sowingDate"):

            sowing_date = datetime.strptime(
                data["sowingDate"],
                "%Y-%m-%d"
            ).date()

        if data.get("expectedHarvestDate"):

            expected_harvest_date = datetime.strptime(
                data["expectedHarvestDate"],
                "%Y-%m-%d"
            ).date()

        crop_season = CropSeason(
            field_id=data["fieldId"],
            season=data["season"],
            crop_name=data["cropName"],
            year=data["year"],
            sowing_date=sowing_date,
            expected_harvest_date=expected_harvest_date,
            status=data["status"]
        )

        db.session.add(crop_season)
        db.session.commit()

        return jsonify({
            "message": "Crop season created successfully",
            "cropSeason": crop_season_to_dict(
                crop_season
            )
        }), 201

    except ValueError:

        return jsonify({
            "error": "Dates must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE CROP SEASON
# ============================================================

@crop_season_bp.route(
    "/api/crop-seasons/<int:id>",
    methods=["PUT"]
)
def update_crop_season(id):

    crop_season = CropSeason.query.get(id)

    if not crop_season:
        return jsonify({
            "error": "Crop season not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "fieldId" in data:
            crop_season.field_id = data["fieldId"]

        if "season" in data:
            crop_season.season = data["season"]

        if "cropName" in data:
            crop_season.crop_name = data["cropName"]

        if "year" in data:
            crop_season.year = data["year"]

        if "sowingDate" in data:

            crop_season.sowing_date = (
                datetime.strptime(
                    data["sowingDate"],
                    "%Y-%m-%d"
                ).date()
                if data["sowingDate"]
                else None
            )

        if "expectedHarvestDate" in data:

            crop_season.expected_harvest_date = (
                datetime.strptime(
                    data["expectedHarvestDate"],
                    "%Y-%m-%d"
                ).date()
                if data["expectedHarvestDate"]
                else None
            )

        if "status" in data:
            crop_season.status = data["status"]

        db.session.commit()

        return jsonify({
            "message": "Crop season updated successfully",
            "cropSeason": crop_season_to_dict(
                crop_season
            )
        })

    except ValueError:

        return jsonify({
            "error": "Dates must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE CROP SEASON
# ============================================================

@crop_season_bp.route(
    "/api/crop-seasons/<int:id>",
    methods=["DELETE"]
)
def delete_crop_season(id):

    crop_season = CropSeason.query.get(id)

    if not crop_season:
        return jsonify({
            "error": "Crop season not found"
        }), 404

    try:

        db.session.delete(crop_season)
        db.session.commit()

        return jsonify({
            "message": "Crop season deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500