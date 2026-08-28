from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.interest_charge import InterestCharge
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
# GET ALL INTEREST CHARGES
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges",
    methods=["GET"]
)
def get_interest_charges():

    charges = InterestCharge.query.all()

    return jsonify([
        interest_charge_to_dict(charge)
        for charge in charges
    ])


# ============================================================
# GET INTEREST CHARGE BY ID
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges/<int:id>",
    methods=["GET"]
)
def get_interest_charge(id):

    charge = InterestCharge.query.get(id)

    if not charge:
        return jsonify({
            "error": "Interest charge not found"
        }), 404

    return jsonify(
        interest_charge_to_dict(charge)
    )


# ============================================================
# CREATE INTEREST CHARGE
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges",
    methods=["POST"]
)
def create_interest_charge():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmerId",
        "interestDate",
        "principalAmount",
        "interestAmount"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    try:

        interest_date = datetime.strptime(
            data["interestDate"],
            "%Y-%m-%d"
        ).date()

        charge = InterestCharge(
            farmer_id=data["farmerId"],
            crop_season_id=data.get("cropSeasonId"),
            interest_date=interest_date,
            principal_amount=data["principalAmount"],
            rate_percent=data.get(
                "ratePercent",
                2.00
            ),
            interest_amount=data["interestAmount"],
            notes=data.get("notes")
        )

        db.session.add(charge)
        db.session.commit()

        return jsonify({
            "message": "Interest charge created successfully",
            "interestCharge": interest_charge_to_dict(
                charge
            )
        }), 201

    except ValueError:

        return jsonify({
            "error": "interestDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE INTEREST CHARGE
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges/<int:id>",
    methods=["PUT"]
)
def update_interest_charge(id):

    charge = InterestCharge.query.get(id)

    if not charge:
        return jsonify({
            "error": "Interest charge not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "farmerId" in data:
            charge.farmer_id = data["farmerId"]

        if "cropSeasonId" in data:
            charge.crop_season_id = data["cropSeasonId"]

        if "interestDate" in data:

            charge.interest_date = datetime.strptime(
                data["interestDate"],
                "%Y-%m-%d"
            ).date()

        if "principalAmount" in data:
            charge.principal_amount = data[
                "principalAmount"
            ]

        if "ratePercent" in data:
            charge.rate_percent = data[
                "ratePercent"
            ]

        if "interestAmount" in data:
            charge.interest_amount = data[
                "interestAmount"
            ]

        if "notes" in data:
            charge.notes = data["notes"]

        db.session.commit()

        return jsonify({
            "message": "Interest charge updated successfully",
            "interestCharge": interest_charge_to_dict(
                charge
            )
        })

    except ValueError:

        return jsonify({
            "error": "interestDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE INTEREST CHARGE
# ============================================================

@interest_charge_bp.route(
    "/api/interest-charges/<int:id>",
    methods=["DELETE"]
)
def delete_interest_charge(id):

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

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500