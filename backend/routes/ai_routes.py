import logging
from flask import Blueprint, jsonify, request

from backend.ai.financial_insights import (
    generate_financial_insights
)

from backend.ai.farmer_risk import (
    generate_farmer_risk_analysis
)

from backend.ai.recommendations import (
    generate_farmer_recommendations
)

from backend.ai.farmer_profile import (
    generate_farmer_profiles
)

from backend.ai.assistant_service import (
    answer_farmer_question
)

from backend.ai.anomaly_detection import (
    generate_anomaly_detection
)

from backend.ai.yield_model import (
    get_yield_model_status,
    predict_yield
)

from backend.ai.market_price_data_service import (
    get_market_price_dataset_summary
)

from backend.ai.market_price_model import (
    get_market_price_model_status,
    predict_market_price
)

from backend.ai.market_recommendation import (
    generate_market_recommendation
)


logger = logging.getLogger(__name__)


# ============================================================
# AI BLUEPRINT
# ============================================================

ai_bp = Blueprint(
    "ai",
    __name__,
    url_prefix="/api/ai"
)


# ============================================================
# AI HEALTH CHECK
# ============================================================

@ai_bp.route(
    "/health",
    methods=["GET"]
)
def ai_health():

    return jsonify({

        "status": "success",

        "message":
            "AgriLedger AI services are healthy",

        "services": {

            "financial_insights":
                "available",

            "farmer_risk":
                "available",

            "recommendations":
                "available",

            "farmer_profile":
                "available",

            "assistant":
                "available",

            "anomaly_detection":
                "available",

            "yield_prediction":
                "available",

            "market_price_prediction":
                "available",

            "market_recommendation":
                "available"
        }

    }), 200


# ============================================================
# FINANCIAL INSIGHTS
# ============================================================

@ai_bp.route(
    "/financial-insights",
    methods=["GET"]
)
def financial_insights():

    try:

        result = (
            generate_financial_insights()
        )

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("financial_insights error")
        return jsonify({

            "status": "error",

            "message": "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# FARMER RISK ANALYSIS
# ============================================================

@ai_bp.route(
    "/farmer-risk",
    methods=["GET"]
)
def farmer_risk():

    try:

        result = (
            generate_farmer_risk_analysis()
        )

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("farmer_risk error")
        return jsonify({

            "status": "error",

            "message": "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# FARMER RECOMMENDATIONS
# ============================================================

@ai_bp.route(
    "/recommendations",
    methods=["GET"]
)
def recommendations():

    try:

        result = (
            generate_farmer_recommendations()
        )

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("recommendations error")
        return jsonify({

            "status": "error",

            "message": "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# FARMER AI PROFILE
# ============================================================

@ai_bp.route(
    "/farmer-profile",
    methods=["GET"]
)
def farmer_profile():

    try:

        result = (
            generate_farmer_profiles()
        )

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("farmer_profile error")
        return jsonify({

            "status": "error",

            "message": "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# SINGLE FARMER AI PROFILE
# ============================================================

@ai_bp.route(
    "/farmer/<int:farmer_id>",
    methods=["GET"]
)
def single_farmer_ai_profile(
    farmer_id
):

    try:

        result = (
            generate_farmer_profiles()
        )

        if result.get(
            "status"
        ) != "success":

            return jsonify(
                result
            ), 500

        farmers = result.get(
            "farmers",
            []
        )

        farmer = next(

            (

                farmer

                for farmer in farmers

                if farmer.get(
                    "farmer_id"
                ) == farmer_id

            ),

            None
        )

        if farmer is None:

            return jsonify({

                "status":
                    "error",

                "message":
                    (
                        f"Farmer with ID "
                        f"{farmer_id} "
                        f"was not found."
                    )

            }), 404

        return jsonify({

            "status":
                "success",

            "farmer":
                farmer

        }), 200

    except Exception:

        logger.exception("single_farmer_ai_profile error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# COMBINED AI OVERVIEW
# ============================================================

@ai_bp.route(
    "/overview",
    methods=["GET"]
)
def ai_overview():

    try:

        financial_data = (
            generate_financial_insights()
        )

        risk_data = (
            generate_farmer_risk_analysis()
        )

        recommendation_data = (
            generate_farmer_recommendations()
        )

        profile_data = (
            generate_farmer_profiles()
        )

        return jsonify({

            "status":
                "success",

            "financial_insights":
                financial_data,

            "farmer_risk":
                risk_data,

            "recommendations":
                recommendation_data,

            "farmer_profiles":
                profile_data

        }), 200

    except Exception:

        logger.exception("ai_overview error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# AI ASSISTANT
# ============================================================

@ai_bp.route(
    "/assistant",
    methods=["POST"]
)
def assistant():

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({

                "status":
                    "error",

                "message":
                    (
                        "Request body must contain "
                        "JSON data."
                    )

            }), 400

        question = data.get(
            "question"
        )

        if question is None:

            return jsonify({

                "status":
                    "error",

                "message":
                    (
                        "Please provide a question."
                    )

            }), 400

        question = str(
            question
        ).strip()

        if not question:

            return jsonify({

                "status":
                    "error",

                "message":
                    (
                        "Question cannot be empty."
                    )

            }), 400

        if len(question) > 1000:

            return jsonify({

                "status":
                    "error",

                "message":
                    (
                        "Question is too long. "
                        "Please keep it under "
                        "1000 characters."
                    )

            }), 400

        result = (
            answer_farmer_question(
                question
            )
        )

        if result.get(
            "status"
        ) == "error":

            return jsonify(
                result
            ), 400

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("assistant error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# ANOMALY DETECTION
# ============================================================

@ai_bp.route(
    "/anomalies",
    methods=["GET"]
)
def anomalies():

    try:

        result = (
            generate_anomaly_detection()
        )

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("anomalies error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# YIELD MODEL STATUS
# ============================================================

@ai_bp.route(
    "/yield-status",
    methods=["GET"]
)
def yield_status():

    try:

        result = (
            get_yield_model_status()
        )

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("yield_status error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# CROP YIELD PREDICTION
# ============================================================

@ai_bp.route(
    "/yield-prediction",
    methods=["POST"]
)
def yield_prediction():

    try:

        data = request.get_json(
            silent=True
        )

        # ----------------------------------------------------
        # VALIDATE REQUEST BODY
        # ----------------------------------------------------

        if not data:

            return jsonify({

                "status":
                    "error",

                "message":
                    (
                        "Request body must contain "
                        "JSON data."
                    )

            }), 400

        # ----------------------------------------------------
        # REQUIRED FIELDS
        # ----------------------------------------------------

        crop_name = data.get(
            "crop_name"
        )

        area_acres = data.get(
            "area_acres"
        )

        season = data.get(
            "season"
        )

        irrigation_type = data.get(
            "irrigation_type"
        )

        # ----------------------------------------------------
        # CROP VALIDATION
        # ----------------------------------------------------

        if crop_name is None:

            return jsonify({

                "status":
                    "error",

                "message":
                    "Please provide crop_name."

            }), 400

        crop_name = str(
            crop_name
        ).strip()

        if not crop_name:

            return jsonify({

                "status":
                    "error",

                "message":
                    "crop_name cannot be empty."

            }), 400

        # ----------------------------------------------------
        # AREA VALIDATION
        # ----------------------------------------------------

        if area_acres is None:

            return jsonify({

                "status":
                    "error",

                "message":
                    "Please provide area_acres."

            }), 400

        try:

            area_acres = float(
                area_acres
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({

                "status":
                    "error",

                "message":
                    "area_acres must be a valid number."

            }), 400

        if area_acres <= 0:

            return jsonify({

                "status":
                    "error",

                "message":
                    "area_acres must be greater than zero."

            }), 400

        # ----------------------------------------------------
        # OPTIONAL VALUES
        # ----------------------------------------------------

        if season is not None:

            season = str(
                season
            ).strip()

            if not season:

                season = None

        if irrigation_type is not None:

            irrigation_type = str(
                irrigation_type
            ).strip()

            if not irrigation_type:

                irrigation_type = None

        # ----------------------------------------------------
        # RUN PREDICTION
        # ----------------------------------------------------

        result = predict_yield(

            crop_name=crop_name,

            area_acres=area_acres,

            season=season,

            irrigation_type=irrigation_type

        )

        # ----------------------------------------------------
        # HANDLE PREDICTION ERROR
        # ----------------------------------------------------

        if result.get(
            "status"
        ) == "error":

            return jsonify(
                result
            ), 400

        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("yield_prediction error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# MARKET PRICE MODEL STATUS
# ============================================================

@ai_bp.route(
    "/market-price/status",
    methods=["GET"]
)
def market_price_status():

    try:

        result = (
            get_market_price_model_status()
        )

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("market_price_status error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# MARKET PRICE DATASET
# ============================================================

@ai_bp.route(
    "/market-price/dataset",
    methods=["GET"]
)
def market_price_dataset():

    try:

        result = (
            get_market_price_dataset_summary()
        )

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("market_price_dataset error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# MARKET PRICE PREDICTION
# ============================================================

@ai_bp.route(
    "/market-price/predict",
    methods=["POST"]
)
def market_price_predict():

    try:

        data = request.get_json(
            silent=True
        )

        # ----------------------------------------------------
        # VALIDATE REQUEST BODY
        # ----------------------------------------------------

        if not data:

            return jsonify({

                "status":
                    "error",

                "message":
                    (
                        "Request body must contain "
                        "JSON data."
                    )

            }), 400

        # ----------------------------------------------------
        # CROP NAME
        # ----------------------------------------------------

        crop_name = data.get(
            "crop_name"
        )

        if crop_name is None:

            return jsonify({

                "status":
                    "error",

                "message":
                    "Please provide crop_name."

            }), 400

        crop_name = str(
            crop_name
        ).strip()

        if not crop_name:

            return jsonify({

                "status":
                    "error",

                "message":
                    "crop_name cannot be empty."

            }), 400

        # ----------------------------------------------------
        # OPTIONAL MARKET
        # ----------------------------------------------------

        market_name = data.get(
            "market_name"
        )

        if market_name is not None:

            market_name = str(
                market_name
            ).strip()

            if not market_name:

                market_name = None

        # ----------------------------------------------------
        # OPTIONAL UNIT
        # ----------------------------------------------------

        unit = data.get(
            "unit",
            "KG"
        )

        if unit is None:

            unit = "KG"

        unit = str(
            unit
        ).strip()

        if not unit:

            unit = "KG"

        # ----------------------------------------------------
        # RUN MARKET PRICE PREDICTION
        # ----------------------------------------------------

        result = predict_market_price(

            crop_name=crop_name,

            market_name=market_name,

            unit=unit

        )

        # ----------------------------------------------------
        # HANDLE PREDICTION ERROR
        # ----------------------------------------------------

        if result.get(
            "status"
        ) == "error":

            return jsonify(
                result
            ), 400

        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("market_price_predict error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500


# ============================================================
# BEST MARKET RECOMMENDATION
# ============================================================

@ai_bp.route(
    "/market-recommendation",
    methods=["POST"]
)
def market_recommendation():

    try:

        data = request.get_json(
            silent=True
        )

        # ----------------------------------------------------
        # VALIDATE REQUEST BODY
        # ----------------------------------------------------

        if not data:

            return jsonify({

                "status":
                    "error",

                "message":
                    (
                        "Request body must contain "
                        "JSON data."
                    )

            }), 400

        # ----------------------------------------------------
        # HARVEST ID
        # ----------------------------------------------------

        harvest_id = data.get(
            "harvest_id"
        )

        if harvest_id is None:

            return jsonify({

                "status":
                    "error",

                "message":
                    "Please provide harvest_id."

            }), 400

        # ----------------------------------------------------
        # VALIDATE HARVEST ID
        # ----------------------------------------------------

        try:

            harvest_id = int(
                harvest_id
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({

                "status":
                    "error",

                "message":
                    "harvest_id must be a valid integer."

            }), 400

        if harvest_id <= 0:

            return jsonify({

                "status":
                    "error",

                "message":
                    "harvest_id must be greater than zero."

            }), 400

        # ----------------------------------------------------
        # GENERATE MARKET RECOMMENDATION
        # ----------------------------------------------------

        result = (
            generate_market_recommendation(
                harvest_id
            )
        )

        # ----------------------------------------------------
        # HANDLE RECOMMENDATION ERROR
        # ----------------------------------------------------

        if result.get(
            "status"
        ) == "error":

            return jsonify(
                result
            ), 400

        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        return jsonify(
            result
        ), 200

    except Exception:

        logger.exception("market_recommendation error")
        return jsonify({

            "status":
                "error",

            "message":
                "An unexpected error occurred. Please try again."

        }), 500