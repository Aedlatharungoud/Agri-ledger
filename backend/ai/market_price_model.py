from .market_price_data_service import (
    build_market_price_dataset
)


# =============================================================
# CONFIGURATION
# =============================================================

MINIMUM_RECORDS_REQUIRED = 10


# =============================================================
# HELPER FUNCTIONS
# =============================================================

def _clean_text(value):
    """
    Convert a value into a clean lowercase string
    for comparisons.
    """

    if value is None:
        return ""

    return str(value).strip().lower()


def _valid_price_records(records):
    """
    Return only records containing a valid positive
    market price.
    """

    valid_records = []

    for record in records:

        try:

            price = float(
                record.get(
                    "rate_per_unit",
                    0
                )
            )

        except (
            TypeError,
            ValueError
        ):

            continue

        if price > 0:

            valid_records.append(
                record
            )

    return valid_records


# =============================================================
# MODEL STATUS
# =============================================================

def get_market_price_model_status():

    records = build_market_price_dataset()

    valid_records = _valid_price_records(
        records
    )

    historical_records = len(
        valid_records
    )

    # ---------------------------------------------------------
    # NO HISTORICAL DATA
    # ---------------------------------------------------------

    if historical_records == 0:

        return {

            "status":
                "success",

            "model_type":
                "historical_baseline",

            "ml_training_available":
                False,

            "minimum_records_required":
                MINIMUM_RECORDS_REQUIRED,

            "historical_records":
                0,

            "baseline": {

                "available":
                    False,

                "baseline_price":
                    0,

                "records_used":
                    0

            },

            "message":
                (
                    "No historical market price data "
                    "is available yet."
                )
        }

    # ---------------------------------------------------------
    # CALCULATE HISTORICAL BASELINE
    # ---------------------------------------------------------

    prices = []

    for record in valid_records:

        try:

            prices.append(
                float(
                    record["rate_per_unit"]
                )
            )

        except (
            TypeError,
            ValueError
        ):

            continue

    if not prices:

        return {

            "status":
                "success",

            "model_type":
                "historical_baseline",

            "ml_training_available":
                False,

            "minimum_records_required":
                MINIMUM_RECORDS_REQUIRED,

            "historical_records":
                0,

            "baseline": {

                "available":
                    False,

                "baseline_price":
                    0,

                "records_used":
                    0

            },

            "message":
                (
                    "No valid historical market "
                    "prices are available."
                )
        }

    average_price = (
        sum(prices)
        / len(prices)
    )

    # ---------------------------------------------------------
    # MODEL READINESS
    # ---------------------------------------------------------

    ml_available = (
        historical_records
        >= MINIMUM_RECORDS_REQUIRED
    )

    if ml_available:

        model_type = (
            "historical_baseline_ready_for_ml"
        )

        message = (
            "Enough historical market price records "
            "are available to support future machine "
            "learning training."
        )

    else:

        model_type = (
            "historical_baseline"
        )

        message = (
            "Historical market price data is currently "
            "insufficient for reliable machine learning. "
            "The system will use a historical baseline "
            "until more records are available."
        )

    return {

        "status":
            "success",

        "model_type":
            model_type,

        "ml_training_available":
            ml_available,

        "minimum_records_required":
            MINIMUM_RECORDS_REQUIRED,

        "historical_records":
            historical_records,

        "baseline": {

            "available":
                True,

            "baseline_price":
                round(
                    average_price,
                    2
                ),

            "records_used":
                historical_records

        },

        "message":
            message
    }


# =============================================================
# PRICE PREDICTION
# =============================================================

def predict_market_price(
    crop_name,
    market_name=None,
    unit="KG"
):

    # ---------------------------------------------------------
    # VALIDATE CROP
    # ---------------------------------------------------------

    crop_name = str(
        crop_name
    ).strip()

    if not crop_name:

        return {

            "status":
                "error",

            "message":
                "Crop name is required."
        }

    # ---------------------------------------------------------
    # CLEAN OPTIONAL VALUES
    # ---------------------------------------------------------

    market_name = (

        str(
            market_name
        ).strip()

        if market_name

        else None
    )

    unit = (

        str(
            unit
        ).strip()

        if unit

        else "KG"
    )

    if not unit:

        unit = "KG"

    # ---------------------------------------------------------
    # LOAD DATASET
    # ---------------------------------------------------------

    records = build_market_price_dataset()

    valid_records = _valid_price_records(
        records
    )

    # ---------------------------------------------------------
    # NO DATA
    # ---------------------------------------------------------

    if not valid_records:

        return {

            "status":
                "error",

            "message":
                (
                    "No historical market price "
                    "data is available."
                )
        }

    # =========================================================
    # FILTER BY CROP
    # =========================================================

    crop_records = []

    requested_crop = _clean_text(
        crop_name
    )

    for record in valid_records:

        record_crop = _clean_text(
            record.get(
                "crop_name"
            )
        )

        if record_crop == requested_crop:

            crop_records.append(
                record
            )

    # =========================================================
    # FILTER BY MARKET
    # =========================================================

    market_records = crop_records

    market_filter_used = False

    if market_name:

        requested_market = _clean_text(
            market_name
        )

        matching_market_records = []

        for record in crop_records:

            record_market = _clean_text(
                record.get(
                    "market_name"
                )
            )

            if record_market == requested_market:

                matching_market_records.append(
                    record
                )

        if matching_market_records:

            market_records = (
                matching_market_records
            )

            market_filter_used = True

    # =========================================================
    # CROP FALLBACK
    # =========================================================

    crop_fallback_used = False

    if not market_records:

        market_records = valid_records

        crop_fallback_used = True

    # =========================================================
    # EXTRACT PRICES
    # =========================================================

    prices = []

    for record in market_records:

        try:

            price = float(
                record.get(
                    "rate_per_unit",
                    0
                )
            )

        except (
            TypeError,
            ValueError
        ):

            continue

        if price > 0:

            prices.append(
                price
            )

    # =========================================================
    # NO VALID PRICES
    # =========================================================

    if not prices:

        return {

            "status":
                "error",

            "message":
                (
                    "No valid historical prices "
                    "were found."
                )
        }

    # =========================================================
    # STATISTICS
    # =========================================================

    historical_count = len(
        prices
    )

    average_price = (
        sum(prices)
        / historical_count
    )

    minimum_price = min(
        prices
    )

    maximum_price = max(
        prices
    )

    # =========================================================
    # PRICE VARIATION
    # =========================================================

    if historical_count > 1:

        variance = (

            sum(

                (
                    price
                    - average_price
                ) ** 2

                for price in prices

            )

            / historical_count
        )

        standard_deviation = (
            variance ** 0.5
        )

    else:

        standard_deviation = 0

    # =========================================================
    # CONFIDENCE
    # =========================================================

    if historical_count >= 30:

        confidence = "HIGH"

    elif historical_count >= 10:

        confidence = "MEDIUM"

    else:

        confidence = "LOW"

    # =========================================================
    # MODEL STATUS
    # =========================================================

    if historical_count >= MINIMUM_RECORDS_REQUIRED:

        model_status = (
            "ml_ready"
        )

        prediction_method = (
            "historical_baseline"
        )

        message = (
            "Prediction is currently based on "
            "historical market prices. The dataset "
            "has enough records to support future "
            "machine learning training."
        )

    else:

        model_status = (
            "insufficient_historical_data"
        )

        prediction_method = (
            "historical_baseline"
        )

        message = (
            "Prediction is based on historical "
            "market price data because the dataset "
            "does not yet contain enough records "
            "for reliable machine learning."
        )

    # =========================================================
    # DATA QUALITY MESSAGE
    # =========================================================

    if crop_fallback_used:

        message = (
            message
            + " No matching historical records were "
              "found for the requested crop, so the "
              "system used all valid historical market "
              "price records as a fallback."
        )

    elif market_name and not market_filter_used:

        message = (
            message
            + " No historical records were found for "
              "the requested market, so the system used "
              "the available records for the selected crop."
        )

    # =========================================================
    # FINAL RESULT
    # =========================================================

    return {

        "status":
            "success",

        "prediction_method":
            prediction_method,

        "model_status":
            model_status,

        "crop_name":
            crop_name,

        "market_name":
            market_name,

        "unit":
            unit,

        "predicted_price_per_unit":
            round(
                average_price,
                2
            ),

        "historical_average_price":
            round(
                average_price,
                2
            ),

        "historical_min_price":
            round(
                minimum_price,
                2
            ),

        "historical_max_price":
            round(
                maximum_price,
                2
            ),

        "historical_records_used":
            historical_count,

        "price_standard_deviation":
            round(
                standard_deviation,
                2
            ),

        "confidence":
            confidence,

        "data_scope":
            (
                "crop_and_market"
                if market_filter_used
                else
                "crop"
                if crop_records
                else
                "all_markets"
            ),

        "message":
            message
    }