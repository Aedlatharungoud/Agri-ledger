
from datetime import datetime
import math

from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.market_sale import MarketSale
from backend.models.harvest import Harvest
from backend.auth_utils import get_current_user


market_sale_bp = Blueprint("market_sale_bp", __name__)


# ============================================================
# AUTHORIZATION
# ============================================================

def require_user():
    user = get_current_user()

    if user is None:
        return None, (
            jsonify({
                "status": "error",
                "message": "Authentication required."
            }),
            401
        )

    if user.role not in ("ADMIN", "FARMER"):
        return None, (
            jsonify({
                "status": "error",
                "message": "You do not have permission to access this resource."
            }),
            403
        )

    if user.role == "FARMER" and not user.farmer_id:
        return None, (
            jsonify({
                "status": "error",
                "message": "Farmer account is not linked to a farmer record."
            }),
            403
        )

    return user, None


def can_manage_farmer(user, farmer_id):
    if user.role == "ADMIN":
        return True

    try:
        return (
            user.role == "FARMER"
            and user.farmer_id is not None
            and int(user.farmer_id) == int(farmer_id)
        )
    except (TypeError, ValueError, OverflowError):
        return False


# ============================================================
# VALIDATION HELPERS
# ============================================================

def parse_positive_id(value, field_name):
    if isinstance(value, bool):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a positive integer."
            }),
            400
        )

    try:
        parsed = int(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a positive integer."
            }),
            400
        )

    if parsed <= 0 or str(value).strip() != str(parsed):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a positive integer."
            }),
            400
        )

    return parsed, None


def parse_nonnegative_number(value, field_name):
    if isinstance(value, bool):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a valid non-negative number."
            }),
            400
        )

    try:
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a valid non-negative number."
            }),
            400
        )

    if not math.isfinite(number) or number < 0:
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a finite non-negative number."
            }),
            400
        )

    return number, None


def parse_sale_date(value):
    if not isinstance(value, str) or not value.strip():
        return None, (
            jsonify({
                "status": "error",
                "message": "saleDate must use YYYY-MM-DD format."
            }),
            400
        )

    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date(), None
    except ValueError:
        return None, (
            jsonify({
                "status": "error",
                "message": "saleDate must use YYYY-MM-DD format."
            }),
            400
        )


ALLOWED_UNITS = ("BAG", "KG", "QUINTAL", "TON")


def parse_sale_unit(value):
    """
    Validate and normalize the sale unit.
    Must be a non-empty string matching one of the supported units: BAG, KG, QUINTAL, TON.
    Reject missing, unsupported, malformed, or inconsistent unit values.
    """
    if value is None or isinstance(value, bool):
        return None, (
            jsonify({
                "status": "error",
                "message": "Sale unit is required and must be one of: BAG, KG, QUINTAL, TON."
            }),
            400
        )

    if not isinstance(value, str):
        return None, (
            jsonify({
                "status": "error",
                "message": "Sale unit must be text."
            }),
            400
        )

    cleaned = value.strip().upper()
    if not cleaned:
        return None, (
            jsonify({
                "status": "error",
                "message": "Sale unit cannot be empty."
            }),
            400
        )

    if cleaned not in ALLOWED_UNITS:
        return None, (
            jsonify({
                "status": "error",
                "message": f"Unsupported sale unit '{value.strip()}'. Allowed units: {', '.join(ALLOWED_UNITS)}."
            }),
            400
        )

    return cleaned, None


def validate_text(value, field_name):
    if value is None:
        return None, None

    if not isinstance(value, str):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be text or null."
            }),
            400
        )

    return value.strip() or None, None


def validate_harvest(farmer_id, harvest_id):
    harvest_id, error = parse_positive_id(harvest_id, "harvestId")
    if error:
        return None, error

    harvest = db.session.get(Harvest, harvest_id)

    if harvest is None:
        return None, (
            jsonify({
                "status": "error",
                "message": "Harvest not found."
            }),
            404
        )

    if int(harvest.farmer_id) != int(farmer_id):
        return None, (
            jsonify({
                "status": "error",
                "message": "The selected harvest does not belong to this farmer."
            }),
            403
        )

    return harvest, None


# ============================================================
# CONVERT MARKET SALE TO JSON
# ============================================================

def market_sale_to_dict(sale):
    raw_unit = sale.unit
    cleaned_unit = raw_unit.strip().upper() if isinstance(raw_unit, str) else None
    unit_needs_review = cleaned_unit not in ALLOWED_UNITS

    return {
        "id": sale.id,
        "farmerId": sale.farmer_id,
        "harvestId": sale.harvest_id,
        "saleDate": (
            sale.sale_date.isoformat()
            if hasattr(getattr(sale, "sale_date", None), "isoformat")
            and not isinstance(getattr(sale, "sale_date", None), str)
            else (str(sale.sale_date) if getattr(sale, "sale_date", None) else None)
        ),
        "marketName": sale.market_name if isinstance(sale.market_name, str) else None,
        "buyerName": sale.buyer_name if isinstance(sale.buyer_name, str) else None,
        "quantitySold": (
            float(sale.quantity_sold)
            if sale.quantity_sold is not None else None
        ),
        "unit": sale.unit if isinstance(sale.unit, str) else None,
        "unitNeedsReview": unit_needs_review,
        "ratePerUnit": (
            float(sale.rate_per_unit)
            if sale.rate_per_unit is not None else None
        ),
        "grossAmount": (
            float(sale.gross_amount)
            if sale.gross_amount is not None else None
        ),
        "commission": (
            float(sale.commission)
            if sale.commission is not None else None
        ),
        "marketFee": (
            float(sale.market_fee)
            if sale.market_fee is not None else None
        ),
        "otherDeduction": (
            float(sale.other_deduction)
            if sale.other_deduction is not None else None
        ),
        "notes": sale.notes if isinstance(sale.notes, str) else None,
        "createdAt": (
            sale.created_at.isoformat()
            if hasattr(getattr(sale, "created_at", None), "isoformat")
            and not isinstance(getattr(sale, "created_at", None), str)
            else None
        )
    }


# ============================================================
# GET ALL MARKET SALES
# ADMIN: ALL
# FARMER: OWN SALES ONLY
# ============================================================

@market_sale_bp.route("/api/market-sales", methods=["GET"])
def get_market_sales():
    user, error = require_user()
    if error:
        return error

    try:
        query = MarketSale.query

        if user.role == "FARMER":
            query = query.filter_by(farmer_id=user.farmer_id)

        sales = query.order_by(MarketSale.id.desc()).all()

        return jsonify([
            market_sale_to_dict(sale)
            for sale in sales
        ]), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve market sales."
        }), 500


# ============================================================
# GET MARKET SALE BY ID
# ============================================================

@market_sale_bp.route("/api/market-sales/<int:id>", methods=["GET"])
def get_market_sale(id):
    user, error = require_user()
    if error:
        return error

    try:
        sale = db.session.get(MarketSale, id)

        if sale is None:
            return jsonify({
                "status": "error",
                "message": "Market sale not found."
            }), 404

        if not can_manage_farmer(user, sale.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You are not authorized to access this sale."
            }), 403

        return jsonify(market_sale_to_dict(sale)), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve the market sale."
        }), 500


# ============================================================
# CREATE MARKET SALE
# ============================================================

@market_sale_bp.route("/api/market-sales", methods=["POST"])
def create_market_sale():
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON request body is required."
        }), 400

    if user.role == "FARMER":
        data["farmerId"] = user.farmer_id

    required = ["farmerId", "harvestId", "saleDate", "unit"]

    missing = [
        key for key in required
        if key not in data or data[key] is None or str(data[key]).strip() == ""
    ]

    if missing:
        return jsonify({
            "status": "error",
            "message": "Missing required field(s): " + ", ".join(missing)
        }), 400

    farmer_id, error = parse_positive_id(data["farmerId"], "farmerId")
    if error:
        return error

    if not can_manage_farmer(user, farmer_id):
        return jsonify({
            "status": "error",
            "message": "You can create sales only for your own farmer account."
        }), 403

    sale_date, error = parse_sale_date(data["saleDate"])
    if error:
        return error

    sale_unit, error = parse_sale_unit(data.get("unit"))
    if error:
        return error

    quantity = data.get("quantitySold")
    rate = data.get("ratePerUnit")

    if quantity is None or quantity == "":
        return jsonify({
            "status": "error",
            "message": "quantitySold is required."
        }), 400

    if rate is None or rate == "":
        return jsonify({
            "status": "error",
            "message": "ratePerUnit is required."
        }), 400

    quantity, error = parse_nonnegative_number(quantity, "quantitySold")
    if error:
        return error

    if quantity <= 0:
        return jsonify({
            "status": "error",
            "message": "quantitySold must be greater than zero."
        }), 400

    rate, error = parse_nonnegative_number(rate, "ratePerUnit")
    if error:
        return error

    # Rate is strictly interpreted per selected sale unit (BAG, KG, etc.)
    # Gross amount is calculated directly without any unit conversion
    gross_amount = round(quantity * rate, 2)

    money_fields = {}
    for key in ("commission", "marketFee", "otherDeduction"):
        value, error = parse_nonnegative_number(data.get(key, 0), key)
        if error:
            return error
        money_fields[key] = value

    text_fields = {}
    for key in ("marketName", "buyerName", "notes"):
        value, error = validate_text(data.get(key), key)
        if error:
            return error
        text_fields[key] = value

    try:
        harvest, error = validate_harvest(farmer_id, data["harvestId"])
        if error:
            return error

        sale = MarketSale(
            farmer_id=farmer_id,
            harvest_id=harvest.id,
            sale_date=sale_date,
            market_name=text_fields["marketName"],
            buyer_name=text_fields["buyerName"],
            quantity_sold=quantity,
            unit=sale_unit,
            rate_per_unit=rate,
            gross_amount=gross_amount,
            commission=money_fields["commission"],
            market_fee=money_fields["marketFee"],
            other_deduction=money_fields["otherDeduction"],
            notes=text_fields["notes"]
        )

        db.session.add(sale)
        db.session.commit()

        return jsonify({
            "message": "Market sale created successfully",
            "marketSale": market_sale_to_dict(sale)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to create market sale. Check the supplied data."
        }), 500


# ============================================================
# UPDATE MARKET SALE
# ============================================================

@market_sale_bp.route("/api/market-sales/<int:id>", methods=["PUT"])
def update_market_sale(id):
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            "status": "error",
            "message": "A non-empty JSON request body is required."
        }), 400

    allowed = {
        "farmerId", "harvestId", "saleDate", "marketName", "buyerName",
        "quantitySold", "unit", "ratePerUnit", "grossAmount",
        "commission", "marketFee", "otherDeduction", "notes"
    }

    unknown = set(data.keys()) - allowed
    if unknown:
        return jsonify({
            "status": "error",
            "message": "Unsupported field(s): " + ", ".join(sorted(unknown))
        }), 400

    try:
        sale = db.session.get(MarketSale, id)

        if sale is None:
            return jsonify({
                "status": "error",
                "message": "Market sale not found."
            }), 404

        if not can_manage_farmer(user, sale.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You are not authorized to update this sale."
            }), 403

        target_farmer_id = sale.farmer_id

        if "farmerId" in data:
            target_farmer_id, error = parse_positive_id(
                data["farmerId"], "farmerId"
            )
            if error:
                return error

            if user.role != "ADMIN" and target_farmer_id != user.farmer_id:
                return jsonify({
                    "status": "error",
                    "message": "Farmers cannot transfer sales to another farmer."
                }), 403

        target_harvest_id = data.get("harvestId", sale.harvest_id)
        harvest, error = validate_harvest(
            target_farmer_id, target_harvest_id
        )
        if error:
            return error

        target_date = sale.sale_date
        if "saleDate" in data:
            target_date, error = parse_sale_date(data["saleDate"])
            if error:
                return error

        target_unit = sale.unit
        if "unit" in data:
            target_unit, error = parse_sale_unit(data["unit"])
            if error:
                return error

        target_quantity = float(sale.quantity_sold) if sale.quantity_sold is not None else 0.0
        if "quantitySold" in data:
            target_quantity, error = parse_nonnegative_number(
                data["quantitySold"], "quantitySold"
            )
            if error:
                return error
            if target_quantity <= 0:
                return jsonify({
                    "status": "error",
                    "message": "quantitySold must be greater than zero."
                }), 400

        target_rate = float(sale.rate_per_unit) if sale.rate_per_unit is not None else 0.0
        if "ratePerUnit" in data:
            target_rate, error = parse_nonnegative_number(
                data["ratePerUnit"], "ratePerUnit"
            )
            if error:
                return error

        # Rate is strictly interpreted per target sale unit without conversion
        target_gross = round(target_quantity * target_rate, 2)

        target_money = {}
        for key, attribute in (
            ("commission", "commission"),
            ("marketFee", "market_fee"),
            ("otherDeduction", "other_deduction")
        ):
            current = getattr(sale, attribute) or 0
            value, error = parse_nonnegative_number(
                data.get(key, current), key
            )
            if error:
                return error
            target_money[key] = value

        target_text = {}
        for key, attribute in (
            ("marketName", "market_name"),
            ("buyerName", "buyer_name"),
            ("notes", "notes")
        ):
            value, error = validate_text(
                data[key] if key in data else getattr(sale, attribute),
                key
            )
            if error:
                return error
            target_text[key] = value

        sale.farmer_id = target_farmer_id
        sale.harvest_id = harvest.id
        sale.sale_date = target_date
        sale.market_name = target_text["marketName"]
        sale.buyer_name = target_text["buyerName"]
        sale.quantity_sold = target_quantity
        sale.rate_per_unit = target_rate
        sale.gross_amount = target_gross
        sale.unit = target_unit
        sale.commission = target_money["commission"]
        sale.market_fee = target_money["marketFee"]
        sale.other_deduction = target_money["otherDeduction"]
        sale.notes = target_text["notes"]

        db.session.commit()

        return jsonify({
            "message": "Market sale updated successfully",
            "marketSale": market_sale_to_dict(sale)
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to update market sale. Check the supplied data."
        }), 500


# ============================================================
# DELETE MARKET SALE
# ============================================================

@market_sale_bp.route("/api/market-sales/<int:id>", methods=["DELETE"])
def delete_market_sale(id):
    user, error = require_user()
    if error:
        return error

    try:
        sale = db.session.get(MarketSale, id)

        if sale is None:
            return jsonify({
                "status": "error",
                "message": "Market sale not found."
            }), 404

        if not can_manage_farmer(user, sale.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You are not authorized to delete this sale."
            }), 403

        db.session.delete(sale)
        db.session.commit()

        return jsonify({
            "message": "Market sale deleted successfully"
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to delete market sale. Check related records."
        }), 500
