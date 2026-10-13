from statistics import mean, median

from backend.models.farmer import Farmer
from backend.models.input_purchase import InputPurchase
from backend.models.labour_expense import LabourExpense
from backend.models.harvest import Harvest


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def safe_float(value):
    """
    Safely convert a value to float.
    """

    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def calculate_iqr_bounds(values):
    """
    Calculate lower and upper anomaly boundaries
    using the Interquartile Range (IQR) method.

    Values outside these boundaries are considered
    unusual and should be reviewed.
    """

    if len(values) < 4:
        return None, None

    sorted_values = sorted(values)

    n = len(sorted_values)

    q1_position = (n + 1) / 4
    q3_position = 3 * (n + 1) / 4

    def percentile(position):

        if position <= 1:
            return sorted_values[0]

        if position >= n:
            return sorted_values[-1]

        lower_index = int(position) - 1
        upper_index = lower_index + 1

        fraction = position - int(position)

        return (
            sorted_values[lower_index]
            + fraction
            * (
                sorted_values[upper_index]
                - sorted_values[lower_index]
            )
        )

    q1 = percentile(q1_position)
    q3 = percentile(q3_position)

    iqr = q3 - q1

    lower_bound = q1 - (1.5 * iqr)
    upper_bound = q3 + (1.5 * iqr)

    return lower_bound, upper_bound


def detect_anomaly(value, values):
    """
    Detect whether a value is unusual compared with
    the available historical values.
    """

    if len(values) < 4:

        return {
            "is_anomaly": False,
            "method": "insufficient_data",
            "message": (
                "Not enough historical records to "
                "reliably detect an anomaly."
            )
        }

    lower_bound, upper_bound = calculate_iqr_bounds(
        values
    )

    if lower_bound is None or upper_bound is None:

        return {
            "is_anomaly": False,
            "method": "insufficient_data",
            "message": (
                "Not enough historical records to "
                "calculate anomaly boundaries."
            )
        }

    if value < lower_bound or value > upper_bound:

        return {
            "is_anomaly": True,
            "method": "iqr",
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "message": (
                "This transaction is outside the "
                "normal historical range."
            )
        }

    return {
        "is_anomaly": False,
        "method": "iqr",
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
        "message": (
            "This transaction is within the "
            "normal historical range."
        )
    }


# ============================================================
# INPUT PURCHASE ANOMALIES
# ============================================================

def detect_input_purchase_anomalies():

    purchases = InputPurchase.query.all()

    transactions = []

    for purchase in purchases:

        quantity = safe_float(
            getattr(purchase, "quantity", 0)
        )

        unit_price = safe_float(
            getattr(purchase, "unit_price", 0)
        )

        total_value = quantity * unit_price

        if total_value <= 0:
            continue

        transactions.append({
            "record_id": purchase.id,
            "farmer_id": getattr(
                purchase,
                "farmer_id",
                None
            ),
            "value": total_value,
            "quantity": quantity,
            "unit_price": unit_price
        })

    values = [
        transaction["value"]
        for transaction in transactions
    ]

    anomalies = []

    for transaction in transactions:

        result = detect_anomaly(
            transaction["value"],
            values
        )

        if result["is_anomaly"]:

            anomalies.append({

                "transaction_type":
                    "input_purchase",

                "record_id":
                    transaction["record_id"],

                "farmer_id":
                    transaction["farmer_id"],

                "amount":
                    transaction["value"],

                "quantity":
                    transaction["quantity"],

                "unit_price":
                    transaction["unit_price"],

                "severity":
                    "HIGH",

                "reason":
                    result["message"],

                "detection_method":
                    result["method"],

                "normal_range": {

                    "minimum":
                        result["lower_bound"],

                    "maximum":
                        result["upper_bound"]
                },

                "requires_review":
                    True
            })

    return anomalies


# ============================================================
# LABOUR EXPENSE ANOMALIES
# ============================================================

def detect_labour_expense_anomalies():

    expenses = LabourExpense.query.all()

    transactions = []

    for expense in expenses:

        amount = safe_float(
            getattr(expense, "amount", 0)
        )

        if amount <= 0:
            continue

        transactions.append({

            "record_id":
                expense.id,

            "farmer_id":
                getattr(
                    expense,
                    "farmer_id",
                    None
                ),

            "amount":
                amount
        })

    values = [
        transaction["amount"]
        for transaction in transactions
    ]

    anomalies = []

    for transaction in transactions:

        result = detect_anomaly(
            transaction["amount"],
            values
        )

        if result["is_anomaly"]:

            anomalies.append({

                "transaction_type":
                    "labour_expense",

                "record_id":
                    transaction["record_id"],

                "farmer_id":
                    transaction["farmer_id"],

                "amount":
                    transaction["amount"],

                "severity":
                    "HIGH",

                "reason":
                    result["message"],

                "detection_method":
                    result["method"],

                "normal_range": {

                    "minimum":
                        result["lower_bound"],

                    "maximum":
                        result["upper_bound"]
                },

                "requires_review":
                    True
            })

    return anomalies


# ============================================================
# HARVEST QUANTITY ANOMALIES
# ============================================================

def detect_harvest_anomalies():

    harvests = Harvest.query.all()

    transactions = []

    for harvest in harvests:

        quantity = safe_float(
            getattr(harvest, "quantity", 0)
        )

        if quantity <= 0:
            continue

        transactions.append({

            "record_id":
                harvest.id,

            "farmer_id":
                getattr(
                    harvest,
                    "farmer_id",
                    None
                ),

            "quantity":
                quantity
        })

    values = [
        transaction["quantity"]
        for transaction in transactions
    ]

    anomalies = []

    for transaction in transactions:

        result = detect_anomaly(
            transaction["quantity"],
            values
        )

        if result["is_anomaly"]:

            anomalies.append({

                "transaction_type":
                    "harvest",

                "record_id":
                    transaction["record_id"],

                "farmer_id":
                    transaction["farmer_id"],

                "quantity":
                    transaction["quantity"],

                "severity":
                    "HIGH",

                "reason":
                    result["message"],

                "detection_method":
                    result["method"],

                "normal_range": {

                    "minimum":
                        result["lower_bound"],

                    "maximum":
                        result["upper_bound"]
                },

                "requires_review":
                    True
            })

    return anomalies


# ============================================================
# FARMER INFORMATION
# ============================================================

def get_farmer_lookup():

    farmers = Farmer.query.all()

    lookup = {}

    for farmer in farmers:

        lookup[farmer.id] = {

            "farmer_id":
                farmer.id,

            "farmer_code":
                farmer.farmer_code,

            "farmer_name":
                farmer.name
        }

    return lookup


# ============================================================
# GENERATE FARMER ANOMALY ANALYSIS
# ============================================================

def generate_anomaly_detection():

    farmer_lookup = get_farmer_lookup()

    input_anomalies = (
        detect_input_purchase_anomalies()
    )

    labour_anomalies = (
        detect_labour_expense_anomalies()
    )

    harvest_anomalies = (
        detect_harvest_anomalies()
    )

    all_anomalies = (
        input_anomalies
        + labour_anomalies
        + harvest_anomalies
    )

    farmers = {}

    for anomaly in all_anomalies:

        farmer_id = anomaly.get(
            "farmer_id"
        )

        if farmer_id not in farmers:

            farmer_info = farmer_lookup.get(
                farmer_id
            )

            if farmer_info:

                farmers[farmer_id] = {

                    "farmer_id":
                        farmer_info["farmer_id"],

                    "farmer_code":
                        farmer_info["farmer_code"],

                    "farmer_name":
                        farmer_info["farmer_name"],

                    "anomaly_count":
                        0,

                    "anomalies":
                        []
                }

        if farmer_id in farmers:

            farmers[farmer_id][
                "anomaly_count"
            ] += 1

            farmers[farmer_id][
                "anomalies"
            ].append(anomaly)

    # --------------------------------------------------------
    # Add farmers with no anomalies
    # --------------------------------------------------------

    for farmer_id, farmer_info in farmer_lookup.items():

        if farmer_id not in farmers:

            farmers[farmer_id] = {

                "farmer_id":
                    farmer_info["farmer_id"],

                "farmer_code":
                    farmer_info["farmer_code"],

                "farmer_name":
                    farmer_info["farmer_name"],

                "anomaly_count":
                    0,

                "anomalies":
                    []
            }

    # --------------------------------------------------------
    # Sort by farmer ID
    # --------------------------------------------------------

    farmer_results = sorted(
        farmers.values(),
        key=lambda farmer:
            farmer["farmer_id"]
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    total_anomalies = len(
        all_anomalies
    )

    farmers_with_anomalies = sum(
        1
        for farmer in farmer_results
        if farmer["anomaly_count"] > 0
    )

    return {

        "status":
            "success",

        "summary": {

            "total_anomalies":
                total_anomalies,

            "farmers_analyzed":
                len(farmer_results),

            "farmers_with_anomalies":
                farmers_with_anomalies,

            "review_required":
                total_anomalies > 0
        },

        "farmers":
            farmer_results
    }