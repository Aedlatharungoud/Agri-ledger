from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.sale_deduction import SaleDeduction


sale_deduction_bp = Blueprint(
    "sale_deduction_bp",
    __name__
)


# ============================================================
# CONVERT SALE DEDUCTION TO JSON
# ============================================================

def sale_deduction_to_dict(deduction):
    return {
        "id": deduction.id,
        "saleId": deduction.sale_id,
        "deductionType": deduction.deduction_type,

        "amount": (
            float(deduction.amount)
            if deduction.amount is not None
            else None
        ),

        "notes": deduction.notes,

        "createdAt": (
            deduction.created_at.isoformat()
            if deduction.created_at
            else None
        )
    }


# ============================================================
# GET ALL SALE DEDUCTIONS
# ============================================================

@sale_deduction_bp.route(
    "/api/sale-deductions",
    methods=["GET"]
)
def get_sale_deductions():

    deductions = SaleDeduction.query.all()

    return jsonify([
        sale_deduction_to_dict(deduction)
        for deduction in deductions
    ])


# ============================================================
# GET SALE DEDUCTION BY ID
# ============================================================

@sale_deduction_bp.route(
    "/api/sale-deductions/<int:id>",
    methods=["GET"]
)
def get_sale_deduction(id):

    deduction = SaleDeduction.query.get(id)

    if not deduction:
        return jsonify({
            "error": "Sale deduction not found"
        }), 404

    return jsonify(
        sale_deduction_to_dict(deduction)
    )


# ============================================================
# CREATE SALE DEDUCTION
# ============================================================

@sale_deduction_bp.route(
    "/api/sale-deductions",
    methods=["POST"]
)
def create_sale_deduction():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    if "saleId" not in data:
        return jsonify({
            "error": "saleId is required"
        }), 400

    try:

        deduction = SaleDeduction(
            sale_id=data["saleId"],
            deduction_type=data.get("deductionType"),
            amount=data.get("amount"),
            notes=data.get("notes")
        )

        db.session.add(deduction)
        db.session.commit()

        return jsonify({
            "message": "Sale deduction created successfully",
            "saleDeduction": sale_deduction_to_dict(
                deduction
            )
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE SALE DEDUCTION
# ============================================================

@sale_deduction_bp.route(
    "/api/sale-deductions/<int:id>",
    methods=["PUT"]
)
def update_sale_deduction(id):

    deduction = SaleDeduction.query.get(id)

    if not deduction:
        return jsonify({
            "error": "Sale deduction not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "saleId" in data:
            deduction.sale_id = data["saleId"]

        if "deductionType" in data:
            deduction.deduction_type = data[
                "deductionType"
            ]

        if "amount" in data:
            deduction.amount = data["amount"]

        if "notes" in data:
            deduction.notes = data["notes"]

        db.session.commit()

        return jsonify({
            "message": "Sale deduction updated successfully",
            "saleDeduction": sale_deduction_to_dict(
                deduction
            )
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE SALE DEDUCTION
# ============================================================

@sale_deduction_bp.route(
    "/api/sale-deductions/<int:id>",
    methods=["DELETE"]
)
def delete_sale_deduction(id):

    deduction = SaleDeduction.query.get(id)

    if not deduction:
        return jsonify({
            "error": "Sale deduction not found"
        }), 404

    try:

        db.session.delete(deduction)
        db.session.commit()

        return jsonify({
            "message": "Sale deduction deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500