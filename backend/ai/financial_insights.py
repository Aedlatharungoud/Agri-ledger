from .data_service import build_farmer_financial_dataset


def generate_financial_insights():

    farmers_data = build_farmer_financial_dataset()

    if not farmers_data:
        return {
            "status": "success",
            "message": "No farmer financial data available.",
            "farmers": []
        }

    farmers = []

    for row in farmers_data:

        insights = []

        # =====================================================
        # FINANCIAL VALUES
        # =====================================================

        gross_sales = float(
            row.get("gross_sales", 0) or 0
        )

        deductions = float(
            row.get("sales_deductions", 0) or 0
        )

        market_sale_deductions = float(
            row.get("market_sale_deductions", 0) or 0
        )

        additional_sale_deductions = float(
            row.get("additional_sale_deductions", 0) or 0
        )

        input_credit = float(
            row.get("input_credit", 0) or 0
        )

        labour_credit = float(
            row.get("labour_credit", 0) or 0
        )

        transport = float(
            row.get("transport_cost", 0) or 0
        )

        interest = float(
            row.get("interest", 0) or 0
        )

        net_sales = float(
            row.get("net_sales", 0) or 0
        )

        total_expenses = float(
            row.get("total_expenses", 0) or 0
        )

        estimated_realization = float(
            row.get("estimated_realization", 0) or 0
        )

        # =====================================================
        # SALES INSIGHT
        # =====================================================

        if gross_sales > 0:

            deduction_percentage = (
                deductions / gross_sales
            ) * 100

            if deduction_percentage > 5:

                insights.append({
                    "type": "warning",
                    "category": "sales",
                    "message": (
                        f"Sales deductions are "
                        f"{deduction_percentage:.2f}% "
                        "of gross sales."
                    )
                })

            else:

                insights.append({
                    "type": "positive",
                    "category": "sales",
                    "message": (
                        "Sales deductions are within "
                        "a relatively low range."
                    )
                })

        else:

            insights.append({
                "type": "neutral",
                "category": "sales",
                "message": (
                    "No market sales have been recorded "
                    "for this farmer."
                )
            })

        # =====================================================
        # INPUT CREDIT INSIGHT
        # =====================================================

        if input_credit > 0:

            insights.append({
                "type": "credit",
                "category": "input",
                "message": (
                    f"₹{input_credit:,.2f} "
                    "of input purchase value remains "
                    "as unpaid credit."
                )
            })

        # =====================================================
        # LABOUR CREDIT INSIGHT
        # =====================================================

        if labour_credit > 0:

            insights.append({
                "type": "credit",
                "category": "labour",
                "message": (
                    f"₹{labour_credit:,.2f} "
                    "of labour expenses remain unpaid."
                )
            })

        # =====================================================
        # TRANSPORT INSIGHT
        # =====================================================

        if transport > 0:

            insights.append({
                "type": "expense",
                "category": "transport",
                "message": (
                    f"Transportation cost is "
                    f"₹{transport:,.2f}."
                )
            })

        # =====================================================
        # INTEREST INSIGHT
        # =====================================================

        if interest > 0:

            insights.append({
                "type": "expense",
                "category": "interest",
                "message": (
                    f"Interest charges total "
                    f"₹{interest:,.2f}."
                )
            })

        # =====================================================
        # OVERALL FINANCIAL POSITION
        # =====================================================

        if estimated_realization > 0:

            insights.append({
                "type": "positive",
                "category": "financial",
                "message": (
                    f"Estimated realization after "
                    "recorded expenses is "
                    f"₹{estimated_realization:,.2f}."
                )
            })

        elif estimated_realization < 0:

            insights.append({
                "type": "warning",
                "category": "financial",
                "message": (
                    "Recorded expenses currently exceed "
                    "net sales."
                )
            })

        else:

            insights.append({
                "type": "neutral",
                "category": "financial",
                "message": (
                    "Sales and recorded expenses are "
                    "approximately balanced."
                )
            })

        # =====================================================
        # FARMER RESULT
        # =====================================================

        farmers.append({

            "farmer_id": int(
                row["farmer_id"]
            ),

            "farmer_code": str(
                row["farmer_code"]
            ),

            "farmer_name": str(
                row["farmer_name"]
            ),

            "financial_summary": {

                "gross_sales": gross_sales,

                "sales_deductions": deductions,

                "market_sale_deductions":
                    market_sale_deductions,

                "additional_sale_deductions":
                    additional_sale_deductions,

                "net_sales": net_sales,

                "input_credit": input_credit,

                "labour_credit": labour_credit,

                "transport_cost": transport,

                "interest": interest,

                "total_expenses":
                    total_expenses,

                "estimated_realization":
                    estimated_realization
            },

            "insights": insights
        })

    # =========================================================
    # FINAL RESPONSE
    # =========================================================

    return {
        "status": "success",
        "farmers": farmers
    }