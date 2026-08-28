from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.labour_expense import LabourExpense


labour_expense_bp = Blueprint(
    "labour_expense_bp",
    __name__
)


# ============================================================
# CONVERT LABOUR EXPENSE TO JSON
# ============================================================

def labour_expense_to_dict(expense):
    return {
        "id": expense.id,
        "farmerId": expense.farmer_id,
        "fieldId": expense.field_id,
        "cropSeasonId": expense.crop_season_id,

        "workDate": (
            expense.work_date.isoformat()
            if expense.work_date
            else None
        ),

        "workType": expense.work_type,
        "workerCount": expense.worker_count,

        "amount": (
            float(expense.amount)
            if expense.amount is not None
            else None
        ),

        "paymentType": expense.payment_type,

        "paidAmount": (
            float(expense.paid_amount)
            if expense.paid_amount is not None
            else None
        ),

        "notes": expense.notes,

        "createdAt": (
            expense.created_at.isoformat()
            if expense.created_at
            else None
        )
    }


# ============================================================
# GET ALL LABOUR EXPENSES
# ============================================================

@labour_expense_bp.route(
    "/api/labour-expenses",
    methods=["GET"]
)
def get_labour_expenses():

    expenses = LabourExpense.query.all()

    return jsonify([
        labour_expense_to_dict(expense)
        for expense in expenses
    ])


# ============================================================
# GET LABOUR EXPENSE BY ID
# ============================================================

@labour_expense_bp.route(
    "/api/labour-expenses/<int:id>",
    methods=["GET"]
)
def get_labour_expense(id):

    expense = LabourExpense.query.get(id)

    if not expense:
        return jsonify({
            "error": "Labour expense not found"
        }), 404

    return jsonify(
        labour_expense_to_dict(expense)
    )


# ============================================================
# CREATE LABOUR EXPENSE
# ============================================================

@labour_expense_bp.route(
    "/api/labour-expenses",
    methods=["POST"]
)
def create_labour_expense():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "farmerId",
        "fieldId",
        "cropSeasonId",
        "workDate",
        "workType",
        "amount"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    if (
        "paymentType" in data
        and data["paymentType"] not in [
            "CASH",
            "CREDIT",
            "PARTIAL"
        ]
    ):
        return jsonify({
            "error": (
                "paymentType must be "
                "CASH, CREDIT, or PARTIAL"
            )
        }), 400

    try:

        from datetime import datetime

        work_date = datetime.strptime(
            data["workDate"],
            "%Y-%m-%d"
        ).date()

        expense = LabourExpense(
            farmer_id=data["farmerId"],
            field_id=data["fieldId"],
            crop_season_id=data["cropSeasonId"],
            work_date=work_date,
            work_type=data["workType"],
            worker_count=data.get("workerCount"),
            amount=data["amount"],
            payment_type=data.get(
                "paymentType",
                "CREDIT"
            ),
            paid_amount=data.get(
                "paidAmount",
                0.00
            ),
            notes=data.get("notes")
        )

        db.session.add(expense)
        db.session.commit()

        return jsonify({
            "message": "Labour expense created successfully",
            "labourExpense": labour_expense_to_dict(
                expense
            )
        }), 201

    except ValueError:

        return jsonify({
            "error": "workDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE LABOUR EXPENSE
# ============================================================

@labour_expense_bp.route(
    "/api/labour-expenses/<int:id>",
    methods=["PUT"]
)
def update_labour_expense(id):

    expense = LabourExpense.query.get(id)

    if not expense:
        return jsonify({
            "error": "Labour expense not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    if (
        "paymentType" in data
        and data["paymentType"] not in [
            "CASH",
            "CREDIT",
            "PARTIAL"
        ]
    ):
        return jsonify({
            "error": (
                "paymentType must be "
                "CASH, CREDIT, or PARTIAL"
            )
        }), 400

    try:

        from datetime import datetime

        if "farmerId" in data:
            expense.farmer_id = data["farmerId"]

        if "fieldId" in data:
            expense.field_id = data["fieldId"]

        if "cropSeasonId" in data:
            expense.crop_season_id = data["cropSeasonId"]

        if "workDate" in data:

            expense.work_date = datetime.strptime(
                data["workDate"],
                "%Y-%m-%d"
            ).date()

        if "workType" in data:
            expense.work_type = data["workType"]

        if "workerCount" in data:
            expense.worker_count = data["workerCount"]

        if "amount" in data:
            expense.amount = data["amount"]

        if "paymentType" in data:
            expense.payment_type = data["paymentType"]

        if "paidAmount" in data:
            expense.paid_amount = data["paidAmount"]

        if "notes" in data:
            expense.notes = data["notes"]

        db.session.commit()

        return jsonify({
            "message": "Labour expense updated successfully",
            "labourExpense": labour_expense_to_dict(
                expense
            )
        })

    except ValueError:

        return jsonify({
            "error": "workDate must use YYYY-MM-DD format"
        }), 400

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE LABOUR EXPENSE
# ============================================================

@labour_expense_bp.route(
    "/api/labour-expenses/<int:id>",
    methods=["DELETE"]
)
def delete_labour_expense(id):

    expense = LabourExpense.query.get(id)

    if not expense:
        return jsonify({
            "error": "Labour expense not found"
        }), 404

    try:

        db.session.delete(expense)
        db.session.commit()

        return jsonify({
            "message": "Labour expense deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500