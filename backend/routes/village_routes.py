from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.village import Village
from backend.auth_utils import admin_required


village_bp = Blueprint(
    "village_bp",
    __name__
)


# ============================================================
# CONVERT VILLAGE TO JSON
# ============================================================

def village_to_dict(village):
    return {
        "id": village.id,
        "name": village.name,
        "mandal": village.mandal,
        "district": village.district,
        "state": village.state,
        "pincode": village.pincode,
        "status": village.status,

        "createdAt": (
            village.created_at.isoformat()
            if village.created_at
            else None
        ),

        "updatedAt": (
            village.updated_at.isoformat()
            if village.updated_at
            else None
        )
    }


# ============================================================
# GET ALL VILLAGES
# ============================================================

@village_bp.route(
    "/api/villages",
    methods=["GET"]
)
def get_villages():

    villages = Village.query.all()

    return jsonify([
        village_to_dict(village)
        for village in villages
    ])


# ============================================================
# GET VILLAGE BY ID
# ============================================================

@village_bp.route(
    "/api/villages/<int:id>",
    methods=["GET"]
)
def get_village(id):

    village = Village.query.get(id)

    if not village:
        return jsonify({
            "error": "Village not found"
        }), 404

    return jsonify(
        village_to_dict(village)
    )


# ============================================================
# CREATE VILLAGE
# ============================================================

@village_bp.route(
    "/api/villages",
    methods=["POST"]
)
@admin_required
def create_village():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "name",
        "mandal",
        "district",
        "state",
        "pincode"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    if data.get("status") is not None:

        if data["status"] not in [
            "ACTIVE",
            "INACTIVE"
        ]:
            return jsonify({
                "error": "status must be ACTIVE or INACTIVE"
            }), 400

    try:

        village = Village(
            name=data["name"],
            mandal=data["mandal"],
            district=data["district"],
            state=data["state"],
            pincode=data["pincode"],
            status=data.get(
                "status",
                "ACTIVE"
            )
        )

        db.session.add(village)
        db.session.commit()

        return jsonify({
            "message": "Village created successfully",
            "village": village_to_dict(village)
        }), 201

    except Exception:

        db.session.rollback()

        return jsonify({
            "error": "Unable to create village. Check the supplied data."
        }), 500


# ============================================================
# UPDATE VILLAGE
# ============================================================

@village_bp.route(
    "/api/villages/<int:id>",
    methods=["PUT"]
)
@admin_required
def update_village(id):

    village = Village.query.get(id)

    if not village:
        return jsonify({
            "error": "Village not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    if (
        "status" in data
        and data["status"] not in [
            "ACTIVE",
            "INACTIVE"
        ]
    ):
        return jsonify({
            "error": "status must be ACTIVE or INACTIVE"
        }), 400

    try:

        if "name" in data:
            village.name = data["name"]

        if "mandal" in data:
            village.mandal = data["mandal"]

        if "district" in data:
            village.district = data["district"]

        if "state" in data:
            village.state = data["state"]

        if "pincode" in data:
            village.pincode = data["pincode"]

        if "status" in data:
            village.status = data["status"]

        db.session.commit()

        return jsonify({
            "message": "Village updated successfully",
            "village": village_to_dict(village)
        })

    except Exception:

        db.session.rollback()

        return jsonify({
            "error": "Unable to update village. Check the supplied data."
        }), 500


# ============================================================
# DELETE VILLAGE
# ============================================================

@village_bp.route(
    "/api/villages/<int:id>",
    methods=["DELETE"]
)
@admin_required
def delete_village(id):

    village = Village.query.get(id)

    if not village:
        return jsonify({
            "error": "Village not found"
        }), 404

    try:

        db.session.delete(village)
        db.session.commit()

        return jsonify({
            "message": "Village deleted successfully"
        })

    except Exception:

        db.session.rollback()

        return jsonify({
            "error": "Unable to delete village. It may have related records."
        }), 500