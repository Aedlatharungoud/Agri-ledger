from flask import Blueprint, request, jsonify
from datetime import date

from backend.extensions import db
from backend.models.settlement import Settlement
from backend.auth_utils import get_current_user


settlement_bp = Blueprint(
    "settlement_bp",
    __name__
)


# ============================================================
# HELPER: CONVERT SETTLEMENT TO JSON
# ============================================================

def settlement_to_dict(settlement):
    return {
        "id": settlement.id,

        "farmerId": settlement.farmer_id,

        "cropSeasonId": settlement.crop_season_id,

        "settlementDate": (
            settlement.settlement_date.isoformat()
            if settlement.settlement_date
            else None
        ),

        "totalCropSales": (
            float(settlement.total_crop_sales)
            if settlement.total_crop_sales is not None
            else 0.0
        ),

        "totalInputCredit": (
            float(settlement.total_input_credit)
            if settlement.total_input_credit is not None
            else 0.0
        ),

        "totalLabourCredit": (
            float(settlement.total_labour_credit)
            if settlement.total_labour_credit is not None
            else 0.0
        ),

        "totalTransport": (
            float(settlement.total_transport)
            if settlement.total_transport is not None
            else 0.0
        ),

        "totalDeductions": (
            float(settlement.total_deductions)
            if settlement.total_deductions is not None
            else 0.0
        ),

        "totalInterest": (
            float(settlement.total_interest)
            if settlement.total_interest is not None
            else 0.0
        ),

        "totalPayments": (
            float(settlement.total_payments)
            if settlement.total_payments is not None
            else 0.0
        ),

        "finalAmount": (
            float(settlement.final_amount)
            if settlement.final_amount is not None
            else 0.0
        ),

        "settlementStatus": settlement.settlement_status,

        "notes": settlement.notes,

        "createdAt": (
            settlement.created_at.isoformat()
            if settlement.created_at
            else None
        )
    }


# ============================================================
# HELPER: CALCULATE FINAL SETTLEMENT AMOUNT
# ============================================================

def calculate_final_amount(
    total_crop_sales,
    total_input_credit,
    total_labour_credit,
    total_transport,
    total_deductions,
    total_interest,
):
    """
    Final farmer settlement before payments:

    Gross Crop Sales
    - Input Credit
    - Labour Credit
    - Transport
    - Sale Deductions
    - Interest
    """
    return round(
        float(total_crop_sales or 0)
        - float(total_input_credit or 0)
        - float(total_labour_credit or 0)
        - float(total_transport or 0)
        - float(total_deductions or 0)
        - float(total_interest or 0),
        2,
    )


def is_transport_deduction(deduction_type: str) -> bool:
    """
    Check if a sale deduction type represents transport charges.
    Transport records are the canonical source of truth for transport costs.
    """
    if not deduction_type:
        return False
    dtype = str(deduction_type).strip().lower()
    return any(
        kw in dtype
        for kw in ("transport", "freight", "truck", "lorry")
    )


# ============================================================
# HELPERS: AUTHORIZATION
# ============================================================

def require_user():
    """
    Return (user, None) for a valid authenticated active user.
    Return (None, error_response_tuple) otherwise.

    Follows the same pattern used in farmer_payment_routes.py
    and harvest_routes.py.
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


def can_access_settlement(user, settlement):
    """
    Return True if the current user is permitted to read this settlement.

    ADMIN:
        Can access every settlement.

    FARMER:
        Can access only settlements that belong to their own farmer record.
    """
    if user.role == "ADMIN":
        return True

    return (
        user.role == "FARMER"
        and user.farmer_id is not None
        and int(user.farmer_id) == int(settlement.farmer_id)
    )


# ============================================================
# GET ALL SETTLEMENTS
#
# ADMIN  : returns every settlement.
# FARMER : returns only settlements belonging to their own
#          farmer account.
# ============================================================

@settlement_bp.route(
    "/api/settlements",
    methods=["GET"]
)
def get_settlements():

    user, error = require_user()
    if error:
        return error

    if user.role == "ADMIN":
        settlements = Settlement.query.all()
    else:
        # FARMER: filter to their own records only.
        settlements = Settlement.query.filter_by(
            farmer_id=user.farmer_id
        ).all()

    return jsonify([
        settlement_to_dict(settlement)
        for settlement in settlements
    ])


# ============================================================
# GET SINGLE SETTLEMENT
#
# ADMIN  : can access any settlement.
# FARMER : can access only a settlement belonging to their
#          own farmer account.
# ============================================================

@settlement_bp.route(
    "/api/settlements/<int:id>",
    methods=["GET"]
)
def get_settlement(id):

    user, error = require_user()
    if error:
        return error

    settlement = Settlement.query.get(id)

    if not settlement:
        return jsonify({
            "error": "Settlement not found"
        }), 404

    if not can_access_settlement(user, settlement):
        return jsonify({
            "error": "You are not authorized to access this settlement.",
        }), 403

    return jsonify(
        settlement_to_dict(settlement)
    )


# ============================================================
# CREATE SETTLEMENT MANUALLY
# ADMIN only.
# ============================================================

@settlement_bp.route(
    "/api/settlements",
    methods=["POST"]
)
def create_settlement():

    user, error = require_user()
    if error:
        return error

    if user.role != "ADMIN":
        return jsonify({
            "error": "Administrator access required.",
        }), 403

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmerId",
        "settlementDate"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"{field} is required"
            }), 400

    try:

        settlement_date = date.fromisoformat(
            data["settlementDate"]
        )

        from backend.models.farmer import Farmer
        target_farmer = Farmer.query.get(data["farmerId"])
        if not target_farmer:
            return jsonify({
                "error": "The specified farmerId does not exist.",
            }), 404

        if data.get("cropSeasonId"):
            from backend.models.crop_season import CropSeason
            from backend.models.field import Field
            target_season = CropSeason.query.get(data["cropSeasonId"])
            if not target_season:
                return jsonify({
                    "error": "The specified cropSeasonId does not exist.",
                }), 404
            field = Field.query.get(target_season.field_id)
            if not field or field.farmer_id != data["farmerId"]:
                return jsonify({
                    "error": "The specified cropSeasonId does not belong to this farmer.",
                }), 400

        total_crop_sales = float(
            data.get("totalCropSales", 0) or 0
        )
        total_input_credit = float(
            data.get("totalInputCredit", 0) or 0
        )
        total_labour_credit = float(
            data.get("totalLabourCredit", 0) or 0
        )
        total_transport = float(
            data.get("totalTransport", 0) or 0
        )
        total_deductions = float(
            data.get("totalDeductions", 0) or 0
        )
        total_interest = float(
            data.get("totalInterest", 0) or 0
        )
        total_payments = float(
            data.get("totalPayments", 0) or 0
        )

        # IMPORTANT:
        # Never trust a manually supplied finalAmount.
        # The backend is the single source of truth.
        final_amount = calculate_final_amount(
            total_crop_sales,
            total_input_credit,
            total_labour_credit,
            total_transport,
            total_deductions,
            total_interest,
        )

        settlement = Settlement(
            farmer_id=data["farmerId"],
            crop_season_id=data.get("cropSeasonId"),
            settlement_date=settlement_date,
            total_crop_sales=total_crop_sales,
            total_input_credit=total_input_credit,
            total_labour_credit=total_labour_credit,
            total_transport=total_transport,
            total_deductions=total_deductions,
            total_interest=total_interest,
            total_payments=total_payments,
            final_amount=final_amount,
            settlement_status=data.get(
                "settlementStatus",
                "PENDING"
            ),
            notes=data.get("notes")
        )

        db.session.add(settlement)
        db.session.commit()

        return jsonify({
            "message":
                "Settlement created successfully",
            "settlement":
                settlement_to_dict(settlement)
        }), 201

    except ValueError:
        db.session.rollback()
        return jsonify({
            "error":
                "Settlement date and numeric values are invalid"
        }), 400

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Unable to create settlement. Check the supplied data."
        }), 500
# ADMIN only.
# ============================================================

@settlement_bp.route(
    "/api/settlements/<int:id>",
    methods=["PUT"]
)
def update_settlement(id):

    user, error = require_user()
    if error:
        return error

    if user.role != "ADMIN":
        return jsonify({
            "error": "Administrator access required.",
        }), 403

    settlement = Settlement.query.get(id)

    if not settlement:
        return jsonify({
            "error": "Settlement not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "farmerId" in data:
            from backend.models.farmer import Farmer
            target_farmer = Farmer.query.get(data["farmerId"])
            if not target_farmer:
                return jsonify({
                    "error": "The specified farmerId does not exist.",
                }), 404
            settlement.farmer_id = data["farmerId"]

        if "cropSeasonId" in data:
            settlement.crop_season_id = data["cropSeasonId"]

        if "settlementDate" in data:
            settlement.settlement_date = date.fromisoformat(
                data["settlementDate"]
            )

        if "totalCropSales" in data:
            settlement.total_crop_sales = float(
                data["totalCropSales"] or 0
            )

        if "totalInputCredit" in data:
            settlement.total_input_credit = float(
                data["totalInputCredit"] or 0
            )

        if "totalLabourCredit" in data:
            settlement.total_labour_credit = float(
                data["totalLabourCredit"] or 0
            )

        if "totalTransport" in data:
            settlement.total_transport = float(
                data["totalTransport"] or 0
            )

        if "totalDeductions" in data:
            settlement.total_deductions = float(
                data["totalDeductions"] or 0
            )

        if "totalInterest" in data:
            settlement.total_interest = float(
                data["totalInterest"] or 0
            )

        if "totalPayments" in data:
            settlement.total_payments = float(
                data["totalPayments"] or 0
            )

        # IMPORTANT:
        # Ignore data["finalAmount"].
        # Always recalculate it from the settlement components.
        settlement.final_amount = calculate_final_amount(
            settlement.total_crop_sales,
            settlement.total_input_credit,
            settlement.total_labour_credit,
            settlement.total_transport,
            settlement.total_deductions,
            settlement.total_interest,
        )

        if "settlementStatus" in data:
            settlement.settlement_status = data[
                "settlementStatus"
            ]

        if "notes" in data:
            settlement.notes = data["notes"]

        db.session.commit()

        return jsonify({
            "message":
                "Settlement updated successfully",
            "settlement":
                settlement_to_dict(settlement)
        })

    except ValueError:
        db.session.rollback()
        return jsonify({
            "error":
                "Settlement date and numeric values are invalid"
        }), 400

    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "Unable to update settlement. Check the supplied data."
        }), 500


# ============================================================
# DELETE SETTLEMENT
# ADMIN only.
# ============================================================

@settlement_bp.route(
    "/api/settlements/<int:id>",
    methods=["DELETE"]
)
def delete_settlement(id):

    user, error = require_user()
    if error:
        return error

    if user.role != "ADMIN":
        return jsonify({
            "error": "Administrator access required.",
        }), 403

    settlement = Settlement.query.get(id)

    if not settlement:
        return jsonify({
            "error": "Settlement not found"
        }), 404

    try:

        db.session.delete(settlement)

        db.session.commit()

        return jsonify({
            "message":
                "Settlement deleted successfully"
        })

    except Exception:

        db.session.rollback()

        return jsonify({
            "error": "Unable to delete settlement. It may have related records."
        }), 500


# ============================================================
# CALCULATE SETTLEMENT
#
# ADMIN  : can calculate for any farmer.
# FARMER : can calculate only for their own farmer_id.
#
# The calculation is read-only — it does not write to the
# database.
# ============================================================

@settlement_bp.route(
    "/api/settlements/calculate/<int:farmer_id>/<int:crop_season_id>",
    methods=["GET"]
)
def calculate_settlement(
    farmer_id,
    crop_season_id
):

    from backend.models.market_sale import MarketSale
    from backend.models.input_purchase import InputPurchase
    from backend.models.labour_expense import LabourExpense
    from backend.models.sale_deduction import SaleDeduction
    from backend.models.transport_record import TransportRecord
    from backend.models.interest_charge import InterestCharge
    from backend.models.farmer_payment import FarmerPayment
    from backend.models.harvest import Harvest

    # ====================================================
    # AUTHORIZATION
    # ====================================================

    user, error = require_user()
    if error:
        return error

    if user.role == "FARMER":
        if (
            user.farmer_id is None
            or int(user.farmer_id) != int(farmer_id)
        ):
            return jsonify({
                "error": (
                    "You can only view calculations "
                    "for your own farmer account."
                ),
            }), 403

    try:

        # ====================================================
        # FIND EXISTING SETTLEMENT
        # ====================================================

        existing_settlement = Settlement.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).first()


        # ====================================================
        # FIND HARVESTS
        # ====================================================

        harvests = Harvest.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).all()

        harvest_ids = [
            harvest.id
            for harvest in harvests
        ]


        # ====================================================
        # MARKET SALES
        # ====================================================

        sales = []

        if harvest_ids:

            sales = MarketSale.query.filter(
                MarketSale.farmer_id == farmer_id,
                MarketSale.harvest_id.in_(
                    harvest_ids
                )
            ).all()

        total_crop_sales = sum(
            float(sale.gross_amount or 0)
            for sale in sales
        )


        # ====================================================
        # INPUT CREDIT
        # ====================================================

        purchases = InputPurchase.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).all()

        total_input_credit = sum(

            float(
                (purchase.quantity or 0)
                *
                (purchase.unit_price or 0)
                -
                (purchase.paid_amount or 0)
            )

            for purchase in purchases

            if purchase.payment_type in [
                "CREDIT",
                "PARTIAL"
            ]
        )


        # ====================================================
        # LABOUR CREDIT
        # ====================================================

        labour_expenses = LabourExpense.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).all()

        total_labour_credit = sum(

            float(
                (expense.amount or 0)
                -
                (expense.paid_amount or 0)
            )

            for expense in labour_expenses

            if expense.payment_type in [
                "CREDIT",
                "PARTIAL"
            ]
        )


        # ====================================================
        # TRANSPORT (Canonical source for transport charges)
        # ====================================================

        transport_records = []

        if harvest_ids:

            transport_records = TransportRecord.query.filter(
                TransportRecord.harvest_id.in_(
                    harvest_ids
                )
            ).all()

        total_transport = sum(

            float(record.freight_amount or 0)
            +
            float(record.loading_charges or 0)
            +
            float(record.unloading_charges or 0)

            for record in transport_records
        )


        # ====================================================
        # SALE DEDUCTIONS
        # Deduplicate transport: if transport is canonically captured
        # via transport_records, exclude transport-type deductions to
        # prevent double-counting.
        # ====================================================

        sale_ids = [
            sale.id
            for sale in sales
        ]

        deductions = []

        if sale_ids:

            deductions = SaleDeduction.query.filter(
                SaleDeduction.sale_id.in_(
                    sale_ids
                )
            ).all()

        if total_transport > 0:
            deductions_to_sum = [
                d for d in deductions
                if not is_transport_deduction(d.deduction_type)
            ]
        else:
            deductions_to_sum = deductions

        total_deductions = sum(
            float(deduction.amount or 0)
            for deduction in deductions_to_sum
        )


        # ====================================================
        # INTEREST
        # ====================================================

        interest_charges = InterestCharge.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).all()

        total_interest = sum(
            float(charge.interest_amount or 0)
            for charge in interest_charges
        )


        # ====================================================
        # FARMER PAYMENTS
        # ====================================================

        total_payments = 0.0

        if existing_settlement:

            payments = FarmerPayment.query.filter_by(
                farmer_id=farmer_id,
                settlement_id=existing_settlement.id
            ).all()

            total_payments = sum(
                float(payment.amount or 0)
                for payment in payments
            )


        # ====================================================
        # FINAL SETTLEMENT
        #
        # Gross Sales
        # - Input Credit
        # - Labour Credit
        # - Transport
        # - Sale Deductions
        # - Interest
        #
        # IMPORTANT:
        # Transport is now correctly included.
        # ====================================================

        final_amount = calculate_final_amount(
            total_crop_sales,
            total_input_credit,
            total_labour_credit,
            total_transport,
            total_deductions,
            total_interest,
        )


        # ====================================================
        # OUTSTANDING AMOUNT
        # ====================================================

        outstanding_amount = (
            final_amount
            -
            total_payments
        )


        # ====================================================
        # RETURN CALCULATION
        # ====================================================

        return jsonify({

            "farmerId":
                farmer_id,

            "cropSeasonId":
                crop_season_id,

            "totalCropSales":
                round(
                    total_crop_sales,
                    2
                ),

            "totalInputCredit":
                round(
                    total_input_credit,
                    2
                ),

            "totalLabourCredit":
                round(
                    total_labour_credit,
                    2
                ),

            "totalTransport":
                round(
                    total_transport,
                    2
                ),

            "totalDeductions":
                round(
                    total_deductions,
                    2
                ),

            "totalInterest":
                round(
                    total_interest,
                    2
                ),

            "totalPayments":
                round(
                    total_payments,
                    2
                ),

            "finalAmount":
                round(
                    final_amount,
                    2
                ),

            "outstandingAmount":
                round(
                    outstanding_amount,
                    2
                ),

            "status":
                "CALCULATED"
        })

    except Exception:

        return jsonify({
            "error": "Unable to calculate settlement. Check the farmer and crop season."
        }), 500


# ============================================================
# GENERATE AUTOMATIC SETTLEMENT
# ADMIN only.
#
# Farmers must not be able to generate or alter their own
# settlement records.
# ============================================================

@settlement_bp.route(
    "/api/settlements/generate/<int:farmer_id>/<int:crop_season_id>",
    methods=["POST"]
)
def generate_settlement(
    farmer_id,
    crop_season_id
):

    from backend.models.market_sale import MarketSale
    from backend.models.input_purchase import InputPurchase
    from backend.models.labour_expense import LabourExpense
    from backend.models.sale_deduction import SaleDeduction
    from backend.models.transport_record import TransportRecord
    from backend.models.interest_charge import InterestCharge
    from backend.models.harvest import Harvest

    # ====================================================
    # AUTHORIZATION
    # ====================================================

    user, error = require_user()
    if error:
        return error

    if user.role != "ADMIN":
        return jsonify({
            "error": "Administrator access required.",
        }), 403

    try:
        from backend.models.farmer import Farmer
        from backend.models.crop_season import CropSeason
        from backend.models.field import Field

        target_farmer = Farmer.query.get(farmer_id)
        if not target_farmer:
            return jsonify({
                "error": "The specified farmerId does not exist.",
            }), 404

        target_season = CropSeason.query.get(crop_season_id)
        if not target_season:
            return jsonify({
                "error": "The specified cropSeasonId does not exist.",
            }), 404

        field = Field.query.get(target_season.field_id)
        if not field or field.farmer_id != farmer_id:
            return jsonify({
                "error": "The specified cropSeasonId does not belong to this farmer.",
            }), 400

        # ====================================================
        # CHECK EXISTING SETTLEMENT
        # ====================================================

        existing_settlement = Settlement.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).first()

        if existing_settlement:

            return jsonify({

                "message":
                    "Settlement already exists",

                "settlement":
                    settlement_to_dict(
                        existing_settlement
                    )

            }), 409


        # ====================================================
        # FIND HARVESTS
        # ====================================================

        harvests = Harvest.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).all()

        harvest_ids = [
            harvest.id
            for harvest in harvests
        ]


        # ====================================================
        # MARKET SALES
        # ====================================================

        sales = []

        if harvest_ids:

            sales = MarketSale.query.filter(
                MarketSale.farmer_id == farmer_id,
                MarketSale.harvest_id.in_(
                    harvest_ids
                )
            ).all()

        total_crop_sales = sum(
            float(sale.gross_amount or 0)
            for sale in sales
        )


        # ====================================================
        # INPUT CREDIT
        # ====================================================

        purchases = InputPurchase.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).all()

        total_input_credit = sum(

            float(
                (purchase.quantity or 0)
                *
                (purchase.unit_price or 0)
                -
                (purchase.paid_amount or 0)
            )

            for purchase in purchases

            if purchase.payment_type in [
                "CREDIT",
                "PARTIAL"
            ]
        )


        # ====================================================
        # LABOUR CREDIT
        # ====================================================

        labour_expenses = LabourExpense.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).all()

        total_labour_credit = sum(

            float(
                (expense.amount or 0)
                -
                (expense.paid_amount or 0)
            )

            for expense in labour_expenses

            if expense.payment_type in [
                "CREDIT",
                "PARTIAL"
            ]
        )


        # ====================================================
        # TRANSPORT (Canonical source for transport charges)
        # ====================================================

        transport_records = []

        if harvest_ids:

            transport_records = TransportRecord.query.filter(
                TransportRecord.harvest_id.in_(
                    harvest_ids
                )
            ).all()

        total_transport = sum(

            float(record.freight_amount or 0)
            +
            float(record.loading_charges or 0)
            +
            float(record.unloading_charges or 0)

            for record in transport_records
        )


        # ====================================================
        # SALE DEDUCTIONS
        # Deduplicate transport: if transport is canonically captured
        # via transport_records, exclude transport-type deductions to
        # prevent double-counting.
        # ====================================================

        sale_ids = [
            sale.id
            for sale in sales
        ]

        deductions = []

        if sale_ids:

            deductions = SaleDeduction.query.filter(
                SaleDeduction.sale_id.in_(
                    sale_ids
                )
            ).all()

        if total_transport > 0:
            deductions_to_sum = [
                d for d in deductions
                if not is_transport_deduction(d.deduction_type)
            ]
        else:
            deductions_to_sum = deductions

        total_deductions = sum(
            float(deduction.amount or 0)
            for deduction in deductions_to_sum
        )


        # ====================================================
        # INTEREST
        # ====================================================

        interest_charges = InterestCharge.query.filter_by(
            farmer_id=farmer_id,
            crop_season_id=crop_season_id
        ).all()

        total_interest = sum(
            float(charge.interest_amount or 0)
            for charge in interest_charges
        )


        # ====================================================
        # NEW SETTLEMENT HAS NO PAYMENTS
        # ====================================================

        total_payments = 0.0


        # ====================================================
        # FINAL SETTLEMENT
        #
        # Gross Sales
        # - Input Credit
        # - Labour Credit
        # - Transport
        # - Sale Deductions
        # - Interest
        # ====================================================

        final_amount = calculate_final_amount(
            total_crop_sales,
            total_input_credit,
            total_labour_credit,
            total_transport,
            total_deductions,
            total_interest,
        )


        # ====================================================
        # CREATE SETTLEMENT
        # ====================================================

        settlement = Settlement(

            farmer_id=farmer_id,

            crop_season_id=crop_season_id,

            settlement_date=date.today(),

            total_crop_sales=total_crop_sales,

            total_input_credit=total_input_credit,

            total_labour_credit=total_labour_credit,

            total_transport=total_transport,

            total_deductions=total_deductions,

            total_interest=total_interest,

            total_payments=total_payments,

            final_amount=final_amount,

            settlement_status="PENDING",

            notes=
                "Automatically generated settlement"
        )


        db.session.add(settlement)

        db.session.commit()


        # ====================================================
        # RETURN CREATED SETTLEMENT
        # ====================================================

        return jsonify({

            "message":
                "Settlement generated successfully",

            "settlement":
                settlement_to_dict(
                    settlement
                )

        }), 201


    except Exception:

        db.session.rollback()

        return jsonify({
            "error": "Unable to generate settlement. Check the farmer and crop season."
        }), 500