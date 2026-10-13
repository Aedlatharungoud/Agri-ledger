from .farmer_profile import generate_farmer_profiles


def _normalize_text(text):
    """
    Normalize a user question so that simple
    keyword matching becomes more reliable.
    """

    return " ".join(
        text.lower().strip().split()
    )


def _find_farmer(question, farmers):
    """
    Try to identify a farmer from the user's question.

    Supports:
    - Farmer name
    - Farmer code
    """

    normalized_question = _normalize_text(
        question
    )

    for farmer in farmers:

        farmer_name = _normalize_text(
            farmer["farmer_name"]
        )

        farmer_code = _normalize_text(
            farmer["farmer_code"]
        )

        if farmer_name in normalized_question:
            return farmer

        if farmer_code in normalized_question:
            return farmer

    return None


def _format_currency(amount):
    """
    Format a numeric value as Indian currency.
    """

    return f"₹{amount:,.2f}"


def _build_farmer_overview(farmer):
    """
    Build a natural-language overview of a farmer.
    """

    profile = farmer["profile_summary"]

    financial = farmer["financial_summary"]

    risk = farmer["risk_analysis"]

    outstanding = profile[
        "outstanding_amount"
    ]

    realization = profile[
        "estimated_realization"
    ]

    response = (
        f"{farmer['farmer_name']} "
        f"({farmer['farmer_code']}) has a "
        f"{profile['financial_health'].lower()} "
        f"financial position with a "
        f"{risk['risk_level'].lower()} risk level "
        f"and a risk score of "
        f"{risk['risk_score']}/100. "
    )

    if financial["gross_sales"] > 0:

        response += (
            f"Gross sales are "
            f"{_format_currency(financial['gross_sales'])}, "
            f"net sales are "
            f"{_format_currency(financial['net_sales'])}, "
            f"and estimated realization is "
            f"{_format_currency(realization)}. "
        )

    else:

        response += (
            "No market sales are currently recorded. "
        )

    if outstanding > 0:

        response += (
            f"Total outstanding amount is "
            f"{_format_currency(outstanding)}. "
        )

    else:

        response += (
            "There is currently no recorded "
            "outstanding amount. "
        )

    return response.strip()


def _build_financial_answer(farmer):
    """
    Build a financial summary response.
    """

    financial = farmer[
        "financial_summary"
    ]

    return (
        f"{farmer['farmer_name']} has gross sales of "
        f"{_format_currency(financial['gross_sales'])}, "
        f"sales deductions of "
        f"{_format_currency(financial['sales_deductions'])}, "
        f"net sales of "
        f"{_format_currency(financial['net_sales'])}, "
        f"total recorded expenses of "
        f"{_format_currency(financial['total_expenses'])}, "
        f"and estimated realization of "
        f"{_format_currency(financial['estimated_realization'])}."
    )


def _build_realization_answer(farmer):
    """
    Explain the farmer's estimated realization.
    """

    financial = farmer[
        "financial_summary"
    ]

    net_sales = financial[
        "net_sales"
    ]

    expenses = financial[
        "total_expenses"
    ]

    realization = financial[
        "estimated_realization"
    ]

    return (
        f"{farmer['farmer_name']}'s estimated realization "
        f"is {_format_currency(realization)}. "
        f"This is calculated from net sales of "
        f"{_format_currency(net_sales)} after "
        f"recorded expenses of "
        f"{_format_currency(expenses)}."
    )


def _build_outstanding_answer(farmer):
    """
    Explain outstanding balances.
    """

    financial = farmer[
        "financial_summary"
    ]

    input_credit = financial[
        "input_credit"
    ]

    labour_credit = financial[
        "labour_credit"
    ]

    interest = financial[
        "interest"
    ]

    total = (
        input_credit
        + labour_credit
        + interest
    )

    if total <= 0:

        return (
            f"{farmer['farmer_name']} currently has "
            "no recorded outstanding input credit, "
            "labour credit, or interest."
        )

    return (
        f"{farmer['farmer_name']} has total recorded "
        f"outstanding amounts of "
        f"{_format_currency(total)}. "
        f"This includes input credit of "
        f"{_format_currency(input_credit)}, "
        f"unpaid labour of "
        f"{_format_currency(labour_credit)}, "
        f"and interest of "
        f"{_format_currency(interest)}."
    )


def _build_risk_answer(farmer):
    """
    Explain farmer risk.
    """

    risk = farmer[
        "risk_analysis"
    ]

    response = (
        f"{farmer['farmer_name']} has a "
        f"{risk['risk_level'].lower()} financial risk "
        f"level with a risk score of "
        f"{risk['risk_score']}/100. "
        f"Financial health is classified as "
        f"{risk['financial_health'].lower()}."
    )

    reasons = risk.get(
        "risk_reasons",
        []
    )

    if reasons:

        response += " Main risk observations: "

        response += " ".join(
            reasons
        )

    return response


def _build_recommendation_answer(farmer):
    """
    Return the most important recommendations
    for a farmer.
    """

    recommendations = farmer.get(
        "recommendations",
        []
    )

    if not recommendations:

        return (
            f"No specific recommendations are "
            f"currently available for "
            f"{farmer['farmer_name']}."
        )

    response = (
        f"Here are the current recommendations "
        f"for {farmer['farmer_name']}:"
    )

    for recommendation in recommendations:

        response += (
            f"\n• "
            f"{recommendation['title']}: "
            f"{recommendation['message']}"
        )

    return response


def _build_observation_answer(farmer):
    """
    Return AI-generated observations from the
    farmer profile.
    """

    observations = farmer.get(
        "ai_observations",
        []
    )

    if not observations:

        return (
            f"There are no additional AI observations "
            f"for {farmer['farmer_name']}."
        )

    response = (
        f"AI observations for "
        f"{farmer['farmer_name']}:"
    )

    for observation in observations:

        response += (
            f"\n• {observation}"
        )

    return response


def _build_all_farmers_answer(farmers):
    """
    Return a concise overview of all farmers.
    """

    count = len(farmers)

    if count == 0:

        return (
            "There are currently no farmers "
            "recorded in AgriLedger."
        )

    response = (
        f"AgriLedger currently has "
        f"{count} farmer"
        f"{'s' if count != 1 else ''} recorded."
    )

    for farmer in farmers:

        profile = farmer[
            "profile_summary"
        ]

        response += (
            f"\n• "
            f"{farmer['farmer_name']} "
            f"({farmer['farmer_code']}) — "
            f"{profile['financial_health']}, "
            f"risk {profile['risk_level']}."
        )

    return response


def _build_credit_farmers_answer(farmers):
    """
    Find farmers with outstanding credit.
    """

    credit_farmers = []

    for farmer in farmers:

        financial = farmer[
            "financial_summary"
        ]

        input_credit = financial[
            "input_credit"
        ]

        labour_credit = financial[
            "labour_credit"
        ]

        interest = financial[
            "interest"
        ]

        total = (
            input_credit
            + labour_credit
            + interest
        )

        if total > 0:

            credit_farmers.append(
                (
                    farmer,
                    total
                )
            )

    if not credit_farmers:

        return (
            "No farmers currently have recorded "
            "outstanding credit or interest."
        )

    response = (
        "Farmers with outstanding recorded balances:"
    )

    for farmer, total in credit_farmers:

        response += (
            f"\n• "
            f"{farmer['farmer_name']} — "
            f"{_format_currency(total)}"
        )

    return response


def _build_risk_farmers_answer(farmers):
    """
    Find farmers with the highest risk scores.
    """

    if not farmers:

        return (
            "There are currently no farmers "
            "available for risk analysis."
        )

    sorted_farmers = sorted(
        farmers,
        key=lambda farmer: farmer[
            "risk_analysis"
        ]["risk_score"],
        reverse=True
    )

    response = (
        "Farmer risk levels based on the current "
        "AgriLedger records:"
    )

    for farmer in sorted_farmers:

        risk = farmer[
            "risk_analysis"
        ]

        response += (
            f"\n• "
            f"{farmer['farmer_name']} — "
            f"{risk['risk_level']} "
            f"({risk['risk_score']}/100)"
        )

    return response


def _build_no_sales_answer(farmers):
    """
    Find farmers without recorded market sales.
    """

    no_sales = []

    for farmer in farmers:

        financial = farmer[
            "financial_summary"
        ]

        if financial[
            "market_sale_count"
        ] == 0:

            no_sales.append(
                farmer
            )

    if not no_sales:

        return (
            "All currently recorded farmers have "
            "at least one market sale."
        )

    response = (
        "Farmers with no recorded market sales:"
    )

    for farmer in no_sales:

        response += (
            f"\n• "
            f"{farmer['farmer_name']} "
            f"({farmer['farmer_code']})"
        )

    return response


def _build_help_answer():
    """
    Explain the types of questions the assistant supports.
    """

    return (
        "I can help you with AgriLedger information such as:\n"
        "• Farmer financial position\n"
        "• Gross sales and net sales\n"
        "• Estimated realization\n"
        "• Outstanding input and labour credit\n"
        "• Farmer risk level and risk score\n"
        "• AI recommendations\n"
        "• Farmers with outstanding credit\n"
        "• Farmers with no market sales\n"
        "• Overall farmer information"
    )


def _detect_intent(question):
    """
    Detect the main intent of a user question.
    """

    question = _normalize_text(
        question
    )

    # ---------------------------------------------------------
    # HELP
    # ---------------------------------------------------------

    if (
        "help" in question
        or "what can you do" in question
        or "what can i ask" in question
    ):

        return "help"

    # ---------------------------------------------------------
    # OUTSTANDING / CREDIT
    # ---------------------------------------------------------

    if (
        "outstanding" in question
        or "credit" in question
        or "owe" in question
        or "owes" in question
        or "debt" in question
        or "unpaid" in question
    ):

        return "outstanding"

    # ---------------------------------------------------------
    # RISK
    # ---------------------------------------------------------

    if (
        "risk" in question
        or "risky" in question
        or "highest risk" in question
    ):

        return "risk"

    # ---------------------------------------------------------
    # RECOMMENDATIONS
    # ---------------------------------------------------------

    if (
        "recommendation" in question
        or "recommendations" in question
        or "recommend" in question
        or "what should" in question
        or "what do you suggest" in question
        or "advice" in question
    ):

        return "recommendations"

    # ---------------------------------------------------------
    # REALIZATION
    # ---------------------------------------------------------

    if (
        "realization" in question
        or "realisation" in question
        or "receive" in question
        or "receivable" in question
    ):

        return "realization"

    # ---------------------------------------------------------
    # SALES
    # ---------------------------------------------------------

    if (
        "sales" in question
        or "sale" in question
        or "gross" in question
        or "net sales" in question
        or "deduction" in question
    ):

        return "financial"

    # ---------------------------------------------------------
    # EXPENSES
    # ---------------------------------------------------------

    if (
        "expense" in question
        or "expenses" in question
        or "transport" in question
        or "labour" in question
        or "labor" in question
        or "interest" in question
        or "purchase" in question
    ):

        return "financial"

    # ---------------------------------------------------------
    # NO SALES
    # ---------------------------------------------------------

    if (
        "no sales" in question
        or "without sales" in question
        or "farmers without" in question
    ):

        return "no_sales"

    # ---------------------------------------------------------
    # FARMER COUNT / LIST
    # ---------------------------------------------------------

    if (
        "how many farmers" in question
        or "number of farmers" in question
        or "list farmers" in question
        or "show farmers" in question
        or "all farmers" in question
    ):

        return "all_farmers"

    # ---------------------------------------------------------
    # DEFAULT
    # ---------------------------------------------------------

    return "overview"


def answer_farmer_question(question):
    """
    Answer a user question using the verified
    AgriLedger farmer AI profiles.

    This first version is deliberately
    database-grounded and does not invent
    financial values.
    """

    if not question:

        return {
            "status": "error",
            "message": "Please enter a question."
        }

    question = question.strip()

    if not question:

        return {
            "status": "error",
            "message": "Please enter a question."
        }

    # =========================================================
    # LOAD FARMER PROFILES
    # =========================================================

    profiles_result = (
        generate_farmer_profiles()
    )

    if profiles_result.get(
        "status"
    ) != "success":

        return {
            "status": "error",
            "message": (
                "Unable to load farmer information."
            )
        }

    farmers = profiles_result.get(
        "farmers",
        []
    )

    if not farmers:

        return {
            "status": "success",
            "question": question,
            "intent": "no_data",
            "answer": (
                "There are currently no farmer records "
                "available in AgriLedger."
            )
        }

    # =========================================================
    # DETECT INTENT
    # =========================================================

    intent = _detect_intent(
        question
    )

    # =========================================================
    # HELP
    # =========================================================

    if intent == "help":

        return {
            "status": "success",
            "question": question,
            "intent": intent,
            "farmer": None,
            "answer": _build_help_answer()
        }

    # =========================================================
    # ALL FARMERS
    # =========================================================

    if intent == "all_farmers":

        return {
            "status": "success",
            "question": question,
            "intent": intent,
            "farmer": None,
            "answer": _build_all_farmers_answer(
                farmers
            )
        }

    # =========================================================
    # CREDIT FARMERS
    # =========================================================

    if (
        intent == "outstanding"
        and _find_farmer(
            question,
            farmers
        ) is None
    ):

        return {
            "status": "success",
            "question": question,
            "intent": intent,
            "farmer": None,
            "answer": _build_credit_farmers_answer(
                farmers
            )
        }

    # =========================================================
    # RISK FARMERS
    # =========================================================

    if (
        intent == "risk"
        and _find_farmer(
            question,
            farmers
        ) is None
    ):

        return {
            "status": "success",
            "question": question,
            "intent": intent,
            "farmer": None,
            "answer": _build_risk_farmers_answer(
                farmers
            )
        }

    # =========================================================
    # FARMERS WITHOUT SALES
    # =========================================================

    if intent == "no_sales":

        return {
            "status": "success",
            "question": question,
            "intent": intent,
            "farmer": None,
            "answer": _build_no_sales_answer(
                farmers
            )
        }

    # =========================================================
    # FIND SPECIFIC FARMER
    # =========================================================

    farmer = _find_farmer(
        question,
        farmers
    )

    # =========================================================
    # FARMER NOT FOUND
    # =========================================================

    if farmer is None:

        return {
            "status": "success",
            "question": question,
            "intent": "farmer_not_found",
            "farmer": None,
            "answer": (
                "I could not identify the farmer from "
                "your question. Please provide the "
                "farmer's name or farmer code."
            )
        }

    # =========================================================
    # SPECIFIC FARMER RESPONSE
    # =========================================================

    if intent == "financial":

        answer = _build_financial_answer(
            farmer
        )

    elif intent == "realization":

        answer = _build_realization_answer(
            farmer
        )

    elif intent == "outstanding":

        answer = _build_outstanding_answer(
            farmer
        )

    elif intent == "risk":

        answer = _build_risk_answer(
            farmer
        )

    elif intent == "recommendations":

        answer = _build_recommendation_answer(
            farmer
        )

    else:

        answer = _build_farmer_overview(
            farmer
        )

    # =========================================================
    # FINAL RESPONSE
    # =========================================================

    return {
        "status": "success",
        "question": question,
        "intent": intent,
        "farmer": {
            "farmer_id":
                farmer["farmer_id"],

            "farmer_code":
                farmer["farmer_code"],

            "farmer_name":
                farmer["farmer_name"]
        },
        "answer": answer
    }