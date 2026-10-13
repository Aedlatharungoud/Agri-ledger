from collections import defaultdict
from statistics import mean

from .yield_data_service import build_yield_dataset


# ============================================================
# CONFIGURATION
# ============================================================

MINIMUM_ML_RECORDS = 10


# ============================================================
# PREPARE TRAINING DATA
# ============================================================

def prepare_training_data():

    rows = build_yield_dataset()

    training_rows = []

    for row in rows:

        if row.get("yield_kg_per_acre", 0) <= 0:
            continue

        training_rows.append({

            "crop_name":
                row.get("crop_name", "UNKNOWN"),

            "season":
                row.get("season", "UNKNOWN"),

            "year":
                row.get("year"),

            "area_acres":
                float(
                    row.get("area_acres", 0) or 0
                ),

            "irrigation_type":
                row.get(
                    "irrigation_type",
                    "UNKNOWN"
                ),

            "yield_kg_per_acre":
                float(
                    row.get(
                        "yield_kg_per_acre",
                        0
                    ) or 0
                )
        })

    return training_rows


# ============================================================
# CHECK WHETHER ML TRAINING IS POSSIBLE
# ============================================================

def can_train_ml_model():

    rows = prepare_training_data()

    return len(rows) >= MINIMUM_ML_RECORDS


# ============================================================
# HISTORICAL BASELINE
# ============================================================

def calculate_historical_baseline():

    rows = prepare_training_data()

    if not rows:

        return {

            "available": False,

            "baseline_yield_kg_per_acre": 0,

            "records_used": 0
        }

    average_yield = mean(

        row["yield_kg_per_acre"]

        for row in rows
    )

    return {

        "available": True,

        "baseline_yield_kg_per_acre":
            round(
                average_yield,
                2
            ),

        "records_used":
            len(rows)
    }


# ============================================================
# CROP-SPECIFIC BASELINE
# ============================================================

def calculate_crop_baseline(
    crop_name,
    season=None
):

    rows = prepare_training_data()

    if not rows:

        return {

            "available": False,

            "baseline_yield_kg_per_acre": 0,

            "records_used": 0
        }

    crop_name = (
        str(crop_name)
        .strip()
        .lower()
    )

    matching_rows = [

        row

        for row in rows

        if str(
            row["crop_name"]
        ).strip().lower()
        == crop_name
    ]

    # --------------------------------------------------------
    # Prefer crop + season
    # --------------------------------------------------------

    if season:

        season_name = (
            str(season)
            .strip()
            .lower()
        )

        seasonal_rows = [

            row

            for row in matching_rows

            if str(
                row["season"]
            ).strip().lower()
            == season_name
        ]

        if seasonal_rows:

            matching_rows = seasonal_rows

    # --------------------------------------------------------
    # If no crop-specific history exists,
    # use all historical data.
    # --------------------------------------------------------

    if not matching_rows:

        matching_rows = rows

    average_yield = mean(

        row["yield_kg_per_acre"]

        for row in matching_rows
    )

    return {

        "available": True,

        "baseline_yield_kg_per_acre":
            round(
                average_yield,
                2
            ),

        "records_used":
            len(matching_rows)
    }


# ============================================================
# MODEL INFORMATION
# ============================================================

def get_yield_model_status():

    rows = prepare_training_data()

    ml_ready = (
        len(rows)
        >= MINIMUM_ML_RECORDS
    )

    baseline = (
        calculate_historical_baseline()
    )

    return {

        "status": "success",

        "model_type":
            "machine_learning"
            if ml_ready
            else "historical_baseline",

        "ml_training_available":
            ml_ready,

        "minimum_records_required":
            MINIMUM_ML_RECORDS,

        "historical_records":
            len(rows),

        "baseline":
            baseline,

        "message":
            (
                "Sufficient historical data is "
                "available for machine learning."
                if ml_ready
                else
                "Historical data is currently "
                "insufficient for reliable machine "
                "learning. The system will use a "
                "historical baseline until more "
                "records are available."
            )
    }


# ============================================================
# YIELD PREDICTION
# ============================================================

def predict_yield(
    crop_name,
    area_acres,
    season=None,
    irrigation_type=None
):

    try:

        area_acres = float(
            area_acres
        )

    except (
        TypeError,
        ValueError
    ):

        return {

            "status": "error",

            "message":
                "Area must be a valid number."
        }

    if area_acres <= 0:

        return {

            "status": "error",

            "message":
                "Area must be greater than zero."
        }

    # --------------------------------------------------------
    # Current model status
    # --------------------------------------------------------

    model_status = (
        get_yield_model_status()
    )

    # --------------------------------------------------------
    # Current project does not yet have
    # enough records for ML.
    # --------------------------------------------------------

    if not model_status[
        "ml_training_available"
    ]:

        baseline = calculate_crop_baseline(

            crop_name,

            season
        )

        if not baseline["available"]:

            return {

                "status": "error",

                "message":
                    "No historical yield data "
                    "is available for prediction."
            }

        predicted_yield_per_acre = (
            baseline[
                "baseline_yield_kg_per_acre"
            ]
        )

        predicted_total_yield = (
            predicted_yield_per_acre
            * area_acres
        )

        return {

            "status": "success",

            "prediction_method":
                "historical_baseline",

            "model_status":
                "insufficient_historical_data",

            "crop_name":
                crop_name,

            "season":
                season,

            "irrigation_type":
                irrigation_type,

            "area_acres":
                area_acres,

            "predicted_yield_kg_per_acre":
                round(
                    predicted_yield_per_acre,
                    2
                ),

            "predicted_total_yield_kg":
                round(
                    predicted_total_yield,
                    2
                ),

            "historical_records_used":
                baseline[
                    "records_used"
                ],

            "confidence":
                "LOW",

            "message":
                (
                    "Prediction is based on "
                    "historical yield data because "
                    "the dataset does not yet contain "
                    "enough records for machine learning."
                )
        }

    # --------------------------------------------------------
    # ML MODE
    #
    # We intentionally leave the actual ML training
    # implementation for the next stage.
    # --------------------------------------------------------

    return {

        "status": "success",

        "prediction_method":
            "machine_learning",

        "model_status":
            "ml_ready",

        "message":
            (
                "Sufficient historical data is "
                "available. The machine learning "
                "training stage can now be executed."
            ),

        "crop_name":
            crop_name,

        "season":
            season,

        "irrigation_type":
            irrigation_type,

        "area_acres":
            area_acres
    }