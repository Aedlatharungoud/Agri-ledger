from datetime import datetime

from backend.extensions import db


class InputPurchase(db.Model):

    __tablename__ = "input_purchases"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    farmer_id = db.Column(
        db.Integer,
        db.ForeignKey("farmers.id"),
        nullable=False
    )

    crop_season_id = db.Column(
        db.Integer,
        db.ForeignKey("crop_seasons.id")
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    purchase_date = db.Column(
        db.Date,
        nullable=False
    )

    quantity = db.Column(
        db.Numeric(12, 2)
    )

    unit_price = db.Column(
        db.Numeric(12, 2)
    )

    supplier_name = db.Column(
        db.String(150)
    )

    payment_type = db.Column(
        db.String(50)
    )

    paid_amount = db.Column(
        db.Numeric(12, 2),
        default=0
    )

    notes = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )