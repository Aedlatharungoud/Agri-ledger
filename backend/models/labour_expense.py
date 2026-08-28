from backend.extensions import db
from datetime import datetime


class LabourExpense(db.Model):

    __tablename__ = "labour_expenses"

    id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    farmer_id = db.Column(
        db.BigInteger,
        nullable=False
    )

    field_id = db.Column(
        db.BigInteger,
        nullable=False
    )

    crop_season_id = db.Column(
        db.BigInteger,
        nullable=False
    )

    work_date = db.Column(
        db.Date,
        nullable=False
    )

    work_type = db.Column(
        db.String(255),
        nullable=False
    )

    worker_count = db.Column(
        db.Integer,
        nullable=True
    )

    amount = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    payment_type = db.Column(
        db.Enum(
            "CASH",
            "CREDIT",
            "PARTIAL"
        ),
        nullable=False,
        default="CREDIT"
    )

    paid_amount = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        default=0.00
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