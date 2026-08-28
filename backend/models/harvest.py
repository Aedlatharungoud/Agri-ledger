from backend.extensions import db
from datetime import datetime


class Harvest(db.Model):

    __tablename__ = "harvests"

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

    harvest_date = db.Column(
        db.Date,
        nullable=False
    )

    crop_name = db.Column(
        db.String(100),
        nullable=False
    )

    quantity = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    unit = db.Column(
        db.String(30),
        nullable=False,
        default="KG"
    )

    quality_grade = db.Column(
        db.String(50),
        nullable=True
    )

    lot_number = db.Column(
        db.String(50),
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