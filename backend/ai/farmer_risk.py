from .data_service import build_farmer_financial_dataset


def calculate_farmer_risk(row):
    """
    Calculate the financial risk level of a farmer
    using the farmer's existing AgriLedger financial data.
    """

    # -------------------------------------------------------
    # FINANCIAL VALUES
    # -------------------------------------------------------

    gross_sales = float(
        row.get("gross_sales") or 0
    )

    deductions = float(
        row.get("sales_deductions") or 0
    )

    input_credit = float(
        row.get("input_credit") or 0
    )

    labour_credit = float(
        row.get("labour_credit") or 0
    )

    transport_cost = float(
        row.get("transport_cost") or 0
    )

    interest = float(
        row.get("interest") or 0
    )

    total_expenses = float(
        row.get("total_expenses") or 0
    )

    estimated_realization = float(
        row.get("estimated_realization") or 0
    )

    # -------------------------------------------------------
    # RISK SCORE
    # -------------------------------------------------------

    risk_score = 0

    risk_reasons = []

    # -------------------------------------------------------
    # 1. NO SALES
    # -------------------------------------------------------

    if gross_sales <= 0:

        risk_score += 25

        risk_reasons.append(
            "No market sales have been recorded."
        )

    # -------------------------------------------------------
    # 2. SALES DEDUCTIONS
    # -------------------------------------------------------

    if gross_sales > 0:

        deduction_percentage = (
            deductions / gross_sales
        ) * 100

        if deduction_percentage > 10:

            risk_score += 20

            risk_reasons.append(
                f"Sales deductions are high at "
                f"{deduction_percentage:.2f}% of gross sales."
            )

        elif deduction_percentage > 5:

            risk_score += 10

            risk_reasons.append(
                f"Sales deductions are "
                f"{deduction_percentage:.2f}% of gross sales."
            )

    # -------------------------------------------------------
    # 3. INPUT CREDIT
    # -------------------------------------------------------

    if input_credit > 0:

        if gross_sales > 0:

            input_credit_percentage = (
                input_credit / gross_sales
            ) * 100

            if input_credit_percentage > 20:

                risk_score += 20

                risk_reasons.append(
                    "Input credit is high compared with "
                    "gross sales."
                )

            elif input_credit_percentage > 10:

                risk_score += 10

                risk_reasons.append(
                    "Input credit represents a noticeable "
                    "portion of gross sales."
                )

        else:

            risk_score += 15

            risk_reasons.append(
                "Outstanding input credit exists "
                "without recorded sales."
            )

    # -------------------------------------------------------
    # 4. LABOUR CREDIT
    # -------------------------------------------------------

    if labour_credit > 0:

        if gross_sales > 0:

            labour_credit_percentage = (
                labour_credit / gross_sales
            ) * 100

            if labour_credit_percentage > 15:

                risk_score += 15

                risk_reasons.append(
                    "Unpaid labour expenses are high "
                    "compared with gross sales."
                )

            elif labour_credit_percentage > 5:

                risk_score += 8

                risk_reasons.append(
                    "Unpaid labour expenses are present."
                )

        else:

            risk_score += 10

            risk_reasons.append(
                "Outstanding labour expenses exist "
                "without recorded sales."
            )

    # -------------------------------------------------------
    # 5. TRANSPORT COST
    # -------------------------------------------------------

    if transport_cost > 0 and gross_sales > 0:

        transport_percentage = (
            transport_cost / gross_sales
        ) * 100

        if transport_percentage > 15:

            risk_score += 15

            risk_reasons.append(
                "Transportation cost is high compared "
                "with gross sales."
            )

        elif transport_percentage > 8:

            risk_score += 8

            risk_reasons.append(
                "Transportation cost is relatively high."
            )

    # -------------------------------------------------------
    # 6. INTEREST
    # -------------------------------------------------------

    if interest > 0:

        risk_score += 10

        risk_reasons.append(
            f"Interest charges of "
            f"₹{interest:,.2f} have been recorded."
        )

    # -------------------------------------------------------
    # 7. NEGATIVE REALIZATION
    # -------------------------------------------------------

    if estimated_realization < 0:

        risk_score += 30

        risk_reasons.append(
            "Recorded expenses currently exceed "
            "net sales."
        )

    # -------------------------------------------------------
    # 8. HIGH EXPENSE RATIO
    # -------------------------------------------------------

    if gross_sales > 0:

        expense_percentage = (
            total_expenses / gross_sales
        ) * 100

        if expense_percentage > 50:

            risk_score += 20

            risk_reasons.append(
                "Recorded expenses are more than "
                "50% of gross sales."
            )

        elif expense_percentage > 30:

            risk_score += 10

            risk_reasons.append(
                "Recorded expenses are a significant "
                "portion of gross sales."
            )

    # -------------------------------------------------------
    # LIMIT SCORE
    # -------------------------------------------------------

    risk_score = min(
        risk_score,
        100
    )

    # -------------------------------------------------------
    # RISK LEVEL
    # -------------------------------------------------------

    if risk_score >= 60:

        risk_level = "HIGH"

    elif risk_score >= 30:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"

    # -------------------------------------------------------
    # FINANCIAL HEALTH
    # -------------------------------------------------------

    if estimated_realization > 0:

        if risk_level == "LOW":

            financial_health = "HEALTHY"

        elif risk_level == "MEDIUM":

            financial_health = "WATCH"

        else:

            financial_health = "AT_RISK"

    elif estimated_realization < 0:

        financial_health = "LOSS"

    else:

        financial_health = "NO_ACTIVITY"

    # -------------------------------------------------------
    # RECOMMENDATIONS
    # -------------------------------------------------------

    recommendations = []

    if gross_sales <= 0:

        recommendations.append(
            "Record market sales when produce is sold "
            "so that the farmer's financial position "
            "can be evaluated."
        )

    if input_credit > 0:

        recommendations.append(
            f"Review outstanding input credit of "
            f"₹{input_credit:,.2f}."
        )

    if labour_credit > 0:

        recommendations.append(
            f"Review unpaid labour expenses of "
            f"₹{labour_credit:,.2f}."
        )

    if transport_cost > 0:

        recommendations.append(
            "Review transportation expenses and "
            "compare them with crop sale value."
        )

    if interest > 0:

        recommendations.append(
            "Review interest charges and settle "
            "outstanding credit where possible."
        )

    if deductions > 0 and gross_sales > 0:

        deduction_percentage = (
            deductions / gross_sales
        ) * 100

        if deduction_percentage > 5:

            recommendations.append(
                "Review market deductions and "
                "identify opportunities to reduce "
                "avoidable charges."
            )

    if estimated_realization < 0:

        recommendations.append(
            "Financial position requires immediate "
            "review because recorded expenses exceed "
            "net sales."
        )

    if not recommendations:

        recommendations.append(
            "Financial position is currently stable "
            "based on recorded transactions."
        )

    # -------------------------------------------------------
    # RESULT
    # -------------------------------------------------------

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "financial_health": financial_health,
        "risk_reasons": risk_reasons,
        "recommendations": recommendations
    }


def generate_farmer_risk_analysis():
    """
    Generate financial risk analysis for every farmer
    registered in AgriLedger.
    """

    farmers_data = (
        build_farmer_financial_dataset()
    )

    if not farmers_data:

        return {
            "status": "success",
            "message": "No farmer financial data available.",
            "farmers": []
        }

    farmers = []

    for row in farmers_data:

        risk_analysis = calculate_farmer_risk(
            row
        )

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

            "risk_analysis": {

                "risk_score":
                    risk_analysis["risk_score"],

                "risk_level":
                    risk_analysis["risk_level"],

                "financial_health":
                    risk_analysis["financial_health"],

                "risk_reasons":
                    risk_analysis["risk_reasons"],

                "recommendations":
                    risk_analysis["recommendations"]
            },

            "financial_summary": {

                "gross_sales":
                    float(
                        row["gross_sales"] or 0
                    ),

                "sales_deductions":
                    float(
                        row["sales_deductions"] or 0
                    ),

                "net_sales":
                    float(
                        row["net_sales"] or 0
                    ),

                "input_credit":
                    float(
                        row["input_credit"] or 0
                    ),

                "labour_credit":
                    float(
                        row["labour_credit"] or 0
                    ),

                "transport_cost":
                    float(
                        row["transport_cost"] or 0
                    ),

                "interest":
                    float(
                        row["interest"] or 0
                    ),

                "total_expenses":
                    float(
                        row["total_expenses"] or 0
                    ),

                "estimated_realization":
                    float(
                        row["estimated_realization"] or 0
                    )
            }
        })

    return {
        "status": "success",
        "farmers": farmers
    }