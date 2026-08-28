from datetime import datetime

from backend.extensions import db


class Farmer(db.Model):

    __tablename__ = "farmers"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    farmer_code = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    phone = db.Column(
        db.String(20)
    )

    village_id = db.Column(
        db.Integer,
        db.ForeignKey("villages.id"),
        nullable=False
    )

    bank_account_name = db.Column(
        db.String(150)
    )

    bank_account_number = db.Column(
        db.String(50)
    )

    bank_ifsc = db.Column(
        db.String(20)
    )

    bank_name = db.Column(
        db.String(150)
    )

    status = db.Column(
        db.String(20),
        default="ACTIVE"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )