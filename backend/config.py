import os
import logging
from datetime import timedelta
from backend.env_loader import load_dotenv

logger = logging.getLogger(__name__)

# Load .env file into environment before reading configuration
load_dotenv()

# ============================================================
# MYSQL DATABASE CONFIGURATION
# All credentials are read from environment variables.
# Development defaults are provided only where explicitly safe.
# ============================================================

MYSQL_HOST = os.environ.get("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.environ.get("MYSQL_PORT", 3306))
MYSQL_USER = os.environ.get("MYSQL_USER", "root")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "root")
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "agri_ledger")

def get_cors_origins() -> list[str]:
    """
    Return allowed CORS origins.
    Reads CORS_ORIGINS from environment (comma- or semicolon-separated).
    Falls back to development origins if unset.
    """
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if raw:
        origins = [o.strip() for o in raw.replace(";", ",").split(",") if o.strip()]
        if origins:
            return origins

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]



SQLALCHEMY_DATABASE_URI = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
)



# ============================================================
# DEVELOPMENT CONFIGURATION
# Used by default when FLASK_ENV is not set to "production".
# SESSION_COOKIE_SECURE is False to allow HTTP on localhost.
# The SECRET_KEY falls back to a safe dev-only value.
# ============================================================

class Config:

    # ========================================================
    # DATABASE
    # ========================================================

    SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    # ========================================================
    # FLASK SESSION
    # ========================================================

    SECRET_KEY = os.environ.get(
        "AGRILEDGER_SECRET_KEY",
        "agriledger-dev-secret-key-change-before-deployment",
    )

    SESSION_COOKIE_NAME = "agriledger_session"

    SESSION_COOKIE_HTTPONLY = True

    SESSION_COOKIE_SAMESITE = "Lax"

    # HTTP-only in development. Production overrides this to True.
    SESSION_COOKIE_SECURE = False

    SESSION_COOKIE_PATH = "/"

    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    SESSION_REFRESH_EACH_REQUEST = True

    # ========================================================
    # CORS
    # ========================================================

    CORS_ORIGINS = get_cors_origins()

    # ========================================================
    # JSON
    # ========================================================

    JSON_SORT_KEYS = False



# ============================================================
# PRODUCTION CONFIGURATION
#
# Activated by passing this class to app.config.from_object()
# or by setting FLASK_ENV=production.
#
# Requirements before deploying:
#   - AGRILEDGER_SECRET_KEY must be set and not the dev fallback.
#   - MYSQL_PASSWORD must be set to the production credential.
#   - HTTPS must be configured on the hosting infrastructure.
#   - DEBUG must remain False (never set in this class).
# ============================================================

_UNSAFE_DEV_KEY = "agriledger-dev-secret-key-change-before-deployment"


class ProductionConfig(Config):

    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    @classmethod
    def validate(cls):
        """
        Call this during application startup in production to
        detect missing or insecure configuration early.


        Raises RuntimeError if the environment is misconfigured.
        Does NOT log secret values.
        """
        secret = os.environ.get("AGRILEDGER_SECRET_KEY", "")

        if not secret:
            raise RuntimeError(
                "AGRILEDGER_SECRET_KEY environment variable is not set. "
                "Set a strong random value before starting in production."
            )

        if secret == _UNSAFE_DEV_KEY:
            raise RuntimeError(
                "AGRILEDGER_SECRET_KEY is set to the development fallback value. "
                "Generate a strong random secret before deploying to production."
            )

        if len(secret) < 32:
            raise RuntimeError(
                "AGRILEDGER_SECRET_KEY is too short (minimum 32 characters). "
                "Generate a strong random secret before deploying to production."
            )

        if not os.environ.get("MYSQL_PASSWORD"):
            logger.warning(
                "MYSQL_PASSWORD is not set in the environment. "
                "Using the default value — safe only for local development."
            )

        logger.info("ProductionConfig.validate() passed.")