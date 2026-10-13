
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.sale_deduction import SaleDeduction
from backend.models.market_sale import MarketSale
from backend.auth_utils import get_current_user


sale_deduction_bp = Blueprint("sale_deduction_bp", __name__)


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


def can_access_sale(user, sale):
    if user.role == "ADMIN":
        return True

    return (
        user.role == "FARMER"
        and user.farmer_id is not None
        and sale.farmer_id is not None
        and int(user.farmer_id) == int(sale.farmer_id)
    )


def parse_sale_id(value):
    if isinstance(value, bool):
        return None, "saleId must be a positive integer."

    try:
        sale_id = int(value)
    except (TypeError, ValueError, OverflowError):
        return None, "saleId must be a positive integer."

    if sale_id <= 0 or str(value).strip() != str(sale_id):
        return None, "saleId must be a positive integer."

    return sale_id, None


def parse_amount(value):
    if isinstance(value, bool):
        return None, "amount must be a valid positive number."

    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None, "amount must be a valid positive number."

    if not amount.is_finite() or amount <= 0:
        return None, "amount must be a finite number greater than zero."

    return amount, None


def get_json_body():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return None, (
            jsonify({
                "status": "error",
                "message": "A valid JSON request body is required."
            }),
            400
        )

    return data, None


# ============================================================
# CONVERT TO JSON
# ============================================================

def sale_deduction_to_dict(deduction):
    return {
        "id": deduction.id,
        "saleId": deduction.sale_id,
        "deductionType": deduction.deduction_type,
        "amount": (
            float(deduction.amount)
            if deduction.amount is not None else 0
        ),
        "notes": deduction.notes,
        "createdAt": (
            deduction.created_at.isoformat()
            if deduction.created_at else None
        )
    }


# ============================================================
# GET ALL DEDUCTIONS
# ============================================================

@sale_deduction_bp.route("/api/sale-deductions", methods=["GET"])
def get_sale_deductions():
    user, error = require_user()
    if error:
        return error

    try:
        query = SaleDeduction.query.join(
            MarketSale,
            SaleDeduction.sale_id == MarketSale.id
        )

        if user.role == "FARMER":
            query = query.filter(
                MarketSale.farmer_id == user.farmer_id
            )

        deductions = query.order_by(
            SaleDeduction.id.desc()
        ).all()

        return jsonify([
            sale_deduction_to_dict(item)
            for item in deductions
        ]), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve sale deductions."
        }), 500


# ============================================================
# GET DEDUCTION BY ID
# ============================================================

@sale_deduction_bp.route(
    "/api/sale-deductions/<int:id>",
    methods=["GET"]
)
def get_sale_deduction(id):
    user, error = require_user()
    if error:
        return error

    try:
        deduction = db.session.get(SaleDeduction, id)

        if deduction is None:
            return jsonify({
                "error": "Sale deduction not found."
            }), 404

        sale = db.session.get(MarketSale, deduction.sale_id)

        if sale is None:
            return jsonify({
                "error": "Related market sale not found."
            }), 404

        if not can_access_sale(user, sale):
            return jsonify({
                "error": "You are not authorized to access this deduction."
            }), 403

        return jsonify(sale_deduction_to_dict(deduction)), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve the sale deduction."
        }), 500


# ============================================================
# CREATE DEDUCTION
# ============================================================

@sale_deduction_bp.route("/api/sale-deductions", methods=["POST"])
def create_sale_deduction():
    user, error = require_user()
    if error:
        return error

    data, error = get_json_body()
    if error:
        return error

    for key in ("saleId", "deductionType", "amount"):
        if key not in data or data[key] is None or data[key] == "":
            return jsonify({
                "error": f"{key} is required."
            }), 400

    sale_id, message = parse_sale_id(data["saleId"])
    if message:
        return jsonify({"error": message}), 400

    deduction_type = data["deductionType"]
    if not isinstance(deduction_type, str) or not deduction_type.strip():
        return jsonify({
            "error": "deductionType must be non-empty text."
        }), 400

    if len(deduction_type.strip()) > 100:
        return jsonify({
            "error": "deductionType cannot exceed 100 characters."
        }), 400

    amount, message = parse_amount(data["amount"])
    if message:
        return jsonify({"error": message}), 400

    notes = data.get("notes")
    if notes is not None and not isinstance(notes, str):
        return jsonify({"error": "notes must be text or null."}), 400

    sale = db.session.get(MarketSale, sale_id)
    if sale is None:
        return jsonify({
            "error": "Selected market sale does not exist."
        }), 404

    if not can_access_sale(user, sale):
        return jsonify({
            "error": "You can create deductions only for your own sales."
        }), 403

    try:
        deduction = SaleDeduction(
            sale_id=sale_id,
            deduction_type=deduction_type.strip(),
            amount=amount,
            notes=notes.strip() if notes else None
        )

        db.session.add(deduction)
        db.session.commit()

        return jsonify({
            "message": "Sale deduction created successfully.",
            "saleDeduction": sale_deduction_to_dict(deduction)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to create the sale deduction."
        }), 500


# ============================================================
# UPDATE DEDUCTION
# ============================================================

@sale_deduction_bp.route(
    "/api/sale-deductions/<int:id>",
    methods=["PUT"]
)
def update_sale_deduction(id):
    user, error = require_user()
    if error:
        return error

    data, error = get_json_body()
    if error:
        return error

    if not data:
        return jsonify({"error": "Request body cannot be empty."}), 400

    allowed = {"saleId", "deductionType", "amount", "notes"}
    unknown = set(data) - allowed

    if unknown:
        return jsonify({
            "error": "Unsupported field(s): " + ", ".join(sorted(unknown))
        }), 400

    try:
        deduction = db.session.get(SaleDeduction, id)

        if deduction is None:
            return jsonify({
                "error": "Sale deduction not found."
            }), 404

        old_sale = db.session.get(MarketSale, deduction.sale_id)

        if old_sale is None:
            return jsonify({
                "error": "Related market sale not found."
            }), 404

        if not can_access_sale(user, old_sale):
            return jsonify({
                "error": "You are not authorized to update this deduction."
            }), 403

        target_sale = old_sale

        if "saleId" in data:
            sale_id, message = parse_sale_id(data["saleId"])

            if message:
                return jsonify({"error": message}), 400

            target_sale = db.session.get(MarketSale, sale_id)

            if target_sale is None:
                return jsonify({
                    "error": "Selected market sale does not exist."
                }), 404

            if not can_access_sale(user, target_sale):
                return jsonify({
                    "error": "You can assign deductions only to your own sales."
                }), 403

        target_type = deduction.deduction_type

        if "deductionType" in data:
            value = data["deductionType"]

            if not isinstance(value, str) or not value.strip():
                return jsonify({
                    "error": "deductionType must be non-empty text."
                }), 400

            if len(value.strip()) > 100:
                return jsonify({
                    "error": "deductionType cannot exceed 100 characters."
                }), 400

            target_type = value.strip()

        target_amount = deduction.amount

        if "amount" in data:
            target_amount, message = parse_amount(data["amount"])

            if message:
                return jsonify({"error": message}), 400

        target_notes = deduction.notes

        if "notes" in data:
            target_notes = data["notes"]

            if target_notes is not None and not isinstance(target_notes, str):
                return jsonify({
                    "error": "notes must be text or null."
                }), 400

            if target_notes is not None:
                target_notes = target_notes.strip() or None

        deduction.sale_id = target_sale.id
        deduction.deduction_type = target_type
        deduction.amount = target_amount
        deduction.notes = target_notes

        db.session.commit()

        return jsonify({
            "message": "Sale deduction updated successfully.",
            "saleDeduction": sale_deduction_to_dict(deduction)
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to update the sale deduction."
        }), 500


# ============================================================
# DELETE DEDUCTION
# ============================================================

@sale_deduction_bp.route(
    "/api/sale-deductions/<int:id>",
    methods=["DELETE"]
)
def delete_sale_deduction(id):
    user, error = require_user()
    if error:
        return error

    try:
        deduction = db.session.get(SaleDeduction, id)

        if deduction is None:
            return jsonify({
                "error": "Sale deduction not found."
            }), 404

        sale = db.session.get(MarketSale, deduction.sale_id)

        if sale is None:
            return jsonify({
                "error": "Related market sale not found."
            }), 404

        if not can_access_sale(user, sale):
            return jsonify({
                "error": "You are not authorized to delete this deduction."
            }), 403

        db.session.delete(deduction)
        db.session.commit()

        return jsonify({
            "message": "Sale deduction deleted successfully."
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to delete the sale deduction."
        }), 500
