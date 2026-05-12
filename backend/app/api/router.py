"""
Central API router — mounts all versioned sub-routers.

All routes are prefixed with /api/v1 automatically.
"""

from fastapi import APIRouter

from app.api.v1.ticket.controller import router as ticket_router

api_router = APIRouter(prefix="/api/v1")

# Register component routers
api_router.include_router(ticket_router)
