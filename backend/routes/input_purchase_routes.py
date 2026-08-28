from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.input_purchase import InputPurchase


input_purchase_bp = Blueprint(
    "input_purchase_bp",
    __name__
)


# ============================================================
# CONVERT INPUT PURCHASE TO JSON
# ============================================================

def input_purchase_to_dict(purchase):
    return {
        "id": purchase.id,
        "farmerId": purchase.farmer_id,
        "cropSeasonId": purchase.crop_season_id,
        "productId": purchase.product_id,

        "purchaseDate": purchase.purchase_date,

        "quantity": (
            float(purchase.quantity)
            if purchase.quantity is not None
            else None
        ),

        "unitPrice": (
            float(purchase.unit_price)
            if purchase.unit_price is not None
            else None
        ),

        "supplierName": purchase.supplier_name,
        "paymentType": purchase.payment_type,

        "paidAmount": (
            float(purchase.paid_amount)
            if purchase.paid_amount is not None
            else None
        ),

        "notes": purchase.notes,

        "createdAt": (
            purchase.created_at.isoformat()
            if purchase.created_at
            else None
        )
    }


# ============================================================
# GET ALL INPUT PURCHASES
# ============================================================

@input_purchase_bp.route(
    "/api/input-purchases",
    methods=["GET"]
)
def get_input_purchases():

    purchases = InputPurchase.query.all()

    return jsonify([
        input_purchase_to_dict(purchase)
        for purchase in purchases
    ])


# ============================================================
# GET INPUT PURCHASE BY ID
# ============================================================

@input_purchase_bp.route(
    "/api/input-purchases/<int:id>",
    methods=["GET"]
)
def get_input_purchase(id):

    purchase = InputPurchase.query.get(id)

    if not purchase:
        return jsonify({
            "error": "Input purchase not found"
        }), 404

    return jsonify(
        input_purchase_to_dict(purchase)
    )


# ============================================================
# CREATE INPUT PURCHASE
# ============================================================

@input_purchase_bp.route(
    "/api/input-purchases",
    methods=["POST"]
)
def create_input_purchase():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmerId",
        "cropSeasonId",
        "productId",
        "purchaseDate",
        "quantity",
        "unitPrice"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    if data.get("paymentType") is not None:

        if data["paymentType"] not in [
            "CASH",
            "CREDIT",
            "PARTIAL"
        ]:
            return jsonify({
                "error": (
                    "paymentType must be "
                    "CASH, CREDIT, or PARTIAL"
                )
            }), 400

    try:

        purchase = InputPurchase(
            farmer_id=data["farmerId"],
            crop_season_id=data["cropSeasonId"],
            product_id=data["productId"],
            purchase_date=data["purchaseDate"],
            quantity=data["quantity"],
            unit_price=data["unitPrice"],
            supplier_name=data.get("supplierName"),
            payment_type=data.get(
                "paymentType",
                "CREDIT"
            ),
            paid_amount=data.get(
                "paidAmount",
                0.00
            ),
            notes=data.get("notes")
        )

        db.session.add(purchase)
        db.session.commit()

        return jsonify({
            "message": "Input purchase created successfully",
            "inputPurchase": input_purchase_to_dict(
                purchase
            )
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE INPUT PURCHASE
# ============================================================

@input_purchase_bp.route(
    "/api/input-purchases/<int:id>",
    methods=["PUT"]
)
def update_input_purchase(id):

    purchase = InputPurchase.query.get(id)

    if not purchase:
        return jsonify({
            "error": "Input purchase not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    if (
        "paymentType" in data
        and data["paymentType"] not in [
            "CASH",
            "CREDIT",
            "PARTIAL"
        ]
    ):
        return jsonify({
            "error": (
                "paymentType must be "
                "CASH, CREDIT, or PARTIAL"
            )
        }), 400

    try:

        if "farmerId" in data:
            purchase.farmer_id = data["farmerId"]

        if "cropSeasonId" in data:
            purchase.crop_season_id = data["cropSeasonId"]

        if "productId" in data:
            purchase.product_id = data["productId"]

        if "purchaseDate" in data:
            purchase.purchase_date = data["purchaseDate"]

        if "quantity" in data:
            purchase.quantity = data["quantity"]

        if "unitPrice" in data:
            purchase.unit_price = data["unitPrice"]

        if "supplierName" in data:
            purchase.supplier_name = data["supplierName"]

        if "paymentType" in data:
            purchase.payment_type = data["paymentType"]

        if "paidAmount" in data:
            purchase.paid_amount = data["paidAmount"]

        if "notes" in data:
            purchase.notes = data["notes"]

        db.session.commit()

        return jsonify({
            "message": "Input purchase updated successfully",
            "inputPurchase": input_purchase_to_dict(
                purchase
            )
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE INPUT PURCHASE
# ============================================================

@input_purchase_bp.route(
    "/api/input-purchases/<int:id>",
    methods=["DELETE"]
)
def delete_input_purchase(id):

    purchase = InputPurchase.query.get(id)

    if not purchase:
        return jsonify({
            "error": "Input purchase not found"
        }), 404

    try:

        db.session.delete(purchase)
        db.session.commit()

        return jsonify({
            "message": "Input purchase deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500