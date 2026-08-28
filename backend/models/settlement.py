from backend.extensions import db
from datetime import datetime


class Settlement(db.Model):

    __tablename__ = "settlements"

    id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    farmer_id = db.Column(
        db.BigInteger,
        nullable=False
    )

    crop_season_id = db.Column(
        db.BigInteger,
        nullable=True
    )

    settlement_date = db.Column(
        db.Date,
        nullable=False
    )

    total_crop_sales = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    total_input_credit = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    total_labour_credit = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    total_transport = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    total_deductions = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    total_interest = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    total_payments = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    final_amount = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    settlement_status = db.Column(
        db.String(255),
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