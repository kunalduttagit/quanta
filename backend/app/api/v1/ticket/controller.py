"""
Ticket API controller — all route definitions.

Routes:
    POST   /tickets/          → create ticket
    GET    /tickets/          → list tickets (filter, sort, paginate)
    GET    /tickets/summary   → analytics summary
    GET    /tickets/{id}      → get single ticket
    PATCH  /tickets/{id}      → partial update
    DELETE /tickets/{id}      → delete ticket
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.ticket.schema import (
    TicketCreate,
    TicketListResponse,
    TicketPublic,
    TicketSummary,
    TicketUpdate,
)
from app.api.v1.ticket.service import TicketService
from app.db.session import get_db

router = APIRouter(prefix="/tickets", tags=["Tickets"])


# ── Dependency Injection Factory ───────────────────────────────────────────────

def get_ticket_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> TicketService:
    """DI factory — FastAPI calls this per request to inject TicketService."""
    return TicketService(db)


ServiceDep = Annotated[TicketService, Depends(get_ticket_service)]


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=TicketPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new ticket",
)
async def create_ticket(data: TicketCreate, service: ServiceDep) -> TicketPublic:
    """
    Create a new ticket.

    - **title**: Required, max 200 characters
    - **domain**: One of Engineering, DevOps, HR, IT, Finance
    - **priority**: One of Low, Medium, High, Critical
    - **start_date**: Defaults to current UTC time if not provided
    - **deadline**: Must be a future date if provided
    """
    return await service.create(data)


@router.get(
    "/summary",
    response_model=TicketSummary,
    summary="Get ticket analytics summary",
)
async def get_summary(service: ServiceDep) -> TicketSummary:
    """
    Return aggregate ticket counts by domain, status, and priority.
    Computed via a single MongoDB $facet aggregation pipeline.

    > **Note**: This route is declared before `/{id}` to avoid path conflicts.
    """
    return await service.get_summary()


@router.get(
    "/",
    response_model=TicketListResponse,
    summary="List all tickets",
)
async def list_tickets(
    service: ServiceDep,
    domain: str | None = Query(None, description="Filter by domain"),
    priority: str | None = Query(None, description="Filter by priority"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    search: str | None = Query(None, description="Search ticket titles"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort direction"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
) -> TicketListResponse:
    """
    Retrieve a paginated, filterable, sortable list of tickets.

    **Filters**: domain, priority, status, search (title substring)
    **Sort**: any ticket field, asc or desc
    **Pagination**: page + limit (max 100 per page)
    """
    return await service.list_all(
        domain=domain,
        priority=priority,
        status_filter=status_filter,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit,
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketPublic,
    summary="Get a ticket by ID",
)
async def get_ticket(ticket_id: str, service: ServiceDep) -> TicketPublic:
    """
    Retrieve a single ticket by its UUID.

    Returns 404 if the ticket does not exist.
    """
    return await service.get_by_id(ticket_id)


@router.patch(
    "/{ticket_id}",
    response_model=TicketPublic,
    summary="Update a ticket (partial)",
)
async def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    service: ServiceDep,
) -> TicketPublic:
    """
    Partially update a ticket (PATCH semantics — only supplied fields are changed).

    Changes to **status** and **priority** are automatically recorded in the
    ticket's `events[]` audit log.
    """
    return await service.update(ticket_id, data)


@router.delete(
    "/{ticket_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a ticket",
)
async def delete_ticket(ticket_id: str, service: ServiceDep) -> None:
    """
    Permanently delete a ticket by ID.

    Returns 204 No Content on success, 404 if not found.
    """
    await service.delete(ticket_id)
