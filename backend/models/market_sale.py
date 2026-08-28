from backend.extensions import db
from datetime import datetime


class MarketSale(db.Model):

    __tablename__ = "market_sales"

    id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    farmer_id = db.Column(
        db.BigInteger,
        nullable=False
    )

    harvest_id = db.Column(
        db.BigInteger,
        nullable=False
    )

    sale_date = db.Column(
        db.Date,
        nullable=False
    )

    market_name = db.Column(
        db.String(255),
        nullable=True
    )

    buyer_name = db.Column(
        db.String(255),
        nullable=True
    )

    quantity_sold = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    unit = db.Column(
        db.String(255),
        nullable=True
    )

    rate_per_unit = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    gross_amount = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    commission = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    market_fee = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    other_deduction = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    notes = db.Column(
        db.String(255),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )