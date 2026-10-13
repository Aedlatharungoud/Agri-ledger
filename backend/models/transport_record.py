from backend.extensions import db
from datetime import datetime


class TransportRecord(db.Model):

    __tablename__ = "transport_records"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    harvest_id = db.Column(
        db.Integer,
        nullable=False
    )

    transport_date = db.Column(
        db.Date,
        nullable=False
    )

    truck_number = db.Column(
        db.String(255),
        nullable=True
    )

    driver_name = db.Column(
        db.String(255),
        nullable=True
    )

    from_location = db.Column(
        db.String(255),
        nullable=True
    )

    to_location = db.Column(
        db.String(255),
        nullable=True
    )

    quantity_loaded = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    freight_amount = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    loading_charges = db.Column(
        db.Numeric(38, 2),
        nullable=True
    )

    unloading_charges = db.Column(
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