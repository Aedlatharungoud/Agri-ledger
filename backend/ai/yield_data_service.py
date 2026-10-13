from statistics import mean

from backend.models.harvest import Harvest
from backend.models.crop_season import CropSeason
from backend.models.field import Field


# ============================================================
# SAFE CONVERSION
# ============================================================

def safe_float(value):
    """
    Safely convert a database value to float.
    """

    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


# ============================================================
# NORMALIZE UNIT
# ============================================================

def normalize_quantity_to_kg(quantity, unit):
    """
    Convert harvest quantity to KG where possible.

    The current AgriLedger harvest model stores a quantity
    together with a unit.

    KG is the primary supported unit for yield modelling.
    """

    quantity = safe_float(quantity)

    if not unit:
        return quantity

    unit = str(unit).strip().upper()

    # Already KG
    if unit in ("KG", "KGS", "KILOGRAM", "KILOGRAMS"):
        return quantity

    # Metric tonne
    if unit in ("TON", "TONNE", "TONNES", "MT"):
        return quantity * 1000

    # Quintal
    if unit in ("QUINTAL", "QUINTALS", "QTL"):
        return quantity * 100

    # Unknown unit
    return None


# ============================================================
# BUILD HISTORICAL YIELD DATASET
# ============================================================

def build_yield_dataset():

    harvests = Harvest.query.all()

    rows = []

    for harvest in harvests:

        # ----------------------------------------------------
        # BASIC HARVEST INFORMATION
        # ----------------------------------------------------

        quantity_kg = normalize_quantity_to_kg(
            harvest.quantity,
            harvest.unit
        )

        if quantity_kg is None or quantity_kg <= 0:
            continue

        # ----------------------------------------------------
        # FIELD
        # ----------------------------------------------------

        field = Field.query.filter_by(
            id=harvest.field_id
        ).first()

        if not field:
            continue

        area_acres = safe_float(
            field.area_acres
        )

        if area_acres <= 0:
            continue

        # ----------------------------------------------------
        # CROP SEASON
        # ----------------------------------------------------

        crop_season = CropSeason.query.filter_by(
            id=harvest.crop_season_id
        ).first()

        # Crop season information may not always exist
        # in older records, so we handle it safely.

        crop_name = harvest.crop_name

        season = None
        year = None

        if crop_season:

            if crop_season.crop_name:
                crop_name = crop_season.crop_name

            season = crop_season.season
            year = crop_season.year

        # ----------------------------------------------------
        # IRRIGATION
        # ----------------------------------------------------

        irrigation_type = (
            field.irrigation_type
            if field.irrigation_type
            else "UNKNOWN"
        )

        # ----------------------------------------------------
        # HISTORICAL YIELD
        # ----------------------------------------------------

        yield_kg_per_acre = (
            quantity_kg / area_acres
        )

        # ----------------------------------------------------
        # DATA ROW
        # ----------------------------------------------------

        rows.append({

            "harvest_id":
                harvest.id,

            "farmer_id":
                harvest.farmer_id,

            "field_id":
                harvest.field_id,

            "crop_season_id":
                harvest.crop_season_id,

            "crop_name":
                str(crop_name).strip()
                if crop_name
                else "UNKNOWN",

            "season":
                str(season).strip()
                if season
                else "UNKNOWN",

            "year":
                int(year)
                if year
                else None,

            "area_acres":
                area_acres,

            "irrigation_type":
                str(irrigation_type).strip(),

            "harvest_quantity_kg":
                quantity_kg,

            "yield_kg_per_acre":
                yield_kg_per_acre,

            "harvest_date":
                harvest.harvest_date
        })

    return rows


# ============================================================
# DATASET SUMMARY
# ============================================================

def get_yield_dataset_summary():

    rows = build_yield_dataset()

    if not rows:

        return {

            "status": "success",

            "summary": {

                "total_records": 0,

                "unique_crops": 0,

                "unique_seasons": 0,

                "unique_fields": 0,

                "average_yield_kg_per_acre": 0

            },

            "records": []
        }

    crops = {
        row["crop_name"]
        for row in rows
    }

    seasons = {
        row["season"]
        for row in rows
    }

    fields = {
        row["field_id"]
        for row in rows
    }

    average_yield = mean(
        row["yield_kg_per_acre"]
        for row in rows
    )

    return {

        "status": "success",

        "summary": {

            "total_records":
                len(rows),

            "unique_crops":
                len(crops),

            "unique_seasons":
                len(seasons),

            "unique_fields":
                len(fields),

            "average_yield_kg_per_acre":
                round(
                    average_yield,
                    2
                )
        },

        "records": rows
    }