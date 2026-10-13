from backend.models.market_sale import MarketSale
from backend.models.harvest import Harvest


def build_market_price_dataset():

    sales = MarketSale.query.all()

    rows = []

    for sale in sales:

        # =====================================================
        # BASIC SALE DATA
        # =====================================================

        quantity_sold = float(
            sale.quantity_sold or 0
        )

        rate_per_unit = float(
            sale.rate_per_unit or 0
        )

        gross_amount = float(
            sale.gross_amount or 0
        )

        # =====================================================
        # FIND HARVEST
        # =====================================================

        harvest = Harvest.query.filter_by(
            id=sale.harvest_id
        ).first()

        if harvest is None:
            continue

        crop_name = str(
            harvest.crop_name
        )

        # =====================================================
        # CALCULATE PRICE
        # =====================================================

        calculated_rate = rate_per_unit

        if calculated_rate <= 0 and quantity_sold > 0:

            calculated_rate = (
                gross_amount /
                quantity_sold
            )

        # =====================================================
        # MARKET NAME
        # =====================================================

        market_name = (
            str(sale.market_name)
            if sale.market_name
            else "UNKNOWN"
        )

        # =====================================================
        # UNIT
        # =====================================================

        unit = (
            str(sale.unit)
            if sale.unit
            else harvest.unit
        )

        # =====================================================
        # DATE
        # =====================================================

        sale_date = sale.sale_date

        # =====================================================
        # ADD DATASET ROW
        # =====================================================

        rows.append({

            "sale_id":
                int(sale.id),

            "farmer_id":
                int(sale.farmer_id),

            "harvest_id":
                int(sale.harvest_id),

            "crop_name":
                crop_name,

            "market_name":
                market_name,

            "sale_date":
                sale_date,

            "quantity_sold":
                quantity_sold,

            "unit":
                unit,

            "rate_per_unit":
                calculated_rate,

            "gross_amount":
                gross_amount

        })

    return rows


# =============================================================
# DATASET SUMMARY
# =============================================================

def get_market_price_dataset_summary():

    records = build_market_price_dataset()

    if not records:

        return {

            "status":
                "success",

            "summary": {

                "total_records":
                    0,

                "unique_crops":
                    0,

                "unique_markets":
                    0,

                "average_price":
                    0

            },

            "records":
                []

        }

    # =========================================================
    # UNIQUE CROPS
    # =========================================================

    unique_crops = set()

    for record in records:

        unique_crops.add(
            record["crop_name"]
        )

    # =========================================================
    # UNIQUE MARKETS
    # =========================================================

    unique_markets = set()

    for record in records:

        unique_markets.add(
            record["market_name"]
        )

    # =========================================================
    # AVERAGE PRICE
    # =========================================================

    valid_prices = [

        record["rate_per_unit"]

        for record in records

        if record["rate_per_unit"] > 0

    ]

    average_price = 0

    if valid_prices:

        average_price = (
            sum(valid_prices) /
            len(valid_prices)
        )

    # =========================================================
    # SERIALIZABLE RECORDS
    # =========================================================

    serializable_records = []

    for record in records:

        serializable_records.append({

            **record,

            "sale_date":
                (
                    record["sale_date"].isoformat()
                    if record["sale_date"]
                    else None
                )

        })

    # =========================================================
    # FINAL RESULT
    # =========================================================

    return {

        "status":
            "success",

        "summary": {

            "total_records":
                len(records),

            "unique_crops":
                len(unique_crops),

            "unique_markets":
                len(unique_markets),

            "average_price":
                round(
                    average_price,
                    2
                )

        },

        "records":
            serializable_records

    }