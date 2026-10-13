from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.farmer import Farmer

from backend.auth_utils import (
    admin_required,
    get_current_user,
    can_access_farmer
)


# ============================================================
# FARMER BLUEPRINT
# ============================================================

farmer_bp = Blueprint(
    "farmer_bp",
    __name__
)


# ============================================================
# CONVERT FARMER TO JSON
# ============================================================

def farmer_to_dict(farmer):

    return {
        "id": farmer.id,

        "farmerCode": farmer.farmer_code,

        "name": farmer.name,

        "phone": farmer.phone,

        "villageId": farmer.village_id,

        "bankName": farmer.bank_name,

        "status": farmer.status,

        "createdAt": (
            farmer.created_at.isoformat()
            if getattr(farmer, "created_at", None)
            else None
        ),

        "updatedAt": (
            farmer.updated_at.isoformat()
            if getattr(farmer, "updated_at", None)
            else None
        )
    }


# ============================================================
# GET ALL FARMERS
# ============================================================
#
# ADMIN:
#   Can see all farmers.
#
# FARMER:
#   Cannot access the complete farmer list.
#
# ============================================================

@farmer_bp.route(
    "/api/farmers",
    methods=["GET"]
)
@admin_required
def get_farmers():

    try:

        farmers = Farmer.query.all()

        return jsonify([
            farmer_to_dict(farmer)
            for farmer in farmers
        ]), 200

    except Exception:

        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred. Please try again."
        }), 500


# ============================================================
# GET FARMER BY ID
# ============================================================
#
# ADMIN:
#   Can access any farmer.
#
# FARMER:
#   Can access only their own farmer record.
#
# ============================================================

@farmer_bp.route(
    "/api/farmers/<int:id>",
    methods=["GET"]
)
def get_farmer(id):

    try:

        user = get_current_user()

        if not user:

            return jsonify({
                "status": "error",
                "message": "Authentication required."
            }), 401

        farmer = Farmer.query.get(id)

        if not farmer:

            return jsonify({
                "status": "error",
                "message": "Farmer not found."
            }), 404

        if not can_access_farmer(farmer.id):

            return jsonify({
                "status": "error",
                "message": (
                    "You can only access your own farmer record."
                )
            }), 403

        return jsonify(
            farmer_to_dict(farmer)
        ), 200

    except Exception:

        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred. Please try again."
        }), 500


# ============================================================
# CREATE FARMER
# ============================================================
#
# Only ADMIN can create farmer records.
#
# ============================================================

@farmer_bp.route(
    "/api/farmers",
    methods=["POST"]
)
@admin_required
def create_farmer():

    data = request.get_json()

    if not data:

        return jsonify({
            "status": "error",
            "message": "Request body is required."
        }), 400

    try:

        # ----------------------------------------------------
        # REQUIRED FIELDS
        # ----------------------------------------------------

        required_fields = [
            "farmerCode",
            "name"
        ]

        for field_name in required_fields:

            if field_name not in data:

                return jsonify({
                    "status": "error",
                    "message": (
                        f"{field_name} is required."
                    )
                }), 400

        # ----------------------------------------------------
        # CHECK DUPLICATE FARMER CODE
        # ----------------------------------------------------

        existing_farmer = Farmer.query.filter_by(
            farmer_code=data["farmerCode"]
        ).first()

        if existing_farmer:

            return jsonify({
                "status": "error",
                "message": (
                    "Farmer code already exists."
                )
            }), 409

        # ----------------------------------------------------
        # CREATE FARMER
        # ----------------------------------------------------

        farmer = Farmer(

            farmer_code=data["farmerCode"],

            name=data["name"],

            phone=data.get("phone"),

            village_id=data.get("villageId"),

            bank_name=data.get("bankName"),

            status=data.get(
                "status",
                "ACTIVE"
            )
        )

        # ----------------------------------------------------
        # SAVE
        # ----------------------------------------------------

        db.session.add(farmer)

        db.session.commit()

        return jsonify({

            "status": "success",

            "message":
                "Farmer created successfully.",

            "farmer":
                farmer_to_dict(farmer)

        }), 201

    except Exception:

        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred. Please try again."
        }), 500


# ============================================================
# UPDATE FARMER
# ============================================================
#
# ADMIN:
#   Can update any farmer.
#
# FARMER:
#   Can update only their own farmer record.
#
# FARMER USERS CANNOT:
#   - Change farmerCode
#   - Change status
#
# ============================================================

@farmer_bp.route(
    "/api/farmers/<int:id>",
    methods=["PUT"]
)
def update_farmer(id):

    try:

        user = get_current_user()

        if not user:

            return jsonify({
                "status": "error",
                "message": "Authentication required."
            }), 401

        farmer = Farmer.query.get(id)

        if not farmer:

            return jsonify({
                "status": "error",
                "message": "Farmer not found."
            }), 404

        # ----------------------------------------------------
        # OWNERSHIP CHECK
        # ----------------------------------------------------

        if not can_access_farmer(farmer.id):

            return jsonify({
                "status": "error",
                "message": (
                    "You can only update your own farmer record."
                )
            }), 403

        data = request.get_json()

        if not data:

            return jsonify({
                "status": "error",
                "message": "Request body is required."
            }), 400

        # ====================================================
        # ADMIN UPDATE
        # ====================================================

        if user.role == "ADMIN":

            # ------------------------------------------------
            # FARMER CODE
            # ------------------------------------------------

            if "farmerCode" in data:

                new_farmer_code = data["farmerCode"]

                duplicate = Farmer.query.filter(
                    Farmer.farmer_code == new_farmer_code,
                    Farmer.id != farmer.id
                ).first()

                if duplicate:

                    return jsonify({
                        "status": "error",
                        "message": (
                            "Farmer code already exists."
                        )
                    }), 409

                farmer.farmer_code = new_farmer_code

            # ------------------------------------------------
            # STATUS
            # ------------------------------------------------

            if "status" in data:

                farmer.status = data["status"]

        # ====================================================
        # FARMER UPDATE
        # ====================================================

        else:

            # ------------------------------------------------
            # FARMER CANNOT CHANGE FARMER CODE
            # ------------------------------------------------

            if "farmerCode" in data:

                return jsonify({
                    "status": "error",
                    "message": (
                        "Farmer accounts cannot change "
                        "their farmer code."
                    )
                }), 403

            # ------------------------------------------------
            # FARMER CANNOT CHANGE STATUS
            # ------------------------------------------------

            if "status" in data:

                return jsonify({
                    "status": "error",
                    "message": (
                        "Farmer accounts cannot change "
                        "farmer status."
                    )
                }), 403

        # ====================================================
        # COMMON FIELDS
        # ====================================================

        if "name" in data:

            farmer.name = data["name"]

        if "phone" in data:

            farmer.phone = data["phone"]

        if "villageId" in data:

            farmer.village_id = data["villageId"]

        if "bankName" in data:

            farmer.bank_name = data["bankName"]

        # ====================================================
        # SAVE
        # ====================================================

        db.session.commit()

        return jsonify({

            "status": "success",

            "message":
                "Farmer updated successfully.",

            "farmer":
                farmer_to_dict(farmer)

        }), 200

    except Exception:

        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred. Please try again."
        }), 500


# ============================================================
# DELETE FARMER
# ============================================================
#
# Only ADMIN can delete farmer records.
#
# ============================================================

@farmer_bp.route(
    "/api/farmers/<int:id>",
    methods=["DELETE"]
)
@admin_required
def delete_farmer(id):

    try:

        farmer = Farmer.query.get(id)

        if not farmer:

            return jsonify({
                "status": "error",
                "message": "Farmer not found."
            }), 404

        db.session.delete(farmer)

        db.session.commit()

        return jsonify({

            "status": "success",

            "message":
                "Farmer deleted successfully."

        }), 200

    except Exception:

        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred. Please try again."
        }), 500