from flask import Blueprint, request, jsonify
from datetime import date

from backend.extensions import db
from backend.models.settlement import Settlement


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
# GET ALL SETTLEMENTS
# ============================================================

@settlement_bp.route(
    "/api/settlements",
    methods=["GET"]
)
def get_settlements():

    settlements = Settlement.query.all()

    return jsonify([
        settlement_to_dict(settlement)
        for settlement in settlements
    ])


# ============================================================
# GET SINGLE SETTLEMENT
# ============================================================

@settlement_bp.route(
    "/api/settlements/<int:id>",
    methods=["GET"]
)
def get_settlement(id):

    settlement = Settlement.query.get(id)

    if not settlement:

        return jsonify({
            "error": "Settlement not found"
        }), 404

    return jsonify(
        settlement_to_dict(settlement)
    )


# ============================================================
# CREATE SETTLEMENT MANUALLY
# ============================================================

@settlement_bp.route(
    "/api/settlements",
    methods=["POST"]
)
def create_settlement():

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

        settlement = Settlement(

            farmer_id=data["farmerId"],

            crop_season_id=data.get(
                "cropSeasonId"
            ),

            settlement_date=settlement_date,

            total_crop_sales=data.get(
                "totalCropSales",
                0
            ),

            total_input_credit=data.get(
                "totalInputCredit",
                0
            ),

            total_labour_credit=data.get(
                "totalLabourCredit",
                0
            ),

            total_transport=data.get(
                "totalTransport",
                0
            ),

            total_deductions=data.get(
                "totalDeductions",
                0
            ),

            total_interest=data.get(
                "totalInterest",
                0
            ),

            total_payments=data.get(
                "totalPayments",
                0
            ),

            final_amount=data.get(
                "finalAmount",
                0
            ),

            settlement_status=data.get(
                "settlementStatus",
                "PENDING"
            ),

            notes=data.get(
                "notes"
            )
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

        return jsonify({
            "error":
                "settlementDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE SETTLEMENT
# ============================================================

@settlement_bp.route(
    "/api/settlements/<int:id>",
    methods=["PUT"]
)
def update_settlement(id):

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

            settlement.farmer_id = data[
                "farmerId"
            ]

        if "cropSeasonId" in data:

            settlement.crop_season_id = data[
                "cropSeasonId"
            ]

        if "settlementDate" in data:

            settlement.settlement_date = date.fromisoformat(
                data["settlementDate"]
            )

        if "totalCropSales" in data:

            settlement.total_crop_sales = data[
                "totalCropSales"
            ]

        if "totalInputCredit" in data:

            settlement.total_input_credit = data[
                "totalInputCredit"
            ]

        if "totalLabourCredit" in data:

            settlement.total_labour_credit = data[
                "totalLabourCredit"
            ]

        if "totalTransport" in data:

            settlement.total_transport = data[
                "totalTransport"
            ]

        if "totalDeductions" in data:

            settlement.total_deductions = data[
                "totalDeductions"
            ]

        if "totalInterest" in data:

            settlement.total_interest = data[
                "totalInterest"
            ]

        if "totalPayments" in data:

            settlement.total_payments = data[
                "totalPayments"
            ]

        if "finalAmount" in data:

            settlement.final_amount = data[
                "finalAmount"
            ]

        if "settlementStatus" in data:

            settlement.settlement_status = data[
                "settlementStatus"
            ]

        if "notes" in data:

            settlement.notes = data[
                "notes"
            ]

        db.session.commit()

        return jsonify({

            "message":
                "Settlement updated successfully",

            "settlement":
                settlement_to_dict(settlement)

        })

    except ValueError:

        return jsonify({
            "error":
                "settlementDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE SETTLEMENT
# ============================================================

@settlement_bp.route(
    "/api/settlements/<int:id>",
    methods=["DELETE"]
)
def delete_settlement(id):

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

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# CALCULATE SETTLEMENT
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
        # SALE DEDUCTIONS
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

        total_deductions = sum(
            float(deduction.amount or 0)
            for deduction in deductions
        )

        # ====================================================
        # TRANSPORT
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
        #
        # IMPORTANT:
        #
        # Payments are now connected directly to settlements.
        #
        # If this crop season already has a settlement,
        # only payments belonging to that settlement are counted.
        #
        # If no settlement exists yet, payments are zero.
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
        # FINAL AMOUNT
        #
        # Transport is NOT subtracted separately because
        # transport may already be included in sale deductions.
        # ====================================================

        final_amount = (
            total_crop_sales
            -
            total_input_credit
            -
            total_labour_credit
            -
            total_deductions
            -
            total_interest
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

            "status":
                "CALCULATED"
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# GENERATE AUTOMATIC SETTLEMENT
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

    try:

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
        # SALE DEDUCTIONS
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

        total_deductions = sum(
            float(deduction.amount or 0)
            for deduction in deductions
        )

        # ====================================================
        # TRANSPORT
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
        # NEW SETTLEMENT HAS NO PAYMENTS YET
        # ====================================================

        total_payments = 0.0

        # ====================================================
        # FINAL AMOUNT
        # ====================================================

        final_amount = (
            total_crop_sales
            -
            total_input_credit
            -
            total_labour_credit
            -
            total_deductions
            -
            total_interest
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

            notes="Automatically generated settlement"
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

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500