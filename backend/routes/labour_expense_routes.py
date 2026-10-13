
from datetime import datetime
import math

from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.labour_expense import LabourExpense
from backend.models.field import Field
from backend.models.crop_season import CropSeason
from backend.auth_utils import get_current_user


labour_expense_bp = Blueprint("labour_expense_bp", __name__)

ALLOWED_PAYMENT_TYPES = {"CASH", "CREDIT", "PARTIAL"}


# ============================================================
# AUTHENTICATION AND AUTHORIZATION
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


def parse_number(value, field_name, allow_zero=True):
    if isinstance(value, bool):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a valid number."
            }),
            400
        )

    try:
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a valid number."
            }),
            400
        )

    if not math.isfinite(number):
        return None, (
            jsonify({
                "status": "error",
                "message": f"{field_name} must be a finite number."
            }),
            400
        )

    if number < 0 or (not allow_zero and number == 0):
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

    return number, None


def parse_work_date(value):
    if not isinstance(value, str) or not value.strip():
        return None, (
            jsonify({
                "status": "error",
                "message": "workDate must use YYYY-MM-DD format."
            }),
            400
        )

    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date(), None
    except ValueError:
        return None, (
            jsonify({
                "status": "error",
                "message": "workDate must use YYYY-MM-DD format."
            }),
            400
        )


def validate_optional_text(data, key):
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

    return (value.strip() or None) if isinstance(value, str) else None, None


def validate_payment_type(value):
    if not isinstance(value, str):
        return None, (
            jsonify({
                "status": "error",
                "message": "paymentType must be CASH, CREDIT, or PARTIAL."
            }),
            400
        )

    value = value.strip().upper()

    if value not in ALLOWED_PAYMENT_TYPES:
        return None, (
            jsonify({
                "status": "error",
                "message": "paymentType must be CASH, CREDIT, or PARTIAL."
            }),
            400
        )

    return value, None


def validate_field_and_season(field_id, crop_season_id, farmer_id):
    field_id, error = parse_positive_id(field_id, "fieldId")
    if error:
        return None, None, error

    crop_season_id, error = parse_positive_id(
        crop_season_id, "cropSeasonId"
    )
    if error:
        return None, None, error

    field = db.session.get(Field, field_id)
    if field is None:
        return None, None, (
            jsonify({
                "status": "error",
                "message": "Field not found."
            }),
            404
        )

    if int(field.farmer_id) != int(farmer_id):
        return None, None, (
            jsonify({
                "status": "error",
                "message": "The selected field does not belong to this farmer."
            }),
            403
        )

    crop_season = db.session.get(CropSeason, crop_season_id)
    if crop_season is None:
        return None, None, (
            jsonify({
                "status": "error",
                "message": "Crop season not found."
            }),
            404
        )

    # A crop season must belong to the selected field.
    if int(crop_season.field_id) != int(field.id):
        return None, None, (
            jsonify({
                "status": "error",
                "message": "The crop season does not belong to the selected field."
            }),
            403
        )

    return field, crop_season, None


# ============================================================
# CONVERT LABOUR EXPENSE TO JSON
# ============================================================

def labour_expense_to_dict(expense):
    return {
        "id": expense.id,
        "farmerId": expense.farmer_id,
        "fieldId": expense.field_id,
        "cropSeasonId": expense.crop_season_id,
        "workDate": (
            expense.work_date.isoformat()
            if expense.work_date else None
        ),
        "workType": expense.work_type,
        "workerCount": expense.worker_count,
        "amount": (
            float(expense.amount)
            if expense.amount is not None else None
        ),
        "paymentType": expense.payment_type,
        "paidAmount": (
            float(expense.paid_amount)
            if expense.paid_amount is not None else None
        ),
        "notes": expense.notes,
        "createdAt": (
            expense.created_at.isoformat()
            if getattr(expense, "created_at", None) else None
        )
    }


# ============================================================
# GET ALL LABOUR EXPENSES
# ADMIN: ALL
# FARMER: OWN RECORDS ONLY
# ============================================================

@labour_expense_bp.route("/api/labour-expenses", methods=["GET"])
def get_labour_expenses():
    user, error = require_user()
    if error:
        return error

    try:
        query = LabourExpense.query

        if user.role == "FARMER":
            query = query.filter_by(farmer_id=user.farmer_id)

        expenses = query.order_by(LabourExpense.id.desc()).all()

        return jsonify([
            labour_expense_to_dict(expense)
            for expense in expenses
        ]), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve labour expenses."
        }), 500


# ============================================================
# GET LABOUR EXPENSE BY ID
# ============================================================

@labour_expense_bp.route("/api/labour-expenses/<int:id>", methods=["GET"])
def get_labour_expense(id):
    user, error = require_user()
    if error:
        return error

    try:
        expense = db.session.get(LabourExpense, id)

        if expense is None:
            return jsonify({
                "status": "error",
                "message": "Labour expense not found."
            }), 404

        if not can_manage_farmer(user, expense.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You are not authorized to access this labour expense."
            }), 403

        return jsonify(labour_expense_to_dict(expense)), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve the labour expense."
        }), 500


# ============================================================
# CREATE LABOUR EXPENSE
# ============================================================

@labour_expense_bp.route("/api/labour-expenses", methods=["POST"])
def create_labour_expense():
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON request body is required."
        }), 400

    required = [
        "farmerId",
        "fieldId",
        "cropSeasonId",
        "workDate",
        "workType",
        "amount"
    ]

    missing = [key for key in required if key not in data]
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
            "message": "You can create labour expenses only for your own farmer account."
        }), 403

    work_type, error = validate_optional_text(data, "workType")
    if error:
        return error

    if not work_type:
        return jsonify({
            "status": "error",
            "message": "workType must be a non-empty string."
        }), 400

    work_date, error = parse_work_date(data["workDate"])
    if error:
        return error

    amount, error = parse_number(data["amount"], "amount", allow_zero=False)
    if error:
        return error

    worker_count = None
    if data.get("workerCount") not in (None, ""):
        worker_count, error = parse_positive_id(
            data["workerCount"], "workerCount"
        )
        if error:
            return error

    paid_amount, error = parse_number(
        data.get("paidAmount", 0), "paidAmount"
    )
    if error:
        return error

    if paid_amount > amount:
        return jsonify({
            "status": "error",
            "message": "Paid amount cannot exceed the total labour expense."
        }), 400

    payment_type, error = validate_payment_type(
        data.get("paymentType", "CREDIT")
    )
    if error:
        return error

    notes, error = validate_optional_text(data, "notes")
    if error:
        return error

    try:
        field, crop_season, error = validate_field_and_season(
            data["fieldId"], data["cropSeasonId"], farmer_id
        )
        if error:
            return error

        expense = LabourExpense(
            farmer_id=farmer_id,
            field_id=field.id,
            crop_season_id=crop_season.id,
            work_date=work_date,
            work_type=work_type,
            worker_count=worker_count,
            amount=amount,
            payment_type=payment_type,
            paid_amount=paid_amount,
            notes=notes
        )

        db.session.add(expense)
        db.session.commit()

        return jsonify({
            "message": "Labour expense created successfully",
            "labourExpense": labour_expense_to_dict(expense)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to create labour expense. Check the supplied data."
        }), 500


# ============================================================
# UPDATE LABOUR EXPENSE
# ============================================================

@labour_expense_bp.route("/api/labour-expenses/<int:id>", methods=["PUT"])
def update_labour_expense(id):
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
        "farmerId",
        "fieldId",
        "cropSeasonId",
        "workDate",
        "workType",
        "workerCount",
        "amount",
        "paymentType",
        "paidAmount",
        "notes"
    }

    unknown = set(data.keys()) - allowed
    if unknown:
        return jsonify({
            "status": "error",
            "message": "Unsupported field(s): " + ", ".join(sorted(unknown))
        }), 400

    try:
        expense = db.session.get(LabourExpense, id)

        if expense is None:
            return jsonify({
                "status": "error",
                "message": "Labour expense not found."
            }), 404

        if not can_manage_farmer(user, expense.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You are not authorized to update this labour expense."
            }), 403

        # Farmers may not change the owner of a record.
        target_farmer_id = expense.farmer_id

        if "farmerId" in data:
            target_farmer_id, error = parse_positive_id(
                data["farmerId"], "farmerId"
            )
            if error:
                return error

            if user.role != "ADMIN" and target_farmer_id != user.farmer_id:
                return jsonify({
                    "status": "error",
                    "message": "Farmers cannot change the owner of a labour expense."
                }), 403

        target_field_id = data.get("fieldId", expense.field_id)
        target_crop_season_id = data.get(
            "cropSeasonId", expense.crop_season_id
        )

        field, crop_season, error = validate_field_and_season(
            target_field_id,
            target_crop_season_id,
            target_farmer_id
        )
        if error:
            return error

        target_date = expense.work_date
        if "workDate" in data:
            target_date, error = parse_work_date(data["workDate"])
            if error:
                return error

        target_work_type = expense.work_type
        if "workType" in data:
            target_work_type, error = validate_optional_text(data, "workType")
            if error:
                return error
            if not target_work_type:
                return jsonify({
                    "status": "error",
                    "message": "workType must be a non-empty string."
                }), 400

        target_worker_count = expense.worker_count
        if "workerCount" in data:
            if data["workerCount"] in (None, ""):
                target_worker_count = None
            else:
                target_worker_count, error = parse_positive_id(
                    data["workerCount"], "workerCount"
                )
                if error:
                    return error

        target_amount = float(expense.amount)
        if "amount" in data:
            target_amount, error = parse_number(
                data["amount"], "amount", allow_zero=False
            )
            if error:
                return error

        target_paid_amount = float(expense.paid_amount or 0)
        if "paidAmount" in data:
            target_paid_amount, error = parse_number(
                data["paidAmount"], "paidAmount"
            )
            if error:
                return error

        if target_paid_amount > target_amount:
            return jsonify({
                "status": "error",
                "message": "Paid amount cannot exceed the total labour expense."
            }), 400

        target_payment_type = expense.payment_type
        if "paymentType" in data:
            target_payment_type, error = validate_payment_type(
                data["paymentType"]
            )
            if error:
                return error

        target_notes = expense.notes
        if "notes" in data:
            target_notes, error = validate_optional_text(data, "notes")
            if error:
                return error

        expense.farmer_id = target_farmer_id
        expense.field_id = field.id
        expense.crop_season_id = crop_season.id
        expense.work_date = target_date
        expense.work_type = target_work_type
        expense.worker_count = target_worker_count
        expense.amount = target_amount
        expense.paid_amount = target_paid_amount
        expense.payment_type = target_payment_type
        expense.notes = target_notes

        db.session.commit()

        return jsonify({
            "message": "Labour expense updated successfully",
            "labourExpense": labour_expense_to_dict(expense)
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to update labour expense. Check the supplied data."
        }), 500


# ============================================================
# DELETE LABOUR EXPENSE
# ============================================================

@labour_expense_bp.route("/api/labour-expenses/<int:id>", methods=["DELETE"])
def delete_labour_expense(id):
    user, error = require_user()
    if error:
        return error

    try:
        expense = db.session.get(LabourExpense, id)

        if expense is None:
            return jsonify({
                "status": "error",
                "message": "Labour expense not found."
            }), 404

        if not can_manage_farmer(user, expense.farmer_id):
            return jsonify({
                "status": "error",
                "message": "You are not authorized to delete this labour expense."
            }), 403

        db.session.delete(expense)
        db.session.commit()

        return jsonify({
            "message": "Labour expense deleted successfully"
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Unable to delete labour expense. Check related records."
        }), 500
