
from datetime import datetime, date
import math

from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.input_purchase import InputPurchase
from backend.models.crop_season import CropSeason
from backend.models.field import Field
from backend.models.product import Product
from backend.auth_utils import get_current_user


input_purchase_bp = Blueprint("input_purchase_bp", __name__)

ALLOWED_PAYMENT_TYPES = {"CASH", "CREDIT", "PARTIAL"}


# ============================================================
# AUTHENTICATION
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


def can_manage_purchase(user, farmer_id):
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


def parse_amount(value, field_name, allow_zero=True):
    if isinstance(value, bool):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a valid number."
            }),
            400
        )

    try:
        amount = float(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a valid number."
            }),
            400
        )

    if not math.isfinite(amount):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a finite number."
            }),
            400
        )

    if amount < 0 or (not allow_zero and amount == 0):
        message = (
            f"{field_name} must be greater than zero."
            if not allow_zero
            else f"{field_name} cannot be negative."
        )
        return None, (
            jsonify({
                "status": "error",
                "message": message
            }),
            400
        )

    return amount, None


def parse_purchase_date(value):
    if not isinstance(value, str) or not value.strip():
        return None, (
            jsonify({
                "status": "error",
                "message": "purchaseDate must use YYYY-MM-DD format."
            }),
            400
        )

    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date(), None
    except ValueError:
        return None, (
            jsonify({
                "status": "error",
                "message": "purchaseDate must use YYYY-MM-DD format."
            }),
            400
        )


def validate_optional_text(data, key, max_length=None):
    if key not in data:
        return None, None

    value = data[key]

    if value is not None and not isinstance(value, str):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{key} must be text or null."
            }),
            400
        )

    if value is not None:
        value = value.strip()

        if max_length is not None and len(value) > max_length:
            return None, (
                jsonify({
                    "status": "error",
                    "message": f"{key} must not exceed {max_length} characters."
                }),
                400
            )

    return value or None, None


def get_crop_season_owner(crop_season_id):
    crop_season = db.session.get(CropSeason, crop_season_id)

    if crop_season is None:
        return None, "Crop season not found.", 404

    field = db.session.get(Field, crop_season.field_id)

    if field is None:
        return None, "Field for crop season not found.", 404

    return field.farmer_id, None, None


def validate_crop_season_access(crop_season_id, farmer_id):
    owner_id, error_message, status_code = get_crop_season_owner(
        crop_season_id
    )

    if error_message:
        return False, error_message, status_code

    if int(owner_id) != int(farmer_id):
        return (
            False,
            "The crop season does not belong to the selected farmer.",
            403
        )

    return True, None, None


def validate_related_records(data, farmer_id, current_crop_season_id=None):
    """Ensure the selected product and crop season exist and match the farmer."""
    product_id = data.get("productId")

    if product_id is not None:
        product_id, error = parse_positive_id(product_id, "productId")
        if error:
            return error

        if db.session.get(Product, product_id) is None:
            return jsonify({
                "status": "error",
                "message": "Product not found."
            }), 404

    crop_season_id = data.get("cropSeasonId", current_crop_season_id)

    if crop_season_id is not None:
        crop_season_id, error = parse_positive_id(
            crop_season_id, "cropSeasonId"
        )
        if error:
            return error

        valid, message, status_code = validate_crop_season_access(
            crop_season_id, farmer_id
        )

        if not valid:
            return jsonify({
                "status": "error",
                "message": message
            }), status_code

    return None


# ============================================================
# SAFE DATE CONVERSION
# ============================================================

def safe_date_to_string(value):
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return None

        try:
            return datetime.strptime(value[:10], "%Y-%m-%d").date().isoformat()
        except ValueError:
            return value

    return str(value)


def safe_datetime_to_string(value):
    if value is None:
        return None

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    return str(value)


# ============================================================
# CONVERT INPUT PURCHASE TO JSON
# ============================================================

def input_purchase_to_dict(purchase):
    return {
        "id": purchase.id,
        "farmerId": purchase.farmer_id,
        "cropSeasonId": purchase.crop_season_id,
        "productId": purchase.product_id,
        "purchaseDate": safe_date_to_string(purchase.purchase_date),
        "quantity": (
            float(purchase.quantity)
            if purchase.quantity is not None else None
        ),
        "unitPrice": (
            float(purchase.unit_price)
            if purchase.unit_price is not None else None
        ),
        "supplierName": purchase.supplier_name,
        "paymentType": purchase.payment_type,
        "paidAmount": (
            float(purchase.paid_amount)
            if purchase.paid_amount is not None else 0
        ),
        "notes": purchase.notes,
        "createdAt": safe_datetime_to_string(
            getattr(purchase, "created_at", None)
        ),
        "updatedAt": None
    }


# ============================================================
# GET ALL INPUT PURCHASES
# ADMIN: ALL
# FARMER: OWN PURCHASES ONLY
# ============================================================

@input_purchase_bp.route("/api/input-purchases", methods=["GET"])
def get_input_purchases():
    user, error = require_user()
    if error:
        return error

    try:
        query = InputPurchase.query

        if user.role == "FARMER":
            query = query.filter_by(farmer_id=user.farmer_id)

        purchases = query.order_by(InputPurchase.id.desc()).all()

        return jsonify([
            input_purchase_to_dict(item)
            for item in purchases
        ]), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve input purchases."
        }), 500


# ============================================================
# GET INPUT PURCHASE BY ID
# ============================================================

@input_purchase_bp.route("/api/input-purchases/<int:id>", methods=["GET"])
def get_input_purchase(id):
    user, error = require_user()
    if error:
        return error

    try:
        purchase = db.session.get(InputPurchase, id)

        if purchase is None:
            return jsonify({
                "status": "error",
                "message": "Input purchase not found."
            }), 404

        if not can_manage_purchase(user, purchase.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You do not have access to this input purchase."
            }), 403

        return jsonify(input_purchase_to_dict(purchase)), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve the input purchase."
        }), 500


# ============================================================
# CREATE INPUT PURCHASE
# ADMIN: ANY FARMER
# FARMER: OWN ACCOUNT ONLY
# ============================================================

@input_purchase_bp.route("/api/input-purchases", methods=["POST"])
def create_input_purchase():
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON request body is required."
        }), 400

    required_fields = [
        "farmerId",
        "cropSeasonId",
        "productId",
        "purchaseDate",
        "quantity",
        "unitPrice",
        "paymentType"
    ]

    missing = [key for key in required_fields if key not in data]
    if missing:
        return jsonify({
            "status": "error",
            "message": "Missing required field(s): " + ", ".join(missing)
        }), 400

    farmer_id, error = parse_positive_id(data["farmerId"], "farmerId")
    if error:
        return error

    if not can_manage_purchase(user, farmer_id):
        return jsonify({
            "status": "error",
            "message": "You can create purchases only for your own farmer account."
        }), 403

    payment_type = data["paymentType"]

    if not isinstance(payment_type, str):
        return jsonify({
            "status": "error",
            "message": "paymentType must be CASH, CREDIT or PARTIAL."
        }), 400

    payment_type = payment_type.strip().upper()

    if payment_type not in ALLOWED_PAYMENT_TYPES:
        return jsonify({
            "status": "error",
            "message": "paymentType must be CASH, CREDIT or PARTIAL."
        }), 400

    purchase_date, error = parse_purchase_date(data["purchaseDate"])
    if error:
        return error

    quantity, error = parse_amount(data["quantity"], "quantity", False)
    if error:
        return error

    unit_price, error = parse_amount(data["unitPrice"], "unitPrice")
    if error:
        return error

    paid_amount, error = parse_amount(
        data.get("paidAmount", 0), "paidAmount"
    )
    if error:
        return error

    total_amount = quantity * unit_price

    if not math.isfinite(total_amount):
        return jsonify({
            "status": "error",
            "message": "The purchase total is outside the supported numeric range."
        }), 400

    if paid_amount > total_amount:
        return jsonify({
            "status": "error",
            "message": "Paid amount cannot exceed the total purchase amount."
        }), 400

    supplier_name, error = validate_optional_text(data, "supplierName")
    if error:
        return error

    notes, error = validate_optional_text(data, "notes")
    if error:
        return error

    try:
        crop_season_id, error = parse_positive_id(
            data["cropSeasonId"], "cropSeasonId"
        )
        if error:
            return error

        product_id, error = parse_positive_id(data["productId"], "productId")
        if error:
            return error

        related_error = validate_related_records(
            {
                "cropSeasonId": crop_season_id,
                "productId": product_id
            },
            farmer_id
        )
        if related_error:
            return related_error

        purchase = InputPurchase(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id,
            product_id=product_id,
            purchase_date=purchase_date,
            quantity=quantity,
            unit_price=unit_price,
            supplier_name=supplier_name,
            payment_type=payment_type,
            paid_amount=paid_amount,
            notes=notes
        )

        db.session.add(purchase)
        db.session.commit()

        return jsonify({
            "message": "Input purchase created successfully",
            "inputPurchase": input_purchase_to_dict(purchase)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to create input purchase. Check the supplied data."
        }), 500


# ============================================================
# UPDATE INPUT PURCHASE
# ADMIN: ALL
# FARMER: OWN PURCHASES ONLY
# ============================================================

@input_purchase_bp.route("/api/input-purchases/<int:id>", methods=["PUT"])
def update_input_purchase(id):
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            "status": "error",
            "message": "A non-empty JSON request body is required."
        }), 400

    allowed_fields = {
        "farmerId",
        "cropSeasonId",
        "productId",
        "purchaseDate",
        "quantity",
        "unitPrice",
        "supplierName",
        "paymentType",
        "paidAmount",
        "notes"
    }

    unknown = set(data.keys()) - allowed_fields
    if unknown:
        return jsonify({
            "status": "error",
            "message": "Unsupported field(s): " + ", ".join(sorted(unknown))
        }), 400

    try:
        purchase = db.session.get(InputPurchase, id)

        if purchase is None:
            return jsonify({
                "status": "error",
                "message": "Input purchase not found."
            }), 404

        if not can_manage_purchase(user, purchase.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You do not have permission to update this input purchase."
            }), 403

        target_farmer_id = purchase.farmer_id

        if "farmerId" in data:
            target_farmer_id, error = parse_positive_id(
                data["farmerId"], "farmerId"
            )
            if error:
                return error

            if user.role != "ADMIN" and target_farmer_id != user.farmer_id:
                return jsonify({
                    "status": "error",
                    "message": "You cannot reassign a purchase to another farmer."
                }), 403

        target_crop_season_id = purchase.crop_season_id
        if "cropSeasonId" in data:
            target_crop_season_id, error = parse_positive_id(
                data["cropSeasonId"], "cropSeasonId"
            )
            if error:
                return error

        target_product_id = purchase.product_id
        if "productId" in data:
            target_product_id, error = parse_positive_id(
                data["productId"], "productId"
            )
            if error:
                return error

        related_error = validate_related_records(
            {
                "cropSeasonId": target_crop_season_id,
                "productId": target_product_id
            },
            target_farmer_id
        )
        if related_error:
            return related_error

        target_date = purchase.purchase_date
        if "purchaseDate" in data:
            target_date, error = parse_purchase_date(data["purchaseDate"])
            if error:
                return error

        target_quantity = float(purchase.quantity)
        if "quantity" in data:
            target_quantity, error = parse_amount(
                data["quantity"], "quantity", False
            )
            if error:
                return error

        target_unit_price = float(purchase.unit_price)
        if "unitPrice" in data:
            target_unit_price, error = parse_amount(
                data["unitPrice"], "unitPrice"
            )
            if error:
                return error

        target_paid_amount = float(purchase.paid_amount or 0)
        if "paidAmount" in data:
            target_paid_amount, error = parse_amount(
                data["paidAmount"], "paidAmount"
            )
            if error:
                return error

        total_amount = target_quantity * target_unit_price

        if not math.isfinite(total_amount):
            return jsonify({
                "status": "error",
                "message": "The purchase total is outside the supported numeric range."
            }), 400

        if target_paid_amount > total_amount:
            return jsonify({
                "status": "error",
                "message": "Paid amount cannot exceed the total purchase amount."
            }), 400

        target_payment_type = purchase.payment_type
        if "paymentType" in data:
            if not isinstance(data["paymentType"], str):
                return jsonify({
                    "status": "error",
                    "message": "paymentType must be CASH, CREDIT or PARTIAL."
                }), 400

            target_payment_type = data["paymentType"].strip().upper()

            if target_payment_type not in ALLOWED_PAYMENT_TYPES:
                return jsonify({
                    "status": "error",
                    "message": "paymentType must be CASH, CREDIT or PARTIAL."
                }), 400

        target_supplier = purchase.supplier_name
        if "supplierName" in data:
            target_supplier, error = validate_optional_text(data, "supplierName")
            if error:
                return error

        target_notes = purchase.notes
        if "notes" in data:
            target_notes, error = validate_optional_text(data, "notes")
            if error:
                return error

        purchase.farmer_id = target_farmer_id
        purchase.crop_season_id = target_crop_season_id
        purchase.product_id = target_product_id
        purchase.purchase_date = target_date
        purchase.quantity = target_quantity
        purchase.unit_price = target_unit_price
        purchase.paid_amount = target_paid_amount
        purchase.payment_type = target_payment_type
        purchase.supplier_name = target_supplier
        purchase.notes = target_notes

        db.session.commit()

        return jsonify({
            "message": "Input purchase updated successfully",
            "inputPurchase": input_purchase_to_dict(purchase)
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to update input purchase. Check the supplied data."
        }), 500


# ============================================================
# DELETE INPUT PURCHASE
# ADMIN: ALL
# FARMER: OWN PURCHASES ONLY
# ============================================================

@input_purchase_bp.route("/api/input-purchases/<int:id>", methods=["DELETE"])
def delete_input_purchase(id):
    user, error = require_user()
    if error:
        return error

    try:
        purchase = db.session.get(InputPurchase, id)

        if purchase is None:
            return jsonify({
                "status": "error",
                "message": "Input purchase not found."
            }), 404

        if not can_manage_purchase(user, purchase.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You do not have permission to delete this input purchase."
            }), 403

        db.session.delete(purchase)
        db.session.commit()

        return jsonify({
            "message": "Input purchase deleted successfully"
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": (
                "Unable to delete input purchase. "
                "Check whether related records depend on it."
            )
        }), 500
