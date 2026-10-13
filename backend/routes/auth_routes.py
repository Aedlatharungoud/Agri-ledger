from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash

from backend.auth_utils import get_current_user
from backend.models.user import User


auth_bp = Blueprint(
    "auth_bp",
    __name__,
    url_prefix="/api/auth"
)


# ============================================================
# USER TO JSON
# ============================================================

def user_to_dict(user):
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "farmerId": user.farmer_id,
        "isActive": bool(user.is_active),
    }


# ============================================================
# LOGIN
# ============================================================

@auth_bp.route(
    "/login",
    methods=["POST"]
)
def login():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body is required."
        }), 400

    username = str(
        data.get("username", "")
    ).strip()

    password = str(
        data.get("password", "")
    )

    if not username:
        return jsonify({
            "status": "error",
            "message": "Username is required."
        }), 400

    if not password:
        return jsonify({
            "status": "error",
            "message": "Password is required."
        }), 400

    user = User.query.filter_by(
        username=username
    ).first()

    if not user:
        return jsonify({
            "status": "error",
            "message": "Invalid username or password."
        }), 401

    if not user.is_active:
        return jsonify({
            "status": "error",
            "message": "This account is inactive."
        }), 403

    if not check_password_hash(
        user.password_hash,
        password
    ):
        return jsonify({
            "status": "error",
            "message": "Invalid username or password."
        }), 401

    # Prevent session fixation.
    session.clear()

    session["user_id"] = user.id
    session["role"] = user.role

    return jsonify({
        "status": "success",
        "message": "Login successful.",
        "user": user_to_dict(user)
    }), 200


# ============================================================
# CURRENT USER
# ============================================================

@auth_bp.route(
    "/me",
    methods=["GET"]
)
def current_user():

    user = get_current_user()

    if not user:
        return jsonify({
            "status": "error",
            "authenticated": False,
            "message": "Not authenticated."
        }), 401

    return jsonify({
        "status": "success",
        "authenticated": True,
        "user": user_to_dict(user)
    }), 200


# ============================================================
# LOGOUT
# ============================================================

@auth_bp.route(
    "/logout",
    methods=["POST"]
)
def logout():

    session.clear()

    return jsonify({
        "status": "success",
        "message": "Logged out successfully."
    }), 200