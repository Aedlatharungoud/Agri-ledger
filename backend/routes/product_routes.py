from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.product import Product


product_bp = Blueprint(
    "product_bp",
    __name__
)


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
            if product.created_at
            else None
        ),

        "updatedAt": (
            product.updated_at.isoformat()
            if product.updated_at
            else None
        )
    }


# ============================================================
# GET ALL PRODUCTS
# ============================================================

@product_bp.route(
    "/api/products",
    methods=["GET"]
)
def get_products():

    products = Product.query.all()

    return jsonify([
        product_to_dict(product)
        for product in products
    ])


# ============================================================
# GET PRODUCT BY ID
# ============================================================

@product_bp.route(
    "/api/products/<int:id>",
    methods=["GET"]
)
def get_product(id):

    product = Product.query.get(id)

    if not product:
        return jsonify({
            "error": "Product not found"
        }), 404

    return jsonify(
        product_to_dict(product)
    )


# ============================================================
# CREATE PRODUCT
# ============================================================

@product_bp.route(
    "/api/products",
    methods=["POST"]
)
def create_product():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "productName",
        "category",
        "unit"
    ]

    for field_name in required_fields:

        if field_name not in data:
            return jsonify({
                "error": f"{field_name} is required"
            }), 400

    try:

        product = Product(
            product_name=data["productName"],
            category=data["category"],
            brand_name=data.get("brandName"),
            unit=data["unit"]
        )

        db.session.add(product)
        db.session.commit()

        return jsonify({
            "message": "Product created successfully",
            "product": product_to_dict(product)
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# UPDATE PRODUCT
# ============================================================

@product_bp.route(
    "/api/products/<int:id>",
    methods=["PUT"]
)
def update_product(id):

    product = Product.query.get(id)

    if not product:
        return jsonify({
            "error": "Product not found"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    try:

        if "productName" in data:
            product.product_name = data["productName"]

        if "category" in data:
            product.category = data["category"]

        if "brandName" in data:
            product.brand_name = data["brandName"]

        if "unit" in data:
            product.unit = data["unit"]

        db.session.commit()

        return jsonify({
            "message": "Product updated successfully",
            "product": product_to_dict(product)
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# ============================================================
# DELETE PRODUCT
# ============================================================

@product_bp.route(
    "/api/products/<int:id>",
    methods=["DELETE"]
)
def delete_product(id):

    product = Product.query.get(id)

    if not product:
        return jsonify({
            "error": "Product not found"
        }), 404

    try:

        db.session.delete(product)
        db.session.commit()

        return jsonify({
            "message": "Product deleted successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500