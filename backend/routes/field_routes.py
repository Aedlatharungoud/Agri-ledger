from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.field import Field


field_bp = Blueprint(
    "field_bp",
    __name__
)


# ============================================================
# CONVERT FIELD TO JSON
# ============================================================

def field_to_dict(field):
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
            if field.created_at
            else None
        ),

        "updatedAt": (
            field.updated_at.isoformat()
            if field.updated_at
            else None
        )
    }


# ============================================================
# GET ALL FIELDS
# ============================================================

@field_bp.route(
    "/api/fields",
    methods=["GET"]
)
def get_fields():

    fields = Field.query.all()

    return jsonify([
        field_to_dict(field)
        for field in fields
    ])


# ============================================================
# GET FIELD BY ID
# ============================================================

@field_bp.route(
    "/api/fields/<int:id>",
    methods=["GET"]
)
def get_field(id):

    field = Field.query.get(id)

    if not field:
        return jsonify({
            "error": "Field not found"
        }), 404

    return jsonify(
        field_to_dict(field)
    )


# ============================================================
# CREATE FIELD
# ============================================================

@field_bp.route(
    "/api/fields",
    methods=["POST"]
)
def create_field():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmerId",
        "fieldName",
        "fieldVillageId",
        "areaAcres",
        "ownershipType"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    if data["ownershipType"] not in [
        "OWNED",
        "LEASED"
    ]:
        return jsonify({
            "error": "ownershipType must be OWNED or LEASED"
        }), 400

    try:

        field = Field(
            farmer_id=data["farmerId"],
            field_name=data["fieldName"],
            survey_number=data.get("surveyNumber"),
            field_village_id=data["fieldVillageId"],
            area_acres=data["areaAcres"],
            irrigation_type=data.get("irrigationType"),
            ownership_type=data["ownershipType"]
        )

        db.session.add(field)
        db.session.commit()

        return jsonify({
            "message": "Field created successfully",
            "field": field_to_dict(field)
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE FIELD
# ============================================================

@field_bp.route(
    "/api/fields/<int:id>",
    methods=["PUT"]
)
def update_field(id):

    field = Field.query.get(id)

    if not field:
        return jsonify({
            "error": "Field not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    if (
        "ownershipType" in data
        and data["ownershipType"] not in [
            "OWNED",
            "LEASED"
        ]
    ):
        return jsonify({
            "error": "ownershipType must be OWNED or LEASED"
        }), 400

    try:

        if "farmerId" in data:
            field.farmer_id = data["farmerId"]

        if "fieldName" in data:
            field.field_name = data["fieldName"]

        if "surveyNumber" in data:
            field.survey_number = data["surveyNumber"]

        if "fieldVillageId" in data:
            field.field_village_id = data["fieldVillageId"]

        if "areaAcres" in data:
            field.area_acres = data["areaAcres"]

        if "irrigationType" in data:
            field.irrigation_type = data["irrigationType"]

        if "ownershipType" in data:
            field.ownership_type = data["ownershipType"]

        db.session.commit()

        return jsonify({
            "message": "Field updated successfully",
            "field": field_to_dict(field)
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE FIELD
# ============================================================

@field_bp.route(
    "/api/fields/<int:id>",
    methods=["DELETE"]
)
def delete_field(id):

    field = Field.query.get(id)

    if not field:
        return jsonify({
            "error": "Field not found"
        }), 404

    try:

        db.session.delete(field)
        db.session.commit()

        return jsonify({
            "message": "Field deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500