from werkzeug.security import generate_password_hash

from backend.app import app
from backend.extensions import db
from backend.models.user import User


# ============================================================
# CREATE OR UPDATE USER
# ============================================================

def create_or_update_user(
    username,
    password,
    role,
    farmer_id=None
):
    user = User.query.filter_by(
        username=username
    ).first()

    password_hash = generate_password_hash(password)

    # --------------------------------------------------------
    # CREATE USER
    # --------------------------------------------------------

    if not user:

        user = User(
            username=username,
            password_hash=password_hash,
            role=role,
            farmer_id=farmer_id,
            is_active=True
        )

        db.session.add(user)

        print(
            f"Created {role} user: {username}"
        )

        return

    # --------------------------------------------------------
    # UPDATE EXISTING USER
    # --------------------------------------------------------

    user.password_hash = password_hash
    user.role = role
    user.farmer_id = farmer_id
    user.is_active = True

    print(
        f"Updated {role} user: {username}"
    )


# ============================================================
# CREATE / UPDATE DEVELOPMENT ACCOUNTS
# ============================================================

with app.app_context():

    create_or_update_user(
        username="admin",
        password="admin123",
        role="ADMIN",
        farmer_id=None
    )

    create_or_update_user(
        username="ramesh",
        password="farmer123",
        role="FARMER",
        farmer_id=1
    )

    db.session.commit()

    print()
    print("=" * 55)
    print("AgriLedger authentication setup completed.")
    print("=" * 55)
    print()
    print("ADMIN")
    print("Username : admin")
    print("Password : admin123")
    print()
    print("FARMER")
    print("Username : ramesh")
    print("Password : farmer123")
    print()
    print("=" * 55)