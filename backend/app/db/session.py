"""
MongoDB Motor async client — singleton managed via FastAPI lifespan.

Usage:
    from app.db.session import get_db
    db = Depends(get_db)
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings

settings = get_settings()

# Module-level singleton — initialised once in app lifespan, never recreated.
_client: AsyncIOMotorClient | None = None


def connect_to_mongo() -> None:
    """
    Create and store the Motor client.
    Called once at application startup (lifespan).
    """
    global _client
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        uuidRepresentation="standard",
    )


def close_mongo_connection() -> None:
    """
    Close the Motor client gracefully.
    Called once at application shutdown (lifespan).
    """
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get_db() -> AsyncIOMotorDatabase:
    """
    FastAPI dependency that returns the active database handle.
    Raises RuntimeError if called before startup.
    """
    if _client is None:
        raise RuntimeError("MongoDB client is not initialised. Call connect_to_mongo() first.")
    return _client[settings.db_name]
