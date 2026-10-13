
from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models.product import Product
from backend.auth_utils import get_current_user


product_bp = Blueprint("product_bp", __name__)


# ============================================================
# AUTHENTICATION AND ADMIN ACCESS
# ============================================================

def require_admin():
    user = get_current_user()

    if user is None:
        return None, (
            jsonify({
                "status": "error",
                "message": "Authentication required."
            }),
            401
        )

    if user.role != "ADMIN":
        return None, (
            jsonify({
                "status": "error",
                "message": "Administrator access required."
            }),
            403
        )

    return user, None


# ============================================================
# CONVERT PRODUCT TO JSON
# ============================================================

def product_to_dict(product):
    return {
        "id": product.id,
        "productName": product.product_name,
        "category": product.category,
        "brandName": product.brand_name,
        "unit": product.unit,
        "createdAt": (
            product.created_at.isoformat()
            if product.created_at else None
        ),
        "updatedAt": (
            product.updated_at.isoformat()
            if product.updated_at else None
        )
    }


# ============================================================
# VALIDATE REQUEST DATA
# ============================================================

def validate_product_data(data, partial=False):
    if not isinstance(data, dict):
        return None, (
            jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }),
            400
        )

    allowed_fields = {
        "productName",
        "category",
        "brandName",
        "unit"
    }

    unknown_fields = set(data.keys()) - allowed_fields

    if unknown_fields:
        return None, (
            jsonify({
                "status": "error",
                "message": "Unsupported field(s): "
                + ", ".join(sorted(unknown_fields))
            }),
            400
        )

    required_fields = ["productName", "category", "unit"]

    if not partial:
        missing = [
            field for field in required_fields
            if field not in data
        ]

        if missing:
            return None, (
                jsonify({
                    "status": "error",
                    "message": "Missing required field(s): "
                    + ", ".join(missing)
                }),
                400
            )

    cleaned = {}

    for key in ("productName", "category", "unit"):
        if key in data:
            value = data[key]

            if not isinstance(value, str) or not value.strip():
                return None, (
                    jsonify({
                        "status": "error",
                        "message": f"{key} must be a non-empty string."
                    }),
                    400
                )

            model_key = {
                "productName": "product_name",
                "category": "category",
                "unit": "unit"
            }[key]

            cleaned[model_key] = value.strip()

    if "brandName" in data:
        value = data["brandName"]

        if value is not None and not isinstance(value, str):
            return None, (
                jsonify({
                    "status": "error",
                    "message": "brandName must be text or null."
                }),
                400
            )

        cleaned["brand_name"] = value.strip() if value else None

    if partial and not cleaned:
        return None, (
            jsonify({
                "status": "error",
                "message": "Provide at least one valid field to update."
            }),
            400
        )

    return cleaned, None


# ============================================================
# GET ALL PRODUCTS
# Authenticated users may view products.
# ============================================================

@product_bp.route("/api/products", methods=["GET"])
def get_products():
    user = get_current_user()

    if user is None:
        return jsonify({
            "status": "error",
            "message": "Authentication required."
        }), 401

    try:
        products = Product.query.order_by(Product.id.asc()).all()

        return jsonify([
            product_to_dict(product)
            for product in products
        ]), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve products."
        }), 500


# ============================================================
# GET PRODUCT BY ID
# Authenticated users may view a product.
# ============================================================

@product_bp.route("/api/products/<int:id>", methods=["GET"])
def get_product(id):
    user = get_current_user()

    if user is None:
        return jsonify({
            "status": "error",
            "message": "Authentication required."
        }), 401

    try:
        product = db.session.get(Product, id)

        if product is None:
            return jsonify({
                "status": "error",
                "message": "Product not found."
            }), 404

        return jsonify(product_to_dict(product)), 200

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve the product."
        }), 500


# ============================================================
# CREATE PRODUCT — ADMIN ONLY
# ============================================================

@product_bp.route("/api/products", methods=["POST"])
def create_product():
    user, error = require_admin()

    if error:
        return error

    data = request.get_json(silent=True)
    cleaned, error = validate_product_data(data)

    if error:
        return error

    try:
        product = Product(**cleaned)

        db.session.add(product)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Product created successfully.",
            "product": product_to_dict(product)
        }), 201

    except Exception:
        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": "Unable to create product. Check the supplied data."
        }), 500


# ============================================================
# UPDATE PRODUCT — ADMIN ONLY
# ============================================================

@product_bp.route("/api/products/<int:id>", methods=["PUT"])
def update_product(id):
    user, error = require_admin()

    if error:
        return error

    data = request.get_json(silent=True)
    cleaned, error = validate_product_data(data, partial=True)

    if error:
        return error

    try:
        product = db.session.get(Product, id)

        if product is None:
            return jsonify({
                "status": "error",
                "message": "Product not found."
            }), 404

        for key, value in cleaned.items():
            setattr(product, key, value)

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Product updated successfully.",
            "product": product_to_dict(product)
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": "Unable to update product. Check the supplied data."
        }), 500


# ============================================================
# DELETE PRODUCT — ADMIN ONLY
# ============================================================

@product_bp.route("/api/products/<int:id>", methods=["DELETE"])
def delete_product(id):
    user, error = require_admin()

    if error:
        return error

    try:
        product = db.session.get(Product, id)

        if product is None:
            return jsonify({
                "status": "error",
                "message": "Product not found."
            }), 404

        db.session.delete(product)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Product deleted successfully."
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "status": "error",
            "message": (
                "Unable to delete product. It may be referenced by "
                "existing purchase or inventory records."
            )
        }), 500
