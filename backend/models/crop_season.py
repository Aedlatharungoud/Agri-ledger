from datetime import datetime

from backend.extensions import db


class CropSeason(db.Model):

    __tablename__ = "crop_seasons"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    field_id = db.Column(
        db.Integer,
        db.ForeignKey("fields.id"),
        nullable=False
    )

    crop_name = db.Column(
        db.String(100),
        nullable=False
    )

    season = db.Column(
        db.String(50)
    )

    year = db.Column(
        db.Integer
    )

    sowing_date = db.Column(
        db.Date
    )

    expected_harvest_date = db.Column(
        db.Date
    )

    status = db.Column(
        db.String(50),
        default="PLANNED"
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