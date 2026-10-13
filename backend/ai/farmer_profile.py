from .data_service import build_farmer_financial_dataset
from .farmer_risk import calculate_farmer_risk
from .recommendations import generate_farmer_recommendations


def generate_farmer_profiles():

    farmers_data = build_farmer_financial_dataset()

    if not farmers_data:

        return {
            "status": "success",
            "message": "No farmer financial data available.",
            "farmers": []
        }

    # ---------------------------------------------------------
    # Get recommendation data
    # ---------------------------------------------------------

    recommendations_result = (
        generate_farmer_recommendations()
    )

    recommendation_farmers = {
        farmer["farmer_id"]: farmer
        for farmer in recommendations_result.get(
            "farmers",
            []
        )
    }

    farmers = []

    for row in farmers_data:

        farmer_id = int(
            row["farmer_id"]
        )

        farmer_code = str(
            row["farmer_code"]
        )

        farmer_name = str(
            row["farmer_name"]
        )

        # =====================================================
        # FINANCIAL SUMMARY
        # =====================================================

        financial_summary = {

            "gross_sales": float(
                row.get("gross_sales", 0) or 0
            ),

            "sales_deductions": float(
                row.get("sales_deductions", 0) or 0
            ),

            "net_sales": float(
                row.get("net_sales", 0) or 0
            ),

            "input_credit": float(
                row.get("input_credit", 0) or 0
            ),

            "labour_credit": float(
                row.get("labour_credit", 0) or 0
            ),

            "transport_cost": float(
                row.get("transport_cost", 0) or 0
            ),

            "interest": float(
                row.get("interest", 0) or 0
            ),

            "total_expenses": float(
                row.get("total_expenses", 0) or 0
            ),

            "estimated_realization": float(
                row.get("estimated_realization", 0) or 0
            ),

            "harvest_count": int(
                row.get("harvest_count", 0) or 0
            ),

            "market_sale_count": int(
                row.get("market_sale_count", 0) or 0
            ),

            "input_purchase_count": int(
                row.get("input_purchase_count", 0) or 0
            ),

            "labour_record_count": int(
                row.get("labour_record_count", 0) or 0
            ),

            "interest_record_count": int(
                row.get("interest_record_count", 0) or 0
            )
        }

        # =====================================================
        # RISK ANALYSIS
        # =====================================================

        risk_analysis = calculate_farmer_risk(
            row
        )

        # =====================================================
        # RECOMMENDATIONS
        # =====================================================

        recommendation_data = (
            recommendation_farmers.get(
                farmer_id,
                {}
            )
        )

        recommendations = (
            recommendation_data.get(
                "recommendations",
                []
            )
        )

        recommendation_summary = (
            recommendation_data.get(
                "recommendation_summary",
                {
                    "recommendation_count": 0,
                    "priority_action_count": 0,
                    "priority_actions": []
                }
            )
        )

        # =====================================================
        # FINANCIAL STATUS
        # =====================================================

        estimated_realization = (
            financial_summary[
                "estimated_realization"
            ]
        )

        if estimated_realization > 0:

            financial_status = "POSITIVE"

        elif estimated_realization < 0:

            financial_status = "LOSS"

        else:

            financial_status = "NO_ACTIVITY"

        # =====================================================
        # OUTSTANDING AMOUNT
        # =====================================================

        outstanding_amount = (
            financial_summary["input_credit"]
            + financial_summary["labour_credit"]
            + financial_summary["interest"]
        )

        # =====================================================
        # PROFILE SUMMARY
        # =====================================================

        profile_summary = {

            "financial_status":
                financial_status,

            "financial_health":
                risk_analysis[
                    "financial_health"
                ],

            "risk_level":
                risk_analysis[
                    "risk_level"
                ],

            "risk_score":
                risk_analysis[
                    "risk_score"
                ],

            "outstanding_amount":
                outstanding_amount,

            "estimated_realization":
                estimated_realization
        }

        # =====================================================
        # AI OBSERVATIONS
        # =====================================================

        observations = []

        # Sales observation

        if financial_summary["gross_sales"] > 0:

            observations.append(
                "Market sales have been recorded "
                "for this farmer."
            )

        else:

            observations.append(
                "No market sales have been recorded "
                "for this farmer."
            )

        # Credit observation

        if financial_summary["input_credit"] > 0:

            observations.append(
                f"Outstanding input credit is "
                f"₹{financial_summary['input_credit']:,.2f}."
            )

        # Labour observation

        if financial_summary["labour_credit"] > 0:

            observations.append(
                f"Unpaid labour expenses are "
                f"₹{financial_summary['labour_credit']:,.2f}."
            )

        # Transport observation

        if financial_summary["transport_cost"] > 0:

            observations.append(
                f"Transportation cost is "
                f"₹{financial_summary['transport_cost']:,.2f}."
            )

        # Interest observation

        if financial_summary["interest"] > 0:

            observations.append(
                f"Interest charges total "
                f"₹{financial_summary['interest']:,.2f}."
            )

        # Realization observation

        if estimated_realization > 0:

            observations.append(
                f"Estimated realization is "
                f"₹{estimated_realization:,.2f}."
            )

        elif estimated_realization < 0:

            observations.append(
                "Recorded expenses currently exceed "
                "net sales."
            )

        # Risk observation

        observations.append(
            f"Current financial risk level is "
            f"{risk_analysis['risk_level']} "
            f"with a score of "
            f"{risk_analysis['risk_score']}/100."
        )

        # =====================================================
        # FARMER PROFILE
        # =====================================================

        farmers.append({

            "farmer_id":
                farmer_id,

            "farmer_code":
                farmer_code,

            "farmer_name":
                farmer_name,

            "profile_summary":
                profile_summary,

            "financial_summary":
                financial_summary,

            "risk_analysis": {

                "risk_score":
                    risk_analysis[
                        "risk_score"
                    ],

                "risk_level":
                    risk_analysis[
                        "risk_level"
                    ],

                "financial_health":
                    risk_analysis[
                        "financial_health"
                    ],

                "risk_reasons":
                    risk_analysis[
                        "risk_reasons"
                    ]
            },

            "ai_observations":
                observations,

            "recommendation_summary":
                recommendation_summary,

            "recommendations":
                recommendations
        })

    # =========================================================
    # FINAL RESPONSE
    # =========================================================

    return {

        "status": "success",

        "farmers": farmers

    }