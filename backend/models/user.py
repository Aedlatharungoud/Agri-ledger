from datetime import datetime

from sqlalchemy.dialects.mysql import BIGINT

from backend.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        BIGINT(unsigned=True),
        primary_key=True,
        autoincrement=True
    )

    username = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    role = db.Column(
        db.Enum("ADMIN", "FARMER"),
        nullable=False,
        default="FARMER"
    )

    # IMPORTANT:
    # farmers.id is BIGINT UNSIGNED,
    # so farmer_id must also be BIGINT UNSIGNED.
    farmer_id = db.Column(
        BIGINT(unsigned=True),
        db.ForeignKey("farmers.id"),
        nullable=True
    )

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=True,
        onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<User {self.username} role={self.role}>"