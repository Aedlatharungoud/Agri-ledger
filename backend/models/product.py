from datetime import datetime

from backend.extensions import db


class Product(db.Model):

    __tablename__ = "products"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_name = db.Column(
        db.String(150),
        nullable=False
    )

    brand_name = db.Column(
        db.String(150)
    )

    category = db.Column(
        db.String(100)
    )

    unit = db.Column(
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