from flask import Flask, render_template
from backend.config import Config
from backend.extensions import db


def create_app():

    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static"
    )

    app.config.from_object(Config)

    db.init_app(app)

    # ========================================================
    # IMPORT MODELS
    # ========================================================

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

    # ========================================================
    # IMPORT ROUTES
    # ========================================================

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

    # ========================================================
    # REGISTER ALL BLUEPRINTS
    # ========================================================

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

    # ========================================================
    # HOME
    # ========================================================

    @app.route("/")
    def home():
        return render_template("dashboard.html")

    # ========================================================
    # HEALTH CHECK
    # ========================================================

    @app.route("/api/health")
    def health():
        return {
            "status": "success",
            "message": "AgriLedger AI Backend is healthy"
        }

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        debug=True
    )