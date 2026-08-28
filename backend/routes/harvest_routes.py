from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.harvest import Harvest
from datetime import datetime


harvest_bp = Blueprint(
    "harvest_bp",
    __name__
)


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
            if harvest.harvest_date
            else None
        ),

        "cropName": harvest.crop_name,

        "quantity": (
            float(harvest.quantity)
            if harvest.quantity is not None
            else None
        ),

        "unit": harvest.unit,
        "qualityGrade": harvest.quality_grade,
        "lotNumber": harvest.lot_number,
        "notes": harvest.notes,

        "createdAt": (
            harvest.created_at.isoformat()
            if harvest.created_at
            else None
        )
    }


# ============================================================
# GET ALL HARVESTS
# ============================================================

@harvest_bp.route(
    "/api/harvests",
    methods=["GET"]
)
def get_harvests():

    harvests = Harvest.query.all()

    return jsonify([
        harvest_to_dict(harvest)
        for harvest in harvests
    ])


# ============================================================
# GET HARVEST BY ID
# ============================================================

@harvest_bp.route(
    "/api/harvests/<int:id>",
    methods=["GET"]
)
def get_harvest(id):

    harvest = Harvest.query.get(id)

    if not harvest:
        return jsonify({
            "error": "Harvest not found"
        }), 404

    return jsonify(
        harvest_to_dict(harvest)
    )


# ============================================================
# CREATE HARVEST
# ============================================================

@harvest_bp.route(
    "/api/harvests",
    methods=["POST"]
)
def create_harvest():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmerId",
        "fieldId",
        "cropSeasonId",
        "harvestDate",
        "cropName",
        "quantity"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    try:

        harvest_date = datetime.strptime(
            data["harvestDate"],
            "%Y-%m-%d"
        ).date()

        harvest = Harvest(
            farmer_id=data["farmerId"],
            field_id=data["fieldId"],
            crop_season_id=data["cropSeasonId"],
            harvest_date=harvest_date,
            crop_name=data["cropName"],
            quantity=data["quantity"],
            unit=data.get("unit", "KG"),
            quality_grade=data.get("qualityGrade"),
            lot_number=data.get("lotNumber"),
            notes=data.get("notes")
        )

        db.session.add(harvest)
        db.session.commit()

        return jsonify({
            "message": "Harvest created successfully",
            "harvest": harvest_to_dict(harvest)
        }), 201

    except ValueError:

        return jsonify({
            "error": "harvestDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE HARVEST
# ============================================================

@harvest_bp.route(
    "/api/harvests/<int:id>",
    methods=["PUT"]
)
def update_harvest(id):

    harvest = Harvest.query.get(id)

    if not harvest:
        return jsonify({
            "error": "Harvest not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "farmerId" in data:
            harvest.farmer_id = data["farmerId"]

        if "fieldId" in data:
            harvest.field_id = data["fieldId"]

        if "cropSeasonId" in data:
            harvest.crop_season_id = data["cropSeasonId"]

        if "harvestDate" in data:

            harvest.harvest_date = datetime.strptime(
                data["harvestDate"],
                "%Y-%m-%d"
            ).date()

        if "cropName" in data:
            harvest.crop_name = data["cropName"]

        if "quantity" in data:
            harvest.quantity = data["quantity"]

        if "unit" in data:
            harvest.unit = data["unit"]

        if "qualityGrade" in data:
            harvest.quality_grade = data["qualityGrade"]

        if "lotNumber" in data:
            harvest.lot_number = data["lotNumber"]

        if "notes" in data:
            harvest.notes = data["notes"]

        db.session.commit()

        return jsonify({
            "message": "Harvest updated successfully",
            "harvest": harvest_to_dict(harvest)
        })

    except ValueError:

        return jsonify({
            "error": "harvestDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE HARVEST
# ============================================================

@harvest_bp.route(
    "/api/harvests/<int:id>",
    methods=["DELETE"]
)
def delete_harvest(id):

    harvest = Harvest.query.get(id)

    if not harvest:
        return jsonify({
            "error": "Harvest not found"
        }), 404

    try:

        db.session.delete(harvest)
        db.session.commit()

        return jsonify({
            "message": "Harvest deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500