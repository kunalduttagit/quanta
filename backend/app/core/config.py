"""
Application configuration using pydantic-settings.
Reads environment variables from .env file automatically.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central application settings. All values sourced from environment variables
    or the .env file at the project root.
    """

    # ── MongoDB ────────────────────────────────────────────────────────────────
    mongodb_uri: str
    db_name: str = "ticketdb"

    # ── App ────────────────────────────────────────────────────────────────────
    app_name: str = "Ticket Management System"
    app_version: str = "1.0.0"
    debug: bool = False

    # ── CORS ───────────────────────────────────────────────────────────────────
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://ticket.kunaldutta.com",
        "https://quanta.kunaldutta.com",
        "http://quanta.kunaldutta.com",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Returns a cached singleton Settings instance.
    Cached so env file is read only once per process lifetime — lambda-safe.
    """
    return Settings()
