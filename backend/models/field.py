from datetime import datetime

from backend.extensions import db


class Field(db.Model):

    __tablename__ = "fields"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    farmer_id = db.Column(
        db.Integer,
        db.ForeignKey("farmers.id"),
        nullable=False
    )

    field_village_id = db.Column(
        db.Integer,
        db.ForeignKey("villages.id"),
        nullable=False
    )

    field_name = db.Column(
        db.String(150),
        nullable=False
    )

    survey_number = db.Column(
        db.String(100)
    )

    area_acres = db.Column(
        db.Numeric(10, 2)
    )

    irrigation_type = db.Column(
        db.String(50)
    )

    ownership_type = db.Column(
        db.String(50)
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