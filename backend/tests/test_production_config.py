"""
AgriLedger AI — Production Security & Configuration Tests
=========================================================
Validates:
1. Automatic selection of Config in development vs ProductionConfig in production.
2. ProductionConfig.validate() enforces strong, non-default AGRILEDGER_SECRET_KEY:
   - Missing key -> raises RuntimeError
   - Insecure development fallback key -> raises RuntimeError
   - Too short key (< 32 chars) -> raises RuntimeError
   - Valid strong secret (>= 32 chars) -> passes validation
3. Session cookie security in production:
   - SESSION_COOKIE_SECURE is True in ProductionConfig
   - SESSION_COOKIE_HTTPONLY is True
   - SESSION_COOKIE_SAMESITE is Lax
   - SESSION_COOKIE_NAME is agriledger_session
4. CORS origin resolution:
   - Falls back to standard local ports when CORS_ORIGINS is unset
   - Parses custom comma/semicolon-separated origins from CORS_ORIGINS env var
5. Debug mode disabled in production.
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Prevent database connection attempts during config testing
from backend.extensions import db as _db
_db.init_app = lambda app: None
_db.create_all = lambda: None

from backend.config import (
    Config,
    ProductionConfig,
    get_cors_origins,
    _UNSAFE_DEV_KEY,
)
from backend.app import create_app


VALID_STRONG_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"


class TestProductionSecurityConfiguration(unittest.TestCase):
    """Test environment configuration loading, secrets validation, and session cookies."""

    def test_default_development_config(self):
        """In development mode, Config is selected with insecure cookie for localhost."""
        with patch.dict(os.environ, {"FLASK_ENV": "development", "ENV": ""}):
            app = create_app()
            self.assertFalse(app.config["SESSION_COOKIE_SECURE"])
            self.assertTrue(app.config["SESSION_COOKIE_HTTPONLY"])
            self.assertEqual(app.config["SESSION_COOKIE_SAMESITE"], "Lax")
            self.assertEqual(app.config["SESSION_COOKIE_NAME"], "agriledger_session")

    def test_production_config_selection_and_secure_cookies(self):
        """When FLASK_ENV=production, ProductionConfig is selected with SESSION_COOKIE_SECURE=True."""
        env_vars = {
            "FLASK_ENV": "production",
            "AGRILEDGER_SECRET_KEY": VALID_STRONG_SECRET,
            "MYSQL_PASSWORD": "strong-production-mysql-password",
        }
        with patch.dict(os.environ, env_vars):
            app = create_app()
            self.assertTrue(app.config["SESSION_COOKIE_SECURE"])
            self.assertTrue(app.config["SESSION_COOKIE_HTTPONLY"])
            self.assertEqual(app.config["SESSION_COOKIE_SAMESITE"], "Lax")
            self.assertEqual(app.config["SESSION_COOKIE_NAME"], "agriledger_session")
            self.assertFalse(app.config.get("DEBUG", False))

    def test_production_custom_samesite_cookie(self):
        """When SESSION_COOKIE_SAMESITE is set to None in production, it is honored and Secure remains True."""
        env_vars = {
            "FLASK_ENV": "production",
            "AGRILEDGER_SECRET_KEY": VALID_STRONG_SECRET,
            "MYSQL_PASSWORD": "strong-production-mysql-password",
            "SESSION_COOKIE_SAMESITE": "None",
        }
        with patch.dict(os.environ, env_vars):
            app = create_app()
            self.assertTrue(app.config["SESSION_COOKIE_SECURE"])
            self.assertEqual(app.config["SESSION_COOKIE_SAMESITE"], "None")

    def test_production_rejects_missing_secret_key(self):
        """Production startup must raise RuntimeError when AGRILEDGER_SECRET_KEY is missing."""
        env_vars = {
            "FLASK_ENV": "production",
            "AGRILEDGER_SECRET_KEY": "",
        }
        with patch.dict(os.environ, env_vars):
            with self.assertRaises(RuntimeError) as ctx:
                create_app()
            self.assertIn("AGRILEDGER_SECRET_KEY environment variable is not set", str(ctx.exception))

    def test_production_rejects_dev_fallback_secret_key(self):
        """Production startup must raise RuntimeError when AGRILEDGER_SECRET_KEY uses dev fallback."""
        env_vars = {
            "FLASK_ENV": "production",
            "AGRILEDGER_SECRET_KEY": _UNSAFE_DEV_KEY,
        }
        with patch.dict(os.environ, env_vars):
            with self.assertRaises(RuntimeError) as ctx:
                create_app()
            self.assertIn("development fallback value", str(ctx.exception))

    def test_production_rejects_short_secret_key(self):
        """Production startup must raise RuntimeError when AGRILEDGER_SECRET_KEY is < 32 characters."""
        env_vars = {
            "FLASK_ENV": "production",
            "AGRILEDGER_SECRET_KEY": "short-secret-123",  # 16 chars
        }
        with patch.dict(os.environ, env_vars):
            with self.assertRaises(RuntimeError) as ctx:
                create_app()
            self.assertIn("minimum 32 characters", str(ctx.exception))

    def test_cors_origins_from_environment(self):
        """get_cors_origins must read comma-separated list from environment."""
        with patch.dict(os.environ, {"CORS_ORIGINS": "https://agriledger.farm, https://app.agriledger.farm"}):
            origins = get_cors_origins()
            self.assertEqual(origins, ["https://agriledger.farm", "https://app.agriledger.farm"])

    def test_cors_origins_default_fallback(self):
        """When CORS_ORIGINS is empty, production Vercel domain and standard local development ports are returned."""
        with patch.dict(os.environ, {"CORS_ORIGINS": ""}):
            origins = get_cors_origins()
            self.assertIn("https://agri-ledger-ten.vercel.app", origins)
            self.assertIn("http://localhost:5173", origins)
            self.assertIn("http://localhost:5174", origins)

    def test_cors_preflight_for_production_origin(self):
        """Preflight OPTIONS request from https://agri-ledger-ten.vercel.app to /api/auth/login returns 200 with credentials allowed."""
        app = create_app()
        client = app.test_client()
        response = client.options(
            "/api/auth/login",
            headers={
                "Origin": "https://agri-ledger-ten.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Origin"),
            "https://agri-ledger-ten.vercel.app",
        )
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Credentials"),
            "true",
        )


if __name__ == "__main__":
    unittest.main()
