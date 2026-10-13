from .data_service import build_farmer_financial_dataset


def generate_farmer_recommendations():

    farmers_data = build_farmer_financial_dataset()

    if not farmers_data:

        return {
            "status": "success",
            "message": "No farmer financial data available.",
            "farmers": []
        }

    farmers = []

    for row in farmers_data:

        recommendations = []
        priority_actions = []

        # =====================================================
        # FINANCIAL VALUES
        # =====================================================

        gross_sales = float(
            row.get("gross_sales", 0) or 0
        )

        deductions = float(
            row.get("sales_deductions", 0) or 0
        )

        input_credit = float(
            row.get("input_credit", 0) or 0
        )

        labour_credit = float(
            row.get("labour_credit", 0) or 0
        )

        transport_cost = float(
            row.get("transport_cost", 0) or 0
        )

        interest = float(
            row.get("interest", 0) or 0
        )

        total_expenses = float(
            row.get("total_expenses", 0) or 0
        )

        net_sales = float(
            row.get("net_sales", 0) or 0
        )

        estimated_realization = float(
            row.get("estimated_realization", 0) or 0
        )

        # =====================================================
        # SALES RECOMMENDATIONS
        # =====================================================

        if gross_sales <= 0:

            recommendations.append({
                "priority": "MEDIUM",
                "category": "sales",
                "title": "Record market sales",
                "message": (
                    "No market sales are currently recorded "
                    "for this farmer. Record sales transactions "
                    "when produce is sold to maintain an accurate "
                    "financial history."
                )
            })

            priority_actions.append(
                "Record market sales when produce is sold."
            )

        else:

            deduction_percentage = (
                deductions / gross_sales
            ) * 100

            if deduction_percentage > 10:

                recommendations.append({
                    "priority": "HIGH",
                    "category": "sales",
                    "title": "Review market deductions",
                    "message": (
                        f"Sales deductions are "
                        f"{deduction_percentage:.2f}% "
                        "of gross sales. Review commissions, "
                        "market fees and other deductions."
                    )
                })

                priority_actions.append(
                    "Review high market deductions."
                )

            elif deduction_percentage > 5:

                recommendations.append({
                    "priority": "MEDIUM",
                    "category": "sales",
                    "title": "Monitor market deductions",
                    "message": (
                        f"Sales deductions represent "
                        f"{deduction_percentage:.2f}% "
                        "of gross sales. Continue monitoring "
                        "these deductions."
                    )
                })

        # =====================================================
        # INPUT CREDIT
        # =====================================================

        if input_credit > 0:

            if gross_sales > 0:

                credit_percentage = (
                    input_credit / gross_sales
                ) * 100

            else:

                credit_percentage = 100

            if credit_percentage > 20:

                priority = "HIGH"

            elif credit_percentage > 10:

                priority = "MEDIUM"

            else:

                priority = "LOW"

            recommendations.append({
                "priority": priority,
                "category": "input_credit",
                "title": "Review input credit",
                "message": (
                    f"Outstanding input credit is "
                    f"₹{input_credit:,.2f}. Review the "
                    "supplier balance and plan repayment."
                )
            })

            priority_actions.append(
                f"Review outstanding input credit "
                f"of ₹{input_credit:,.2f}."
            )

        # =====================================================
        # LABOUR CREDIT
        # =====================================================

        if labour_credit > 0:

            if gross_sales > 0:

                labour_percentage = (
                    labour_credit / gross_sales
                ) * 100

            else:

                labour_percentage = 100

            if labour_percentage > 15:

                priority = "HIGH"

            elif labour_percentage > 5:

                priority = "MEDIUM"

            else:

                priority = "LOW"

            recommendations.append({
                "priority": priority,
                "category": "labour",
                "title": "Review unpaid labour",
                "message": (
                    f"Unpaid labour expenses total "
                    f"₹{labour_credit:,.2f}. Review worker "
                    "balances and planned payments."
                )
            })

            priority_actions.append(
                f"Review unpaid labour expenses "
                f"of ₹{labour_credit:,.2f}."
            )

        # =====================================================
        # TRANSPORT
        # =====================================================

        if transport_cost > 0:

            if gross_sales > 0:

                transport_percentage = (
                    transport_cost / gross_sales
                ) * 100

            else:

                transport_percentage = 100

            if transport_percentage > 15:

                priority = "HIGH"

                message = (
                    f"Transportation cost of "
                    f"₹{transport_cost:,.2f} is high "
                    "relative to recorded sales. Review "
                    "freight, loading and unloading charges."
                )

                priority_actions.append(
                    "Review high transportation expenses."
                )

            elif transport_percentage > 8:

                priority = "MEDIUM"

                message = (
                    f"Transportation cost is "
                    f"₹{transport_cost:,.2f}. Compare freight "
                    "and handling charges with alternative "
                    "transport options."
                )

            else:

                priority = "LOW"

                message = (
                    f"Transportation cost is "
                    f"₹{transport_cost:,.2f}. Continue "
                    "monitoring transportation expenses."
                )

            recommendations.append({
                "priority": priority,
                "category": "transport",
                "title": "Review transportation cost",
                "message": message
            })

        # =====================================================
        # INTEREST
        # =====================================================

        if interest > 0:

            recommendations.append({
                "priority": "MEDIUM",
                "category": "interest",
                "title": "Review interest charges",
                "message": (
                    f"Interest charges of "
                    f"₹{interest:,.2f} have been recorded. "
                    "Review outstanding balances and "
                    "repayment options."
                )
            })

            priority_actions.append(
                f"Review interest charges "
                f"of ₹{interest:,.2f}."
            )

        # =====================================================
        # EXPENSE RATIO
        # =====================================================

        if gross_sales > 0:

            expense_percentage = (
                total_expenses / gross_sales
            ) * 100

            if expense_percentage > 50:

                recommendations.append({
                    "priority": "HIGH",
                    "category": "expenses",
                    "title": "Control recorded expenses",
                    "message": (
                        f"Recorded expenses represent "
                        f"{expense_percentage:.2f}% of gross "
                        "sales. Review major expense categories "
                        "to improve financial realization."
                    )
                })

                priority_actions.append(
                    "Review major expenses against sales."
                )

            elif expense_percentage > 30:

                recommendations.append({
                    "priority": "MEDIUM",
                    "category": "expenses",
                    "title": "Monitor expense levels",
                    "message": (
                        f"Recorded expenses represent "
                        f"{expense_percentage:.2f}% of gross "
                        "sales. Monitor expenses to protect "
                        "farmer realization."
                    )
                })

        # =====================================================
        # NEGATIVE REALIZATION
        # =====================================================

        if estimated_realization < 0:

            recommendations.append({
                "priority": "CRITICAL",
                "category": "financial",
                "title": "Immediate financial review",
                "message": (
                    "Recorded expenses currently exceed "
                    "net sales. Review sales, credit, labour, "
                    "transport and interest records immediately."
                )
            })

            priority_actions.append(
                "Perform an immediate financial review."
            )

        # =====================================================
        # POSITIVE FINANCIAL POSITION
        # =====================================================

        elif estimated_realization > 0:

            recommendations.append({
                "priority": "LOW",
                "category": "financial",
                "title": "Maintain positive realization",
                "message": (
                    f"Current estimated realization is "
                    f"₹{estimated_realization:,.2f}. Continue "
                    "monitoring expenses and outstanding credit "
                    "to maintain a healthy financial position."
                )
            })

        # =====================================================
        # NO ACTIVITY
        # =====================================================

        if (
            gross_sales == 0
            and total_expenses == 0
            and input_credit == 0
            and labour_credit == 0
            and transport_cost == 0
            and interest == 0
        ):

            recommendations.append({
                "priority": "LOW",
                "category": "activity",
                "title": "Begin transaction tracking",
                "message": (
                    "No financial transactions are currently "
                    "recorded for this farmer. Add purchases, "
                    "labour, harvest and sales records as they "
                    "occur."
                )
            })

        # =====================================================
        # FALLBACK
        # =====================================================

        if not recommendations:

            recommendations.append({
                "priority": "LOW",
                "category": "financial",
                "title": "Continue monitoring",
                "message": (
                    "The current financial records do not show "
                    "any major issues requiring immediate action."
                )
            })

        # =====================================================
        # SORT RECOMMENDATIONS BY PRIORITY
        # =====================================================

        priority_order = {
            "CRITICAL": 0,
            "HIGH": 1,
            "MEDIUM": 2,
            "LOW": 3
        }

        recommendations.sort(
            key=lambda item: priority_order.get(
                item["priority"],
                99
            )
        )

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

            "recommendation_summary": {

                "recommendation_count":
                    len(recommendations),

                "priority_action_count":
                    len(priority_actions),

                "priority_actions":
                    priority_actions
            },

            "recommendations":
                recommendations,

            "financial_summary": {

                "gross_sales":
                    gross_sales,

                "sales_deductions":
                    deductions,

                "net_sales":
                    net_sales,

                "input_credit":
                    input_credit,

                "labour_credit":
                    labour_credit,

                "transport_cost":
                    transport_cost,

                "interest":
                    interest,

                "total_expenses":
                    total_expenses,

                "estimated_realization":
                    estimated_realization
            }
        })

    # =========================================================
    # FINAL RESPONSE
    # =========================================================

    return {
        "status": "success",
        "farmers": farmers
    }