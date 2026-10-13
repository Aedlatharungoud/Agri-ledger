from functools import wraps

from flask import jsonify, session

from backend.models.user import User


def get_current_user():
    """
    Return the currently authenticated active user.

    The user's ID is stored in the Flask session after login.
    """

    user_id = session.get("user_id")

    if not user_id:
        return None

    user = User.query.get(user_id)

    if not user:
        session.clear()
        return None

    if not user.is_active:
        session.clear()
        return None

    return user


def login_required(function):
    """
    Require an authenticated user.
    """

    @wraps(function)
    def decorated_function(*args, **kwargs):

        user = get_current_user()

        if not user:
            return jsonify({
                "status": "error",
                "message": "Authentication required."
            }), 401

        return function(*args, **kwargs)

    return decorated_function


def roles_required(*allowed_roles):
    """
    Require the logged-in user to have one of the
    specified roles.

    Example:

        @roles_required("ADMIN")

    or:

        @roles_required("ADMIN", "FARMER")
    """

    def decorator(function):

        @wraps(function)
        def decorated_function(*args, **kwargs):

            user = get_current_user()

            if not user:
                return jsonify({
                    "status": "error",
                    "message": "Authentication required."
                }), 401

            if user.role not in allowed_roles:
                return jsonify({
                    "status": "error",
                    "message": "You do not have permission to access this resource."
                }), 403

            return function(*args, **kwargs)

        return decorated_function

    return decorator


def admin_required(function):
    """
    Shortcut for ADMIN-only endpoints.
    """

    @wraps(function)
    def decorated_function(*args, **kwargs):

        user = get_current_user()

        if not user:
            return jsonify({
                "status": "error",
                "message": "Authentication required."
            }), 401

        if user.role != "ADMIN":
            return jsonify({
                "status": "error",
                "message": "Administrator access required."
            }), 403

        return function(*args, **kwargs)

    return decorated_function


def farmer_required(function):
    """
    Require the authenticated user to be a FARMER.
    """

    @wraps(function)
    def decorated_function(*args, **kwargs):

        user = get_current_user()

        if not user:
            return jsonify({
                "status": "error",
                "message": "Authentication required."
            }), 401

        if user.role != "FARMER":
            return jsonify({
                "status": "error",
                "message": "Farmer access required."
            }), 403

        if not user.farmer_id:
            return jsonify({
                "status": "error",
                "message": "This farmer account is not linked to a farmer record."
            }), 403

        return function(*args, **kwargs)

    return decorated_function


def get_current_farmer_id():
    """
    Return the farmer_id associated with the logged-in user.

    Returns:
        None for unauthenticated users or users without
        a linked farmer record.
    """

    user = get_current_user()

    if not user:
        return None

    if user.role != "FARMER":
        return None

    return user.farmer_id


def can_access_farmer(farmer_id):
    """
    Determine whether the current user can access
    a particular farmer's records.

    ADMIN:
        Can access every farmer.

    FARMER:
        Can access only their own farmer record.
    """

    user = get_current_user()

    if not user:
        return False

    if user.role == "ADMIN":
        return True

    if user.role == "FARMER":
        return (
            user.farmer_id is not None
            and int(user.farmer_id) == int(farmer_id)
        )

    return False


def farmer_access_required(function):
    """
    Protect an endpoint containing a farmer_id parameter.

    The endpoint must have a parameter named farmer_id.

    ADMIN:
        Allowed for every farmer.

    FARMER:
        Allowed only for their own farmer_id.
    """

    @wraps(function)
    def decorated_function(*args, **kwargs):

        user = get_current_user()

        if not user:
            return jsonify({
                "status": "error",
                "message": "Authentication required."
            }), 401

        farmer_id = kwargs.get("farmer_id")

        if farmer_id is None:
            return jsonify({
                "status": "error",
                "message": "Farmer ID is required."
            }), 400

        if user.role == "ADMIN":
            return function(*args, **kwargs)

        if user.role != "FARMER":
            return jsonify({
                "status": "error",
                "message": "Access denied."
            }), 403

        if not user.farmer_id:
            return jsonify({
                "status": "error",
                "message": "This farmer account is not linked to a farmer record."
            }), 403

        if int(user.farmer_id) != int(farmer_id):
            return jsonify({
                "status": "error",
                "message": "You can only access your own farmer records."
            }), 403

        return function(*args, **kwargs)

    return decorated_function