import os
import logging
from urllib.parse import quote_plus
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
MYSQL_SSL_CA = os.environ.get("MYSQL_SSL_CA", "").strip()

def get_engine_options() -> dict:
    """
    Return SQLAlchemy engine options.
    Enables TLS/SSL with CA certificate verification if MYSQL_SSL_CA is set,
    or if connecting to a cloud TiDB instance (port 4000) with a local CA certificate available.
    Preserves default unencrypted connection for local development (port 3306).
    """
    options = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    default_ca = os.path.join(base_dir, "backend", "certs", "isrgrootx1.pem")

    ssl_ca = os.environ.get("MYSQL_SSL_CA", "").strip()
    try:
        port = int(os.environ.get("MYSQL_PORT", str(MYSQL_PORT)))
    except (ValueError, TypeError):
        port = 3306

    ca_path = None
    if ssl_ca:
        ca_path = ssl_ca if os.path.isabs(ssl_ca) else os.path.normpath(os.path.join(base_dir, ssl_ca))
    elif port == 4000 and os.path.isfile(default_ca):
        ca_path = default_ca

    if ca_path:
        if os.path.isfile(ca_path):
            options["connect_args"] = {
                "ssl": {
                    "ca": ca_path,
                    "check_hostname": True,
                }
            }
        else:
            logger.warning("Configured CA certificate not found at: %s", ca_path)

    return options

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
    f"mysql+pymysql://{quote_plus(str(MYSQL_USER))}:{quote_plus(str(MYSQL_PASSWORD))}"
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

    SQLALCHEMY_ENGINE_OPTIONS = get_engine_options()

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
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")

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

        ssl_ca = os.environ.get("MYSQL_SSL_CA", "").strip()
        if ssl_ca:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            resolved_ca = ssl_ca if os.path.isabs(ssl_ca) else os.path.normpath(os.path.join(base_dir, ssl_ca))
            if not os.path.isfile(resolved_ca):
                raise RuntimeError(
                    f"Configured MYSQL_SSL_CA file not found: {resolved_ca}"
                )

        logger.info("ProductionConfig.validate() passed.")