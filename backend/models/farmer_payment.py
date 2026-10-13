from backend.extensions import db


class FarmerPayment(db.Model):

    __tablename__ = "farmer_payments"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    farmer_id = db.Column(
        db.Integer,
        db.ForeignKey("farmers.id"),
        nullable=False
    )

    settlement_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "settlements.id",
            ondelete="SET NULL"
        ),
        nullable=True
    )

    payment_date = db.Column(
        db.Date,
        nullable=False
    )

    amount = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    payment_mode = db.Column(
        db.Enum(
            "CASH",
            "BANK",
            "UPI",
            "CHEQUE"
        ),
        nullable=False
    )

    reference_number = db.Column(
        db.String(255),
        nullable=True
    )

    notes = db.Column(
        db.String(255),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    farmer = db.relationship(
        "Farmer",
        backref=db.backref(
            "payments",
            lazy=True
        )
    )

    settlement = db.relationship(
        "Settlement",
        backref=db.backref(
            "payments",
            lazy=True
        )
    )

    # ========================================================
    # JSON
    # ========================================================

    def to_dict(self):

        return {
            "id": self.id,

            "farmerId": self.farmer_id,

            "settlementId": self.settlement_id,

            "paymentDate": (
                self.payment_date.isoformat()
                if self.payment_date
                else None
            ),

            "amount": (
                float(self.amount)
                if self.amount is not None
                else 0.0
            ),

            "paymentMode": self.payment_mode,

            "referenceNumber":
                self.reference_number,

            "notes":
                self.notes,

            "createdAt": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }