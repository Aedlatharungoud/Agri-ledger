from backend.extensions import db
from datetime import datetime


class InterestCharge(db.Model):

    __tablename__ = "interest_charges"

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

    interest_date = db.Column(
        db.Date,
        nullable=False
    )

    principal_amount = db.Column(
        db.Numeric(14, 2),
        nullable=False
    )

    rate_percent = db.Column(
        db.Numeric(5, 2),
        nullable=False,
        default=2.00
    )

    interest_amount = db.Column(
        db.Numeric(14, 2),
        nullable=False
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