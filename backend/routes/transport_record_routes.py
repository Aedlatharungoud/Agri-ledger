from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.transport_record import TransportRecord
from datetime import datetime


transport_record_bp = Blueprint(
    "transport_record_bp",
    __name__
)


# ============================================================
# CONVERT TRANSPORT RECORD TO JSON
# ============================================================

def transport_record_to_dict(record):
    return {
        "id": record.id,
        "harvestId": record.harvest_id,

        "transportDate": (
            record.transport_date.isoformat()
            if record.transport_date
            else None
        ),

        "truckNumber": record.truck_number,
        "driverName": record.driver_name,
        "fromLocation": record.from_location,
        "toLocation": record.to_location,

        "quantityLoaded": (
            float(record.quantity_loaded)
            if record.quantity_loaded is not None
            else None
        ),

        "freightAmount": (
            float(record.freight_amount)
            if record.freight_amount is not None
            else None
        ),

        "loadingCharges": (
            float(record.loading_charges)
            if record.loading_charges is not None
            else None
        ),

        "unloadingCharges": (
            float(record.unloading_charges)
            if record.unloading_charges is not None
            else None
        ),

        "notes": record.notes,

        "createdAt": (
            record.created_at.isoformat()
            if record.created_at
            else None
        )
    }


# ============================================================
# GET ALL TRANSPORT RECORDS
# ============================================================

@transport_record_bp.route(
    "/api/transport-records",
    methods=["GET"]
)
def get_transport_records():

    records = TransportRecord.query.all()

    return jsonify([
        transport_record_to_dict(record)
        for record in records
    ])


# ============================================================
# GET TRANSPORT RECORD BY ID
# ============================================================

@transport_record_bp.route(
    "/api/transport-records/<int:id>",
    methods=["GET"]
)
def get_transport_record(id):

    record = TransportRecord.query.get(id)

    if not record:
        return jsonify({
            "error": "Transport record not found"
        }), 404

    return jsonify(
        transport_record_to_dict(record)
    )


# ============================================================
# CREATE TRANSPORT RECORD
# ============================================================

@transport_record_bp.route(
    "/api/transport-records",
    methods=["POST"]
)
def create_transport_record():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "harvestId",
        "transportDate"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    try:

        transport_date = datetime.strptime(
            data["transportDate"],
            "%Y-%m-%d"
        ).date()

        record = TransportRecord(
            harvest_id=data["harvestId"],
            transport_date=transport_date,
            truck_number=data.get("truckNumber"),
            driver_name=data.get("driverName"),
            from_location=data.get("fromLocation"),
            to_location=data.get("toLocation"),
            quantity_loaded=data.get("quantityLoaded"),
            freight_amount=data.get("freightAmount"),
            loading_charges=data.get("loadingCharges"),
            unloading_charges=data.get("unloadingCharges"),
            notes=data.get("notes")
        )

        db.session.add(record)
        db.session.commit()

        return jsonify({
            "message": "Transport record created successfully",
            "transportRecord": transport_record_to_dict(
                record
            )
        }), 201

    except ValueError:

        return jsonify({
            "error": "transportDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE TRANSPORT RECORD
# ============================================================

@transport_record_bp.route(
    "/api/transport-records/<int:id>",
    methods=["PUT"]
)
def update_transport_record(id):

    record = TransportRecord.query.get(id)

    if not record:
        return jsonify({
            "error": "Transport record not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "harvestId" in data:
            record.harvest_id = data["harvestId"]

        if "transportDate" in data:

            record.transport_date = datetime.strptime(
                data["transportDate"],
                "%Y-%m-%d"
            ).date()

        if "truckNumber" in data:
            record.truck_number = data["truckNumber"]

        if "driverName" in data:
            record.driver_name = data["driverName"]

        if "fromLocation" in data:
            record.from_location = data["fromLocation"]

        if "toLocation" in data:
            record.to_location = data["toLocation"]

        if "quantityLoaded" in data:
            record.quantity_loaded = data["quantityLoaded"]

        if "freightAmount" in data:
            record.freight_amount = data["freightAmount"]

        if "loadingCharges" in data:
            record.loading_charges = data["loadingCharges"]

        if "unloadingCharges" in data:
            record.unloading_charges = data[
                "unloadingCharges"
            ]

        if "notes" in data:
            record.notes = data["notes"]

        db.session.commit()

        return jsonify({
            "message": "Transport record updated successfully",
            "transportRecord": transport_record_to_dict(
                record
            )
        })

    except ValueError:

        return jsonify({
            "error": "transportDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE TRANSPORT RECORD
# ============================================================

@transport_record_bp.route(
    "/api/transport-records/<int:id>",
    methods=["DELETE"]
)
def delete_transport_record(id):

    record = TransportRecord.query.get(id)

    if not record:
        return jsonify({
            "error": "Transport record not found"
        }), 404

    try:

        db.session.delete(record)
        db.session.commit()

        return jsonify({
            "message": "Transport record deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500