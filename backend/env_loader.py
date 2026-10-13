import os
import logging

logger = logging.getLogger(__name__)


def parse_env_content(content: str) -> dict[str, str]:
    """
    Parse the string content of a .env file and return key-value mapping.
    Handles comments, empty lines, and surrounding single/double quotes.
    """
    env_vars = {}
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip()
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            if key:
                env_vars[key] = val
    return env_vars


def load_dotenv(filepath: str | None = None, override: bool = False) -> bool:
    """
    Load environment variables from a .env file into os.environ.
    Populates missing variables, variables with empty string values,
    or all variables if override is True.
    Searches project root and current working directory.
    """
    if filepath is None:
        # Determine project root based on backend/ directory location
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        filepath = os.path.join(base_dir, ".env")
        if not os.path.exists(filepath):
            cwd_file = os.path.join(os.getcwd(), ".env")
            if os.path.exists(cwd_file):
                filepath = cwd_file
            else:
                return False

    if not os.path.isfile(filepath):
        return False

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        parsed = parse_env_content(content)
        for key, val in parsed.items():
            existing = os.environ.get(key)
            if existing is None or not existing.strip() or override:
                os.environ[key] = val
        return True
    except Exception as err:
        logger.warning("Failed to parse .env file at %s: %s", filepath, err)
        return False


