
from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.auth_utils import get_current_user
from backend.models.farmer_payment import FarmerPayment
from backend.models.farmer import Farmer
from backend.models.settlement import Settlement


farmer_payment_bp = Blueprint("farmer_payment_bp", __name__)


def payment_error(message, status):
    return jsonify({"status": "error", "message": message}), status


def parse_amount(value):
    if isinstance(value, bool) or value is None:
        raise ValueError("amount must be a valid positive number")

    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError("amount must be a valid positive number")

    if not amount.is_finite() or amount <= 0:
        raise ValueError("amount must be greater than 0")

    return amount


def parse_positive_id(value, field_name):
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be a positive integer")

    try:
        parsed = int(value)
    except (ValueError, TypeError, OverflowError):
        raise ValueError(f"{field_name} must be a positive integer")

    if str(value).strip() != str(parsed) or parsed <= 0:
        raise ValueError(f"{field_name} must be a positive integer")

    return parsed


def current_user_or_error():
    user = get_current_user()

    if not user:
        return None, payment_error("Authentication required.", 401)

    if user.role not in ("ADMIN", "FARMER"):
        return None, payment_error("Access denied.", 403)

    if user.role == "FARMER" and not user.farmer_id:
        return None, payment_error(
            "Farmer account is not linked to a farmer record.", 403
        )

    return user, None


def can_access_payment(user, payment):
    return user.role == "ADMIN" or (
        user.role == "FARMER"
        and user.farmer_id is not None
        and int(user.farmer_id) == int(payment.farmer_id)
    )


def validate_payment_links(farmer_id, settlement_id):
    farmer = db.session.get(Farmer, farmer_id)

    if not farmer:
        return "Farmer not found.", 404

    if settlement_id is not None:
        settlement = db.session.get(Settlement, settlement_id)

        if not settlement:
            return "Settlement not found.", 404

        if int(settlement.farmer_id) != int(farmer_id):
            return "Payment farmer must match the settlement farmer.", 400

    return None


@farmer_payment_bp.route("/api/farmer-payments", methods=["GET"])
def get_farmer_payments():
    user, error = current_user_or_error()
    if error:
        return error

    query = FarmerPayment.query

    if user.role == "FARMER":
        query = query.filter_by(farmer_id=user.farmer_id)

    payments = query.order_by(FarmerPayment.id.desc()).all()
    return jsonify([payment.to_dict() for payment in payments])


@farmer_payment_bp.route("/api/farmer-payments/<int:id>", methods=["GET"])
def get_farmer_payment(id):
    user, error = current_user_or_error()
    if error:
        return error

    payment = db.session.get(FarmerPayment, id)

    if not payment:
        return payment_error("Farmer payment not found.", 404)

    if not can_access_payment(user, payment):
        return payment_error("You can only access your own payments.", 403)

    return jsonify(payment.to_dict())


@farmer_payment_bp.route("/api/farmer-payments", methods=["POST"])
def create_farmer_payment():
    user, error = current_user_or_error()
    if error:
        return error

    if user.role != "ADMIN":
        return payment_error("Only administrators can record payments.", 403)

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return payment_error("A valid JSON request body is required.", 400)

    for field in ("farmerId", "paymentDate", "amount", "paymentMode"):
        if data.get(field) is None or data.get(field) == "":
            return payment_error(f"{field} is required.", 400)

    try:
        farmer_id = parse_positive_id(data["farmerId"], "farmerId")
        settlement_id = (
            parse_positive_id(data["settlementId"], "settlementId")
            if data.get("settlementId") not in (None, "")
            else None
        )
        amount = parse_amount(data["amount"])
        payment_date = date.fromisoformat(data["paymentDate"])

        payment_mode = str(data["paymentMode"]).strip()
        if not payment_mode:
            return payment_error("paymentMode cannot be empty.", 400)

        link_error = validate_payment_links(farmer_id, settlement_id)
        if link_error:
            return payment_error(*link_error)

        payment = FarmerPayment(
            farmer_id=farmer_id,
            settlement_id=settlement_id,
            payment_date=payment_date,
            amount=amount,
            payment_mode=payment_mode,
            reference_number=data.get("referenceNumber"),
            notes=data.get("notes"),
        )

        db.session.add(payment)
        db.session.flush()

        if settlement_id is not None:
            settlement = db.session.get(Settlement, settlement_id)
            payments = FarmerPayment.query.filter_by(
                settlement_id=settlement_id
            ).all()
            settlement.total_payments = sum(
                (Decimal(str(p.amount or 0)) for p in payments),
                Decimal("0")
            )

        db.session.commit()

        return jsonify({
            "message": "Farmer payment created successfully",
            "payment": payment.to_dict(),
        }), 201

    except (ValueError, TypeError):
        db.session.rollback()
        return payment_error(
            "Check farmerId, settlementId, paymentDate and amount.", 400
        )
    except Exception:
        db.session.rollback()
        return payment_error("Unable to create farmer payment.", 500)


@farmer_payment_bp.route("/api/farmer-payments/<int:id>", methods=["PUT"])
def update_farmer_payment(id):
    user, error = current_user_or_error()
    if error:
        return error

    if user.role != "ADMIN":
        return payment_error("Only administrators can update payments.", 403)

    payment = db.session.get(FarmerPayment, id)

    if not payment:
        return payment_error("Farmer payment not found.", 404)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return payment_error("A valid JSON request body is required.", 400)

    old_settlement_id = payment.settlement_id

    try:
        farmer_id = (
            parse_positive_id(data["farmerId"], "farmerId")
            if "farmerId" in data else payment.farmer_id
        )

        settlement_id = (
            parse_positive_id(data["settlementId"], "settlementId")
            if data.get("settlementId") not in (None, "")
            else None
        ) if "settlementId" in data else payment.settlement_id

        amount = (
            parse_amount(data["amount"])
            if "amount" in data else Decimal(str(payment.amount))
        )

        payment_date = (
            date.fromisoformat(data["paymentDate"])
            if "paymentDate" in data else payment.payment_date
        )

        payment_mode = (
            str(data["paymentMode"]).strip()
            if "paymentMode" in data else payment.payment_mode
        )

        if not payment_mode:
            return payment_error("paymentMode cannot be empty.", 400)

        link_error = validate_payment_links(farmer_id, settlement_id)
        if link_error:
            return payment_error(*link_error)

        payment.farmer_id = farmer_id
        payment.settlement_id = settlement_id
        payment.amount = amount
        payment.payment_date = payment_date
        payment.payment_mode = payment_mode

        if "referenceNumber" in data:
            payment.reference_number = data["referenceNumber"]
        if "notes" in data:
            payment.notes = data["notes"]

        db.session.flush()

        for sid in {old_settlement_id, settlement_id} - {None}:
            settlement = db.session.get(Settlement, sid)
            if settlement:
                payments = FarmerPayment.query.filter_by(
                    settlement_id=sid
                ).all()
                settlement.total_payments = sum(
                    (Decimal(str(p.amount or 0)) for p in payments),
                    Decimal("0")
                )

        db.session.commit()

        return jsonify({
            "message": "Farmer payment updated successfully",
            "payment": payment.to_dict(),
        })

    except (ValueError, TypeError):
        db.session.rollback()
        return payment_error(
            "Check payment date, amount and linked records.", 400
        )
    except Exception:
        db.session.rollback()
        return payment_error("Unable to update farmer payment.", 500)


@farmer_payment_bp.route("/api/farmer-payments/<int:id>", methods=["DELETE"])
def delete_farmer_payment(id):
    user, error = current_user_or_error()
    if error:
        return error

    if user.role != "ADMIN":
        return payment_error("Only administrators can delete payments.", 403)

    payment = db.session.get(FarmerPayment, id)

    if not payment:
        return payment_error("Farmer payment not found.", 404)

    settlement_id = payment.settlement_id

    try:
        db.session.delete(payment)
        db.session.flush()

        if settlement_id is not None:
            settlement = db.session.get(Settlement, settlement_id)
            if settlement:
                payments = FarmerPayment.query.filter_by(
                    settlement_id=settlement_id
                ).all()
                settlement.total_payments = sum(
                    (Decimal(str(p.amount or 0)) for p in payments),
                    Decimal("0")
                )

        db.session.commit()

        return jsonify({"message": "Farmer payment deleted successfully"})

    except Exception:
        db.session.rollback()
        return payment_error("Unable to delete farmer payment.", 500)
