from backend.extensions import db
from datetime import datetime


class SaleDeduction(db.Model):

    __tablename__ = "sale_deductions"

    id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    sale_id = db.Column(
        db.BigInteger,
        nullable=False
    )

    deduction_type = db.Column(
        db.String(255),
        nullable=True
    )

    amount = db.Column(
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