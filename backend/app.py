
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

from backend.config import Config, ProductionConfig, get_cors_origins
from backend.extensions import db
from backend.auth_utils import get_current_user


def create_app(config_class=None):
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )

    # ============================================================
    # CONFIGURATION SELECTION
    # Automatically selects ProductionConfig if FLASK_ENV=production.
    # Accepts explicit config_class for testing or custom deployments.
    # ============================================================

    if config_class is None:
        env = (
            os.environ.get("FLASK_ENV", "")
            or os.environ.get("ENV", "")
            or os.environ.get("AGRILEDGER_ENV", "")
        ).strip().lower()

        if env in ("production", "prod"):
            config_class = ProductionConfig
        else:
            config_class = Config

    app.config.from_object(config_class)

    # Validate production configuration if selected
    if issubclass(config_class, ProductionConfig):
        ProductionConfig.validate()

    # ============================================================
    # SESSION CONFIGURATION
    # ============================================================

    app.config["SESSION_COOKIE_NAME"] = "agriledger_session"
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = os.environ.get(
        "SESSION_COOKIE_SAMESITE",
        getattr(config_class, "SESSION_COOKIE_SAMESITE", "Lax"),
    )

    # Secure cookies enabled in production over HTTPS; False for localhost dev
    app.config["SESSION_COOKIE_SECURE"] = getattr(
        config_class, "SESSION_COOKIE_SECURE", False
    )
    if app.config["SESSION_COOKIE_SAMESITE"] == "None":
        app.config["SESSION_COOKIE_SECURE"] = True

    # ============================================================
    # CORS CONFIGURATION
    # Reads allowed origins from config/environment with fallback
    # ============================================================

    cors_origins = get_cors_origins()
    app.config["CORS_ORIGINS"] = cors_origins

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": cors_origins
            }
        },
        supports_credentials=True,
    )


    # ============================================================
    # DATABASE
    # ============================================================

    db.init_app(app)

    # ============================================================
    # MODELS
    # Import all models before create_all().
    # ============================================================

    from backend.models.farmer import Farmer
    from backend.models.village import Village
    from backend.models.field import Field
    from backend.models.crop_season import CropSeason
    from backend.models.product import Product
    from backend.models.input_purchase import InputPurchase
    from backend.models.labour_expense import LabourExpense
    from backend.models.harvest import Harvest
    from backend.models.market_sale import MarketSale
    from backend.models.sale_deduction import SaleDeduction
    from backend.models.transport_record import TransportRecord
    from backend.models.farmer_payment import FarmerPayment
    from backend.models.interest_charge import InterestCharge
    from backend.models.settlement import Settlement
    from backend.models.user import User
    from backend.models.field_inspection import (
        InspectionAvailability,
        FieldInspectionAppointment,
        FieldInspectionReport,
    )

    # ============================================================
    # NORMAL ROUTES
    # ============================================================

    from backend.routes.farmer_routes import farmer_bp
    from backend.routes.village_routes import village_bp
    from backend.routes.field_routes import field_bp
    from backend.routes.crop_season_routes import crop_season_bp
    from backend.routes.product_routes import product_bp
    from backend.routes.input_purchase_routes import input_purchase_bp
    from backend.routes.labour_expense_routes import labour_expense_bp
    from backend.routes.harvest_routes import harvest_bp
    from backend.routes.market_sale_routes import market_sale_bp
    from backend.routes.sale_deduction_routes import sale_deduction_bp
    from backend.routes.transport_record_routes import transport_record_bp
    from backend.routes.farmer_payment_routes import farmer_payment_bp
    from backend.routes.interest_charge_routes import interest_charge_bp
    from backend.routes.settlement_routes import settlement_bp

    # ============================================================
    # AUTH ROUTES
    # ============================================================

    from backend.routes.auth_routes import auth_bp

    # ============================================================
    # AI ROUTES
    # ============================================================

    from backend.routes.ai_routes import ai_bp
    from backend.routes.field_inspection_routes import field_inspection_bp

    # ============================================================
    # REGISTER BLUEPRINTS
    # ============================================================

    app.register_blueprint(farmer_bp)
    app.register_blueprint(village_bp)
    app.register_blueprint(field_bp)
    app.register_blueprint(crop_season_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(input_purchase_bp)
    app.register_blueprint(labour_expense_bp)
    app.register_blueprint(harvest_bp)
    app.register_blueprint(market_sale_bp)
    app.register_blueprint(sale_deduction_bp)
    app.register_blueprint(transport_record_bp)
    app.register_blueprint(farmer_payment_bp)
    app.register_blueprint(interest_charge_bp)
    app.register_blueprint(settlement_bp)

    app.register_blueprint(auth_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(field_inspection_bp)

    # ============================================================
    # CREATE MISSING TABLES
    # ============================================================

    with app.app_context():
        db.create_all()

    # ============================================================
    # GLOBAL API AUTHENTICATION
    # ============================================================

    @app.before_request
    def protect_api_routes():
        if not request.path.startswith("/api/"):
            return None

        # Allow CORS preflight requests.
        if request.method == "OPTIONS":
            return None

        # Endpoints that do not require an existing login.
        public_paths = {
            "/api/health",
            "/api/auth/login",
            "/api/auth/me",
            "/api/auth/logout",
        }

        if request.path in public_paths:
            return None

        user = get_current_user()

        if not user:
            return jsonify({
                "status": "error",
                "message": "Authentication required.",
            }), 401

        return None

    # ============================================================
    # HOME
    # Return backend status instead of rendering a missing template.
    # ============================================================

    @app.route("/", methods=["GET"])
    def home():
        return jsonify({
            "status": "success",
            "message": "AgriLedger AI backend is running.",
            "frontend": "http://localhost:5173",
        }), 200

    # ============================================================
    # HEALTH CHECK
    # ============================================================

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "success",
            "message": "AgriLedger AI Backend is healthy",
        }), 200

    return app


app = create_app()


if __name__ == "__main__":
    is_prod = (
        os.environ.get("FLASK_ENV", "")
        or os.environ.get("ENV", "")
        or os.environ.get("AGRILEDGER_ENV", "")
    ).strip().lower() in ("production", "prod")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=not is_prod,
    )

