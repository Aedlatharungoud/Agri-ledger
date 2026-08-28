from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.market_sale import MarketSale
from datetime import datetime


market_sale_bp = Blueprint(
    "market_sale_bp",
    __name__
)


# ============================================================
# CONVERT MARKET SALE TO JSON
# ============================================================

def market_sale_to_dict(sale):
    return {
        "id": sale.id,
        "farmerId": sale.farmer_id,
        "harvestId": sale.harvest_id,

        "saleDate": (
            sale.sale_date.isoformat()
            if sale.sale_date
            else None
        ),

        "marketName": sale.market_name,
        "buyerName": sale.buyer_name,

        "quantitySold": (
            float(sale.quantity_sold)
            if sale.quantity_sold is not None
            else None
        ),

        "unit": sale.unit,

        "ratePerUnit": (
            float(sale.rate_per_unit)
            if sale.rate_per_unit is not None
            else None
        ),

        "grossAmount": (
            float(sale.gross_amount)
            if sale.gross_amount is not None
            else None
        ),

        "commission": (
            float(sale.commission)
            if sale.commission is not None
            else None
        ),

        "marketFee": (
            float(sale.market_fee)
            if sale.market_fee is not None
            else None
        ),

        "otherDeduction": (
            float(sale.other_deduction)
            if sale.other_deduction is not None
            else None
        ),

        "notes": sale.notes,

        "createdAt": (
            sale.created_at.isoformat()
            if sale.created_at
            else None
        )
    }


# ============================================================
# GET ALL MARKET SALES
# ============================================================

@market_sale_bp.route(
    "/api/market-sales",
    methods=["GET"]
)
def get_market_sales():

    sales = MarketSale.query.all()

    return jsonify([
        market_sale_to_dict(sale)
        for sale in sales
    ])


# ============================================================
# GET MARKET SALE BY ID
# ============================================================

@market_sale_bp.route(
    "/api/market-sales/<int:id>",
    methods=["GET"]
)
def get_market_sale(id):

    sale = MarketSale.query.get(id)

    if not sale:
        return jsonify({
            "error": "Market sale not found"
        }), 404

    return jsonify(
        market_sale_to_dict(sale)
    )


# ============================================================
# CREATE MARKET SALE
# ============================================================

@market_sale_bp.route(
    "/api/market-sales",
    methods=["POST"]
)
def create_market_sale():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmerId",
        "harvestId",
        "saleDate"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    try:

        sale_date = datetime.strptime(
            data["saleDate"],
            "%Y-%m-%d"
        ).date()

        sale = MarketSale(
            farmer_id=data["farmerId"],
            harvest_id=data["harvestId"],
            sale_date=sale_date,

            market_name=data.get("marketName"),
            buyer_name=data.get("buyerName"),
            quantity_sold=data.get("quantitySold"),
            unit=data.get("unit"),
            rate_per_unit=data.get("ratePerUnit"),
            gross_amount=data.get("grossAmount"),
            commission=data.get("commission"),
            market_fee=data.get("marketFee"),
            other_deduction=data.get("otherDeduction"),
            notes=data.get("notes")
        )

        db.session.add(sale)
        db.session.commit()

        return jsonify({
            "message": "Market sale created successfully",
            "marketSale": market_sale_to_dict(sale)
        }), 201

    except ValueError:

        return jsonify({
            "error": "saleDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE MARKET SALE
# ============================================================

@market_sale_bp.route(
    "/api/market-sales/<int:id>",
    methods=["PUT"]
)
def update_market_sale(id):

    sale = MarketSale.query.get(id)

    if not sale:
        return jsonify({
            "error": "Market sale not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "farmerId" in data:
            sale.farmer_id = data["farmerId"]

        if "harvestId" in data:
            sale.harvest_id = data["harvestId"]

        if "saleDate" in data:

            sale.sale_date = datetime.strptime(
                data["saleDate"],
                "%Y-%m-%d"
            ).date()

        if "marketName" in data:
            sale.market_name = data["marketName"]

        if "buyerName" in data:
            sale.buyer_name = data["buyerName"]

        if "quantitySold" in data:
            sale.quantity_sold = data["quantitySold"]

        if "unit" in data:
            sale.unit = data["unit"]

        if "ratePerUnit" in data:
            sale.rate_per_unit = data["ratePerUnit"]

        if "grossAmount" in data:
            sale.gross_amount = data["grossAmount"]

        if "commission" in data:
            sale.commission = data["commission"]

        if "marketFee" in data:
            sale.market_fee = data["marketFee"]

        if "otherDeduction" in data:
            sale.other_deduction = data["otherDeduction"]

        if "notes" in data:
            sale.notes = data["notes"]

        db.session.commit()

        return jsonify({
            "message": "Market sale updated successfully",
            "marketSale": market_sale_to_dict(sale)
        })

    except ValueError:

        return jsonify({
            "error": "saleDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE MARKET SALE
# ============================================================

@market_sale_bp.route(
    "/api/market-sales/<int:id>",
    methods=["DELETE"]
)
def delete_market_sale(id):

    sale = MarketSale.query.get(id)

    if not sale:
        return jsonify({
            "error": "Market sale not found"
        }), 404

    try:

        db.session.delete(sale)
        db.session.commit()

        return jsonify({
            "message": "Market sale deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500