from flask import Blueprint, request, jsonify
from datetime import date

from backend.extensions import db
from backend.models.farmer_payment import FarmerPayment


farmer_payment_bp = Blueprint(
    "farmer_payment_bp",
    __name__
)


# ============================================================
# GET ALL FARMER PAYMENTS
# ============================================================

@farmer_payment_bp.route(
    "/api/farmer-payments",
    methods=["GET"]
)
def get_farmer_payments():

    payments = FarmerPayment.query.all()

    return jsonify([
        payment.to_dict()
        for payment in payments
    ])


# ============================================================
# GET SINGLE FARMER PAYMENT
# ============================================================

@farmer_payment_bp.route(
    "/api/farmer-payments/<int:id>",
    methods=["GET"]
)
def get_farmer_payment(id):

    payment = FarmerPayment.query.get(id)

    if not payment:

        return jsonify({
            "error": "Farmer payment not found"
        }), 404

    return jsonify(
        payment.to_dict()
    )


# ============================================================
# CREATE FARMER PAYMENT
# ============================================================

@farmer_payment_bp.route(
    "/api/farmer-payments",
    methods=["POST"]
)
def create_farmer_payment():

    data = request.get_json()

    if not data:

        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmerId",
        "paymentDate",
        "amount",
        "paymentMode"
    ]

    for field in required_fields:

        if field not in data:

            return jsonify({
                "error": f"{field} is required"
            }), 400

    try:

        payment_date = date.fromisoformat(
            data["paymentDate"]
        )

        payment = FarmerPayment(

            farmer_id=data["farmerId"],

            settlement_id=data.get(
                "settlementId"
            ),

            payment_date=payment_date,

            amount=data["amount"],

            payment_mode=data["paymentMode"],

            reference_number=data.get(
                "referenceNumber"
            ),

            notes=data.get(
                "notes"
            )
        )

        db.session.add(payment)

        db.session.commit()

        return jsonify({

            "message":
                "Farmer payment created successfully",

            "payment":
                payment.to_dict()

        }), 201

    except ValueError:

        return jsonify({
            "error":
                "paymentDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE FARMER PAYMENT
# ============================================================

@farmer_payment_bp.route(
    "/api/farmer-payments/<int:id>",
    methods=["PUT"]
)
def update_farmer_payment(id):

    payment = FarmerPayment.query.get(id)

    if not payment:

        return jsonify({
            "error": "Farmer payment not found"
        }), 404

    data = request.get_json()

    if not data:

        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "farmerId" in data:

            payment.farmer_id = data[
                "farmerId"
            ]

        if "settlementId" in data:

            payment.settlement_id = data[
                "settlementId"
            ]

        if "paymentDate" in data:

            payment.payment_date = date.fromisoformat(
                data["paymentDate"]
            )

        if "amount" in data:

            payment.amount = data[
                "amount"
            ]

        if "paymentMode" in data:

            payment.payment_mode = data[
                "paymentMode"
            ]

        if "referenceNumber" in data:

            payment.reference_number = data[
                "referenceNumber"
            ]

        if "notes" in data:

            payment.notes = data[
                "notes"
            ]

        db.session.commit()

        return jsonify({

            "message":
                "Farmer payment updated successfully",

            "payment":
                payment.to_dict()

        })

    except ValueError:

        return jsonify({
            "error":
                "paymentDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE FARMER PAYMENT
# ============================================================

@farmer_payment_bp.route(
    "/api/farmer-payments/<int:id>",
    methods=["DELETE"]
)
def delete_farmer_payment(id):

    payment = FarmerPayment.query.get(id)

    if not payment:

        return jsonify({
            "error": "Farmer payment not found"
        }), 404

    try:

        db.session.delete(payment)

        db.session.commit()

        return jsonify({
            "message":
                "Farmer payment deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500