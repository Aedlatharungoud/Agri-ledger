from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.farmer import Farmer


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
        "bankAccountName": farmer.bank_account_name,
        "bankAccountNumber": farmer.bank_account_number,
        "bankIfsc": farmer.bank_ifsc,
        "bankName": farmer.bank_name,
        "status": farmer.status,
        "createdAt": (
            farmer.created_at.isoformat()
            if farmer.created_at
            else None
        ),
        "updatedAt": (
            farmer.updated_at.isoformat()
            if farmer.updated_at
            else None
        )
    }


# ============================================================
# GET ALL FARMERS
# ============================================================

@farmer_bp.route(
    "/api/farmers",
    methods=["GET"]
)
def get_farmers():

    farmers = Farmer.query.all()

    result = []

    for farmer in farmers:
        result.append(
            farmer_to_dict(farmer)
        )

    return jsonify(result)


# ============================================================
# GET FARMER BY ID
# ============================================================

@farmer_bp.route(
    "/api/farmers/<int:id>",
    methods=["GET"]
)
def get_farmer(id):

    farmer = Farmer.query.get(id)

    if not farmer:
        return jsonify({
            "error": "Farmer not found"
        }), 404

    return jsonify(
        farmer_to_dict(farmer)
    )


# ============================================================
# CREATE FARMER
# ============================================================

@farmer_bp.route(
    "/api/farmers",
    methods=["POST"]
)
def create_farmer():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmerCode",
        "name",
        "villageId"
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

        farmer = Farmer(
            farmer_code=data["farmerCode"],
            name=data["name"],
            phone=data.get("phone"),
            village_id=data["villageId"],
            bank_account_name=data.get(
                "bankAccountName"
            ),
            bank_account_number=data.get(
                "bankAccountNumber"
            ),
            bank_ifsc=data.get(
                "bankIfsc"
            ),
            bank_name=data.get(
                "bankName"
            ),
            status=data.get(
                "status",
                "ACTIVE"
            )
        )

        db.session.add(farmer)
        db.session.commit()

        return jsonify({
            "message": "Farmer created successfully",
            "farmer": farmer_to_dict(farmer)
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE FARMER
# ============================================================

@farmer_bp.route(
    "/api/farmers/<int:id>",
    methods=["PUT"]
)
def update_farmer(id):

    farmer = Farmer.query.get(id)

    if not farmer:
        return jsonify({
            "error": "Farmer not found"
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

        if "farmerCode" in data:
            farmer.farmer_code = data["farmerCode"]

        if "name" in data:
            farmer.name = data["name"]

        if "phone" in data:
            farmer.phone = data["phone"]

        if "villageId" in data:
            farmer.village_id = data["villageId"]

        if "bankAccountName" in data:
            farmer.bank_account_name = (
                data["bankAccountName"]
            )

        if "bankAccountNumber" in data:
            farmer.bank_account_number = (
                data["bankAccountNumber"]
            )

        if "bankIfsc" in data:
            farmer.bank_ifsc = data["bankIfsc"]

        if "bankName" in data:
            farmer.bank_name = data["bankName"]

        if "status" in data:
            farmer.status = data["status"]

        db.session.commit()

        return jsonify({
            "message": "Farmer updated successfully",
            "farmer": farmer_to_dict(farmer)
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE FARMER
# ============================================================

@farmer_bp.route(
    "/api/farmers/<int:id>",
    methods=["DELETE"]
)
def delete_farmer(id):

    farmer = Farmer.query.get(id)

    if not farmer:
        return jsonify({
            "error": "Farmer not found"
        }), 404

    try:

        db.session.delete(farmer)
        db.session.commit()

        return jsonify({
            "message": "Farmer deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500