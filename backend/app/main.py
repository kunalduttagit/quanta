"""
FastAPI application factory and lifespan manager.

Startup: Connect to MongoDB Atlas
Shutdown: Close Motor client cleanly
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.session import close_mongo_connection, connect_to_mongo

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application lifespan — called once on startup and once on shutdown.
    Ensures Motor client is properly connected before routes start serving.
    """
    connect_to_mongo()
    yield
    close_mongo_connection()


def create_app() -> FastAPI:
    """
    Application factory — creates and configures the FastAPI instance.

    Returns:
        Configured FastAPI application.
    """
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Ticket Management System API. "
            "Manage, track, and analyse tickets across multiple business domains."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ───────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routes ─────────────────────────────────────────────────────────────────
    app.include_router(api_router)

    # ── Health check ───────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"], summary="Health check")
    async def health() -> dict:
        """Returns 200 OK when the service is running."""
        return {"status": "ok", "version": settings.app_version}

    return app


app = create_app()
