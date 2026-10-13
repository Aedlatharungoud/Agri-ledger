from datetime import datetime
from sqlalchemy.dialects.mysql import BIGINT
from backend.extensions import db


class InspectionAvailability(db.Model):
    """
    Admin-published availability slot for field inspections.
    Represents a specific date and time window with a maximum capacity.
    """
    __tablename__ = "inspection_availabilities"

    id = db.Column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    inspection_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.String(10), nullable=False)  # e.g., "09:00"
    end_time = db.Column(db.String(10), nullable=False)    # e.g., "11:00"
    max_capacity = db.Column(db.Integer, nullable=False, default=1)
    booked_count = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    appointments = db.relationship(
        "FieldInspectionAppointment",
        backref="availability",
        lazy="select",
        foreign_keys="FieldInspectionAppointment.availability_id",
    )

    def to_dict(self):
        remaining = max(0, self.max_capacity - self.booked_count)
        return {
            "id": self.id,
            "inspectionDate": self.inspection_date.strftime("%Y-%m-%d"),
            "startTime": self.start_time,
            "endTime": self.end_time,
            "maxCapacity": self.max_capacity,
            "bookedCount": self.booked_count,
            "remainingCapacity": remaining,
            "isActive": bool(self.is_active),
            "isBookable": bool(self.is_active and remaining > 0),
            "notes": self.notes,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


class FieldInspectionAppointment(db.Model):
    """
    Field inspection appointment requested by a farmer and managed by an admin.
    Tracks lifecycle: PENDING -> ACCEPTED / REJECTED / RESCHEDULED -> COMPLETED / CANCELLED.
    """
    __tablename__ = "field_inspection_appointments"

    id = db.Column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    availability_id = db.Column(
        BIGINT(unsigned=True), db.ForeignKey("inspection_availabilities.id"), nullable=False, index=True
    )
    farmer_id = db.Column(
        BIGINT(unsigned=True), db.ForeignKey("farmers.id"), nullable=False, index=True
    )
    field_id = db.Column(
        BIGINT(unsigned=True), db.ForeignKey("fields.id"), nullable=False, index=True
    )
    crop_season_id = db.Column(
        BIGINT(unsigned=True), db.ForeignKey("crop_seasons.id"), nullable=True, index=True
    )

    crop_type = db.Column(db.String(100), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    symptoms = db.Column(db.Text, nullable=False)
    notes = db.Column(db.Text, nullable=True)

    status = db.Column(
        db.String(30), nullable=False, default="PENDING", index=True
    )
    admin_notes = db.Column(db.Text, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    farmer = db.relationship("Farmer", backref="field_inspection_appointments", lazy="select")
    field = db.relationship("Field", backref="field_inspection_appointments", lazy="select")
    crop_season = db.relationship("CropSeason", backref="field_inspection_appointments", lazy="select")
    report = db.relationship(
        "FieldInspectionReport",
        backref="appointment",
        uselist=False,
        lazy="select",
        cascade="all, delete-orphan",
    )

    def to_dict(self, include_report=True):
        data = {
            "id": self.id,
            "availabilityId": self.availability_id,
            "farmerId": self.farmer_id,
            "farmerName": self.farmer.name if self.farmer else None,
            "farmerCode": self.farmer.farmer_code if self.farmer else None,
            "farmerPhone": self.farmer.phone if self.farmer else None,
            "fieldId": self.field_id,
            "fieldName": self.field.field_name if self.field else None,
            "fieldAreaAcres": float(self.field.area_acres) if self.field and self.field.area_acres else None,
            "cropSeasonId": self.crop_season_id,
            "seasonName": f"{self.crop_season.season} {self.crop_season.year}" if self.crop_season else None,
            "cropType": self.crop_type,
            "reason": self.reason,
            "symptoms": self.symptoms,
            "notes": self.notes,
            "status": self.status,
            "adminNotes": self.admin_notes,
            "rejectionReason": self.rejection_reason,
            "inspectionDate": (
                self.availability.inspection_date.strftime("%Y-%m-%d")
                if self.availability and self.availability.inspection_date
                else None
            ),
            "startTime": self.availability.start_time if self.availability else None,
            "endTime": self.availability.end_time if self.availability else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "hasReport": bool(self.report),
        }
        if include_report and self.report:
            data["report"] = self.report.to_dict()
        return data


class FieldInspectionReport(db.Model):
    """
    Official inspection findings, diagnosis, and recommendations recorded by the admin/inspector.
    """
    __tablename__ = "field_inspection_reports"

    id = db.Column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    appointment_id = db.Column(
        BIGINT(unsigned=True),
        db.ForeignKey("field_inspection_appointments.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    inspector_name = db.Column(db.String(150), nullable=False)
    inspection_date = db.Column(db.Date, nullable=False)
    affected_crop = db.Column(db.String(100), nullable=False)
    symptoms_observed = db.Column(db.Text, nullable=False)
    diagnosis = db.Column(db.Text, nullable=False)
    recommended_actions = db.Column(db.Text, nullable=False)
    suggested_products = db.Column(db.Text, nullable=True)
    application_guidance = db.Column(db.Text, nullable=True)
    follow_up_notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "appointmentId": self.appointment_id,
            "inspectorName": self.inspector_name,
            "inspectionDate": self.inspection_date.strftime("%Y-%m-%d"),
            "affectedCrop": self.affected_crop,
            "symptomsObserved": self.symptoms_observed,
            "diagnosis": self.diagnosis,
            "recommendedActions": self.recommended_actions,
            "suggestedProducts": self.suggested_products,
            "applicationGuidance": self.application_guidance,
            "followUpNotes": self.follow_up_notes,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
