from datetime import datetime

from backend.extensions import db


class Village(db.Model):

    __tablename__ = "villages"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    mandal = db.Column(
        db.String(150)
    )

    district = db.Column(
        db.String(150)
    )

    state = db.Column(
        db.String(100)
    )

    pincode = db.Column(
        db.String(10)
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