from flask import Blueprint, request, jsonify
from decimal import Decimal, InvalidOperation
import math

from backend.extensions import db
from backend.models.interest_charge import InterestCharge
from backend.auth_utils import get_current_user
from datetime import datetime


interest_charge_bp = Blueprint(
    "interest_charge_bp",
    __name__
)


# ============================================================
# CONVERT INTEREST CHARGE TO JSON
# ============================================================

def interest_charge_to_dict(charge):
    return {
        "id": charge.id,
        "farmerId": charge.farmer_id,
        "cropSeasonId": charge.crop_season_id,

        "interestDate": (
            charge.interest_date.isoformat()
            if charge.interest_date
            else None
        ),

        "principalAmount": (
            float(charge.principal_amount)
            if charge.principal_amount is not None
            else None
        ),

        "ratePercent": (
            float(charge.rate_percent)
            if charge.rate_percent is not None
            else None
        ),

        "interestAmount": (
            float(charge.interest_amount)
            if charge.interest_amount is not None
            else None
        ),

        "notes": charge.notes,

        "createdAt": (
            charge.created_at.isoformat()
            if charge.created_at
            else None
        )
    }


# ============================================================
# AUTHORIZATION HELPERS
# ============================================================

def require_user():
    """
    Return (user, None) for a valid authenticated active user.
    Return (None, error_response_tuple) otherwise.

    Pattern mirrors settlement_routes.py and farmer_payment_routes.py.
    """
    user = get_current_user()

    if user is None:
        return None, (
            jsonify({
                "status": "error",
                "message": "Authentication required.",
            }),
            401,
        )

    if user.role not in ("ADMIN", "FARMER"):
        return None, (
            jsonify({
                "status": "error",
                "message": "You do not have permission to access this resource.",
            }),
            403,
        )

    if user.role == "FARMER" and not user.farmer_id:
        return None, (
            jsonify({
                "status": "error",
                "message": "Farmer account is not linked to a farmer record.",
            }),
            403,
        )

    return user, None


def can_access_charge(user, charge):
    """
    Return True if the current user may read this interest charge.

    ADMIN : can access every record.
    FARMER: can access only records belonging to their own farmer account.
    """
    if user.role == "ADMIN":
        return True

    return (
        user.role == "FARMER"
        and user.farmer_id is not None
        and int(user.farmer_id) == int(charge.farmer_id)
    )


# ============================================================
# INPUT VALIDATION HELPERS
# ============================================================

def parse_positive_decimal(value, field_name):
    """
    Validate a monetary or rate field.
    - Must be a finite positive number (> 0).
    - Returns (Decimal, None) on success.
    - Returns (None, error_response_tuple) on failure.
    """
    if isinstance(value, bool):
        return None, (
            jsonify({
                "error": f"{field_name} must be a valid positive number.",
            }),
            400,
        )

    try:
        d = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None, (
            jsonify({
                "error": f"{field_name} must be a valid positive number.",
            }),
            400,
        )

    if not d.is_finite() or d <= 0:
        return None, (
            jsonify({
                "error": f"{field_name} must be a finite positive number greater than zero.",
            }),
            400,
        )

    return d, None


def parse_rate_percent(value):
    """
    Validate ratePercent.
    - Must be a finite positive number (> 0).
    - Default is 2.00 per the business rule; caller supplies that default
      before calling here if the field is absent from the request.
    """
    return parse_positive_decimal(value, "ratePercent")


def parse_interest_date(value):
    """
    Parse an ISO date string (YYYY-MM-DD).
    Returns (date, None) or (None, error_response_tuple).
    """
    if not isinstance(value, str) or not value.strip():
        return None, (
            jsonify({
                "error": "interestDate must use YYYY-MM-DD format.",
            }),
            400,
        )

    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date(), None
    except ValueError:
        return None, (
            jsonify({
                "error": "interestDate must use YYYY-MM-DD format.",
            }),
            400,
        )


def parse_positive_id(value, field_name):
    """
    Validate a foreign-key ID field supplied in a request body.
    Returns (int, None) or (None, error_response_tuple).
    """
    if isinstance(value, bool):
        return None, (
            jsonify({"error": f"{field_name} must be a positive integer."}),
            400,
        )

    try:
        parsed = int(value)
    except (TypeError, ValueError, OverflowError):
        return None, (
            jsonify({"error": f"{field_name} must be a positive integer."}),
            400,
        )

    if parsed <= 0 or str(value).strip() != str(parsed):
        return None, (
            jsonify({"error": f"{field_name} must be a positive integer."}),
            400,
        )

    return parsed, None


# ============================================================
# GET ALL INTEREST CHARGES
#
# ADMIN  : returns every interest charge.
# FARMER : returns only interest charges belonging to their
#          own farmer account.
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges",
    methods=["GET"]
)
def get_interest_charges():

    user, error = require_user()
    if error:
        return error

    if user.role == "ADMIN":
        charges = InterestCharge.query.all()
    else:
        # FARMER: filter to their own records only.
        charges = InterestCharge.query.filter_by(
            farmer_id=user.farmer_id
        ).all()

    return jsonify([
        interest_charge_to_dict(charge)
        for charge in charges
    ])


# ============================================================
# GET INTEREST CHARGE BY ID
#
# ADMIN  : can access any valid record.
# FARMER : can access only their own records.
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges/<int:id>",
    methods=["GET"]
)
def get_interest_charge(id):

    user, error = require_user()
    if error:
        return error

    charge = InterestCharge.query.get(id)

    if not charge:
        return jsonify({
            "error": "Interest charge not found"
        }), 404

    if not can_access_charge(user, charge):
        return jsonify({
            "error": "You are not authorized to access this interest charge.",
        }), 403

    return jsonify(
        interest_charge_to_dict(charge)
    )


# ============================================================
# CREATE INTEREST CHARGE
# ADMIN only.
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges",
    methods=["POST"]
)
def create_interest_charge():

    user, error = require_user()
    if error:
        return error

    if user.role != "ADMIN":
        return jsonify({
            "error": "Administrator access required.",
        }), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A valid JSON request body is required."
        }), 400

    # ---- Required fields ----
    required_fields = [
        "farmerId",
        "interestDate",
        "principalAmount",
        "interestAmount",
    ]
    for field_name in required_fields:
        if data.get(field_name) is None or data.get(field_name) == "":
            return jsonify({
                "error": f"{field_name} is required."
            }), 400

    # ---- farmerId ----
    farmer_id, err = parse_positive_id(data["farmerId"], "farmerId")
    if err:
        return err

    # ---- cropSeasonId (optional) ----
    crop_season_id = None
    if data.get("cropSeasonId") not in (None, ""):
        crop_season_id, err = parse_positive_id(
            data["cropSeasonId"], "cropSeasonId"
        )
        if err:
            return err

    # ---- interestDate ----
    interest_date, err = parse_interest_date(data["interestDate"])
    if err:
        return err

    # ---- principalAmount ----
    principal_amount, err = parse_positive_decimal(
        data["principalAmount"], "principalAmount"
    )
    if err:
        return err

    # ---- ratePercent (optional, default 2.00 per business rule) ----
    raw_rate = data.get("ratePercent", 2.00)
    rate_percent, err = parse_rate_percent(raw_rate)
    if err:
        return err

    # ---- interestAmount ----
    interest_amount, err = parse_positive_decimal(
        data["interestAmount"], "interestAmount"
    )
    if err:
        return err

    try:
        charge = InterestCharge(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id,
            interest_date=interest_date,
            principal_amount=principal_amount,
            rate_percent=rate_percent,
            interest_amount=interest_amount,
            notes=data.get("notes"),
        )

        db.session.add(charge)
        db.session.commit()

        return jsonify({
            "message": "Interest charge created successfully",
            "interestCharge": interest_charge_to_dict(charge),
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Unable to create interest charge. Check the supplied data.",
        }), 500


# ============================================================
# UPDATE INTEREST CHARGE
# ADMIN only.
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges/<int:id>",
    methods=["PUT"]
)
def update_interest_charge(id):

    user, error = require_user()
    if error:
        return error

    if user.role != "ADMIN":
        return jsonify({
            "error": "Administrator access required.",
        }), 403

    charge = InterestCharge.query.get(id)

    if not charge:
        return jsonify({
            "error": "Interest charge not found"
        }), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({
            "error": "A non-empty JSON request body is required."
        }), 400

    allowed = {
        "farmerId", "cropSeasonId", "interestDate",
        "principalAmount", "ratePercent", "interestAmount", "notes",
    }
    unknown = set(data) - allowed
    if unknown:
        return jsonify({
            "error": "Unsupported field(s): " + ", ".join(sorted(unknown)),
        }), 400

    try:

        # ---- farmerId ----
        if "farmerId" in data:
            farmer_id, err = parse_positive_id(data["farmerId"], "farmerId")
            if err:
                return err
            charge.farmer_id = farmer_id

        # ---- cropSeasonId ----
        if "cropSeasonId" in data:
            if data["cropSeasonId"] in (None, ""):
                charge.crop_season_id = None
            else:
                crop_season_id, err = parse_positive_id(
                    data["cropSeasonId"], "cropSeasonId"
                )
                if err:
                    return err
                charge.crop_season_id = crop_season_id

        # ---- interestDate ----
        if "interestDate" in data:
            interest_date, err = parse_interest_date(data["interestDate"])
            if err:
                return err
            charge.interest_date = interest_date

        # ---- principalAmount ----
        if "principalAmount" in data:
            principal_amount, err = parse_positive_decimal(
                data["principalAmount"], "principalAmount"
            )
            if err:
                return err
            charge.principal_amount = principal_amount

        # ---- ratePercent ----
        if "ratePercent" in data:
            rate_percent, err = parse_rate_percent(data["ratePercent"])
            if err:
                return err
            charge.rate_percent = rate_percent

        # ---- interestAmount ----
        if "interestAmount" in data:
            interest_amount, err = parse_positive_decimal(
                data["interestAmount"], "interestAmount"
            )
            if err:
                return err
            charge.interest_amount = interest_amount

        # ---- notes ----
        if "notes" in data:
            charge.notes = data["notes"]

        db.session.commit()

        return jsonify({
            "message": "Interest charge updated successfully",
            "interestCharge": interest_charge_to_dict(charge),
        })

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Unable to update interest charge. Check the supplied data.",
        }), 500


# ============================================================
# DELETE INTEREST CHARGE
# ADMIN only.
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges/<int:id>",
    methods=["DELETE"]
)
def delete_interest_charge(id):

    user, error = require_user()
    if error:
        return error

    if user.role != "ADMIN":
        return jsonify({
            "error": "Administrator access required.",
        }), 403

    charge = InterestCharge.query.get(id)

    if not charge:
        return jsonify({
            "error": "Interest charge not found"
        }), 404

    try:
        db.session.delete(charge)
        db.session.commit()

        return jsonify({
            "message": "Interest charge deleted successfully"
        })

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Unable to delete interest charge. Check related records.",
        }), 500