from backend.models.farmer import Farmer
from backend.models.harvest import Harvest
from backend.models.market_sale import MarketSale
from backend.models.input_purchase import InputPurchase
from backend.models.labour_expense import LabourExpense
from backend.models.sale_deduction import SaleDeduction
from backend.models.transport_record import TransportRecord
from backend.models.interest_charge import InterestCharge


def build_farmer_financial_dataset():

    farmers = Farmer.query.all()

    rows = []

    for farmer in farmers:

        farmer_id = farmer.id

        # =====================================================
        # HARVESTS
        # =====================================================

        harvests = Harvest.query.filter_by(
            farmer_id=farmer_id
        ).all()

        harvest_ids = [
            harvest.id
            for harvest in harvests
        ]

        # =====================================================
        # MARKET SALES
        # =====================================================

        sales = []

        if harvest_ids:

            sales = MarketSale.query.filter(
                MarketSale.farmer_id == farmer_id,
                MarketSale.harvest_id.in_(harvest_ids)
            ).all()

        gross_sales = sum(
            float(sale.gross_amount or 0)
            for sale in sales
        )

        # =====================================================
        # MARKET SALE DEDUCTIONS
        #
        # MarketSale itself stores:
        # commission
        # market_fee
        # other_deduction
        # =====================================================

        market_sale_deductions = sum(
            float(sale.commission or 0)
            + float(sale.market_fee or 0)
            + float(sale.other_deduction or 0)
            for sale in sales
        )

        # =====================================================
        # ADDITIONAL SALE DEDUCTIONS
        #
        # SaleDeduction is used for separately recorded
        # deduction entries.
        # =====================================================

        sale_ids = [
            sale.id
            for sale in sales
        ]

        deductions = []

        if sale_ids:

            deductions = SaleDeduction.query.filter(
                SaleDeduction.sale_id.in_(sale_ids)
            ).all()

        additional_deductions = sum(
            float(deduction.amount or 0)
            for deduction in deductions
        )

        # =====================================================
        # TOTAL SALES DEDUCTIONS
        # =====================================================

        total_deductions = (
            market_sale_deductions
            + additional_deductions
        )

        # =====================================================
        # INPUT PURCHASES
        # =====================================================

        purchases = InputPurchase.query.filter_by(
            farmer_id=farmer_id
        ).all()

        total_input_purchase = sum(
            float(purchase.quantity or 0)
            * float(purchase.unit_price or 0)
            for purchase in purchases
        )

        total_input_paid = sum(
            float(purchase.paid_amount or 0)
            for purchase in purchases
        )

        input_credit = max(
            total_input_purchase - total_input_paid,
            0
        )

        # =====================================================
        # LABOUR
        # =====================================================

        labour_expenses = LabourExpense.query.filter_by(
            farmer_id=farmer_id
        ).all()

        total_labour = sum(
            float(expense.amount or 0)
            for expense in labour_expenses
        )

        total_labour_paid = sum(
            float(expense.paid_amount or 0)
            for expense in labour_expenses
        )

        labour_credit = max(
            total_labour - total_labour_paid,
            0
        )

        # =====================================================
        # TRANSPORT
        # =====================================================

        transport_records = []

        if harvest_ids:

            transport_records = TransportRecord.query.filter(
                TransportRecord.harvest_id.in_(harvest_ids)
            ).all()

        total_transport = sum(
            float(record.freight_amount or 0)
            + float(record.loading_charges or 0)
            + float(record.unloading_charges or 0)
            for record in transport_records
        )

        # =====================================================
        # INTEREST
        # =====================================================

        interest_charges = InterestCharge.query.filter_by(
            farmer_id=farmer_id
        ).all()

        total_interest = sum(
            float(charge.interest_amount or 0)
            for charge in interest_charges
        )

        # =====================================================
        # FINANCIAL CALCULATIONS
        # =====================================================

        net_sales = (
            gross_sales
            - total_deductions
        )

        total_expenses = (
            input_credit
            + labour_credit
            + total_transport
            + total_interest
        )

        estimated_realization = (
            net_sales
            - total_expenses
        )

        # =====================================================
        # ADD FARMER DATA
        # =====================================================

        rows.append({

            "farmer_id": farmer.id,

            "farmer_code": farmer.farmer_code,

            "farmer_name": farmer.name,

            "gross_sales": gross_sales,

            "sales_deductions": total_deductions,

            "market_sale_deductions":
                market_sale_deductions,

            "additional_sale_deductions":
                additional_deductions,

            "net_sales": net_sales,

            "input_purchase_value":
                total_input_purchase,

            "input_paid":
                total_input_paid,

            "input_credit":
                input_credit,

            "labour_total":
                total_labour,

            "labour_paid":
                total_labour_paid,

            "labour_credit":
                labour_credit,

            "transport_cost":
                total_transport,

            "interest":
                total_interest,

            "total_expenses":
                total_expenses,

            "estimated_realization":
                estimated_realization,

            "harvest_count":
                len(harvests),

            "market_sale_count":
                len(sales),

            "input_purchase_count":
                len(purchases),

            "labour_record_count":
                len(labour_expenses),

            "interest_record_count":
                len(interest_charges)
        })

    return rows