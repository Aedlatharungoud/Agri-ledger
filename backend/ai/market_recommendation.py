from backend.models.market_sale import MarketSale
from backend.models.harvest import Harvest
from backend.models.transport_record import TransportRecord


# =============================================================
# CONFIGURATION
# =============================================================

MINIMUM_MARKET_RECORDS_FOR_HIGH_CONFIDENCE = 10


# =============================================================
# HELPER FUNCTIONS
# =============================================================

def _to_float(value):
    """
    Safely convert database numeric values to float.
    """

    try:
        return float(value or 0)

    except (
        TypeError,
        ValueError
    ):

        return 0.0


def _clean_text(value):
    """
    Clean text for case-insensitive comparisons.
    """

    if value is None:
        return ""

    return str(value).strip().lower()


# =============================================================
# TRANSPORT COST
# =============================================================

def _calculate_transport_cost(
    harvest_id,
    market_name
):
    """
    Calculate total transportation cost associated
    with a harvest and destination market.

    Total transport cost =
        freight
        + loading charges
        + unloading charges
    """

    records = TransportRecord.query.filter_by(
        harvest_id=harvest_id
    ).all()

    total_cost = 0.0

    matching_records = 0

    for record in records:

        destination = _clean_text(
            record.to_location
        )

        requested_market = _clean_text(
            market_name
        )

        # -----------------------------------------------------
        # Match destination with market when possible.
        # -----------------------------------------------------

        if (
            requested_market
            and destination
            and requested_market
            not in destination
            and destination
            not in requested_market
        ):

            continue

        freight = _to_float(
            record.freight_amount
        )

        loading = _to_float(
            record.loading_charges
        )

        unloading = _to_float(
            record.unloading_charges
        )

        total_cost += (
            freight
            + loading
            + unloading
        )

        matching_records += 1

    return {

        "transport_cost":
            round(
                total_cost,
                2
            ),

        "transport_records_used":
            matching_records

    }


# =============================================================
# SALE DEDUCTIONS
# =============================================================

def _calculate_sale_deductions(
    sale
):
    """
    Calculate deductions recorded directly
    against a market sale.

    Deductions =
        commission
        + market fee
        + other deduction
    """

    commission = _to_float(
        sale.commission
    )

    market_fee = _to_float(
        sale.market_fee
    )

    other_deduction = _to_float(
        sale.other_deduction
    )

    total_deductions = (
        commission
        + market_fee
        + other_deduction
    )

    return {

        "commission":
            round(
                commission,
                2
            ),

        "market_fee":
            round(
                market_fee,
                2
            ),

        "other_deduction":
            round(
                other_deduction,
                2
            ),

        "total_deductions":
            round(
                total_deductions,
                2
            )

    }


# =============================================================
# BUILD MARKET DATA
# =============================================================

def build_market_recommendation_dataset(
    harvest_id
):
    """
    Build market comparison data for a specific harvest.
    """

    sales = MarketSale.query.filter_by(
        harvest_id=harvest_id
    ).all()

    rows = []

    for sale in sales:

        # -----------------------------------------------------
        # BASIC SALE INFORMATION
        # -----------------------------------------------------

        market_name = (
            str(
                sale.market_name
            ).strip()
            if sale.market_name
            else "UNKNOWN"
        )

        quantity_sold = _to_float(
            sale.quantity_sold
        )

        rate_per_unit = _to_float(
            sale.rate_per_unit
        )

        gross_amount = _to_float(
            sale.gross_amount
        )

        # -----------------------------------------------------
        # CALCULATE PRICE IF MISSING
        # -----------------------------------------------------

        if (
            rate_per_unit <= 0
            and quantity_sold > 0
            and gross_amount > 0
        ):

            rate_per_unit = (
                gross_amount
                / quantity_sold
            )

        # -----------------------------------------------------
        # SALE DEDUCTIONS
        # -----------------------------------------------------

        deductions = (
            _calculate_sale_deductions(
                sale
            )
        )

        # -----------------------------------------------------
        # TRANSPORT
        # -----------------------------------------------------

        transport = (
            _calculate_transport_cost(
                harvest_id,
                market_name
            )
        )

        transport_cost = (
            transport[
                "transport_cost"
            ]
        )

        # -----------------------------------------------------
        # EXPECTED GROSS REALIZATION
        # -----------------------------------------------------

        expected_gross = (
            quantity_sold
            * rate_per_unit
        )

        # -----------------------------------------------------
        # EXPECTED NET REALIZATION
        # -----------------------------------------------------

        expected_net = (
            expected_gross
            - deductions[
                "total_deductions"
            ]
            - transport_cost
        )

        # -----------------------------------------------------
        # ADD MARKET ROW
        # -----------------------------------------------------

        rows.append({

            "sale_id":
                int(
                    sale.id
                ),

            "harvest_id":
                int(
                    sale.harvest_id
                ),

            "market_name":
                market_name,

            "sale_date":
                (
                    sale.sale_date.isoformat()
                    if sale.sale_date
                    else None
                ),

            "quantity_sold":
                round(
                    quantity_sold,
                    2
                ),

            "unit":
                (
                    str(
                        sale.unit
                    )
                    if sale.unit
                    else "KG"
                ),

            "price_per_unit":
                round(
                    rate_per_unit,
                    2
                ),

            "gross_amount":
                round(
                    expected_gross,
                    2
                ),

            "commission":
                deductions[
                    "commission"
                ],

            "market_fee":
                deductions[
                    "market_fee"
                ],

            "other_deduction":
                deductions[
                    "other_deduction"
                ],

            "total_deductions":
                deductions[
                    "total_deductions"
                ],

            "transport_cost":
                round(
                    transport_cost,
                    2
                ),

            "transport_records_used":
                transport[
                    "transport_records_used"
                ],

            "expected_net_realization":
                round(
                    expected_net,
                    2
                )

        })

    return rows


# =============================================================
# MARKET RANKING
# =============================================================

def _rank_markets(
    market_rows
):
    """
    Rank markets according to expected net realization.
    """

    ranked = sorted(

        market_rows,

        key=lambda row:
            row[
                "expected_net_realization"
            ],

        reverse=True
    )

    for index, row in enumerate(
        ranked,
        start=1
    ):

        row[
            "rank"
        ] = index

    return ranked


# =============================================================
# MARKET CONFIDENCE
# =============================================================

def _calculate_confidence(
    market_rows
):
    """
    Determine recommendation confidence based on
    the number of historical market records.
    """

    total_records = len(
        market_rows
    )

    unique_markets = len({

        _clean_text(
            row["market_name"]
        )

        for row in market_rows

    })

    if (
        total_records >= 30
        and unique_markets >= 3
    ):

        return "HIGH"

    if (
        total_records >= 10
        and unique_markets >= 2
    ):

        return "MEDIUM"

    return "LOW"


# =============================================================
# MAIN RECOMMENDATION
# =============================================================

def generate_market_recommendation(
    harvest_id
):
    """
    Recommend the market with the highest expected
    net realization for a harvest.
    """

    # ---------------------------------------------------------
    # VALIDATE HARVEST ID
    # ---------------------------------------------------------

    try:

        harvest_id = int(
            harvest_id
        )

    except (
        TypeError,
        ValueError
    ):

        return {

            "status":
                "error",

            "message":
                "harvest_id must be a valid integer."
        }

    if harvest_id <= 0:

        return {

            "status":
                "error",

            "message":
                "harvest_id must be greater than zero."
        }

    # ---------------------------------------------------------
    # FIND HARVEST
    # ---------------------------------------------------------

    harvest = Harvest.query.filter_by(
        id=harvest_id
    ).first()

    if harvest is None:

        return {

            "status":
                "error",

            "message":
                (
                    f"Harvest with ID "
                    f"{harvest_id} was not found."
                )
        }

    # ---------------------------------------------------------
    # BUILD DATASET
    # ---------------------------------------------------------

    market_rows = (
        build_market_recommendation_dataset(
            harvest_id
        )
    )

    if not market_rows:

        return {

            "status":
                "error",

            "message":
                (
                    "No market sale records are "
                    "available for this harvest. "
                    "Add market sale data before "
                    "requesting a recommendation."
                )
        }

    # ---------------------------------------------------------
    # RANK MARKETS
    # ---------------------------------------------------------

    ranked_markets = _rank_markets(
        market_rows
    )

    # ---------------------------------------------------------
    # BEST MARKET
    # ---------------------------------------------------------

    best_market = ranked_markets[0]

    # ---------------------------------------------------------
    # CONFIDENCE
    # ---------------------------------------------------------

    confidence = (
        _calculate_confidence(
            market_rows
        )
    )

    # ---------------------------------------------------------
    # CALCULATE DIFFERENCE FROM SECOND BEST
    # ---------------------------------------------------------

    second_best_difference = 0.0

    if len(ranked_markets) > 1:

        second_best_difference = (

            best_market[
                "expected_net_realization"
            ]

            -

            ranked_markets[1][
                "expected_net_realization"
            ]

        )

    # ---------------------------------------------------------
    # RECOMMENDATION REASON
    # ---------------------------------------------------------

    if len(ranked_markets) == 1:

        reason = (
            f"{best_market['market_name']} is the "
            "only market with historical sale data "
            "for this harvest. More market records "
            "are required for a stronger comparison."
        )

    else:

        reason = (

            f"{best_market['market_name']} is recommended "
            "because it provides the highest expected "
            "net realization after considering selling "
            "price, market deductions, and transportation "
            "costs."
        )

    # ---------------------------------------------------------
    # LOW-DATA WARNING
    # ---------------------------------------------------------

    data_warning = None

    if confidence == "LOW":

        data_warning = (
            "Recommendation confidence is LOW because "
            "the available historical market data is "
            "limited. Add more sales from multiple "
            "markets for stronger recommendations."
        )

    elif confidence == "MEDIUM":

        data_warning = (
            "Recommendation confidence is MEDIUM. "
            "Additional historical sales will improve "
            "the reliability of the recommendation."
        )

    else:

        data_warning = (
            "Recommendation confidence is HIGH based "
            "on the available historical market data."
        )

    # ---------------------------------------------------------
    # FINAL RESULT
    # ---------------------------------------------------------

    return {

        "status":
            "success",

        "harvest": {

            "harvest_id":
                int(
                    harvest.id
                ),

            "crop_name":
                str(
                    harvest.crop_name
                ),

            "quantity":
                _to_float(
                    harvest.quantity
                ),

            "unit":
                (
                    str(
                        harvest.unit
                    )
                    if harvest.unit
                    else None
                ),

            "harvest_date":
                (
                    harvest.harvest_date.isoformat()
                    if harvest.harvest_date
                    else None
                )

        },

        "recommendation": {

            "market_name":
                best_market[
                    "market_name"
                ],

            "price_per_unit":
                best_market[
                    "price_per_unit"
                ],

            "quantity":
                best_market[
                    "quantity_sold"
                ],

            "unit":
                best_market[
                    "unit"
                ],

            "expected_gross_realization":
                best_market[
                    "gross_amount"
                ],

            "transport_cost":
                best_market[
                    "transport_cost"
                ],

            "sale_deductions":
                best_market[
                    "total_deductions"
                ],

            "expected_net_realization":
                best_market[
                    "expected_net_realization"
                ],

            "confidence":
                confidence,

            "reason":
                reason

        },

        "comparison": {

            "markets_evaluated":
                len(
                    ranked_markets
                ),

            "historical_records":
                len(
                    market_rows
                ),

            "difference_from_second_best":
                round(
                    second_best_difference,
                    2
                ),

            "ranked_markets":
                ranked_markets

        },

        "data_warning":
            data_warning

    }