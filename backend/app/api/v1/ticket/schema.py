"""
Ticket DTOs (Data Transfer Objects).

Strictly separates client-facing shapes from internal MongoDB documents.
All external API inputs and outputs go through these schemas.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.api.v1.ticket.model import DomainEnum, PriorityEnum, StatusEnum, TicketEvent


# ── Input Schemas ──────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    """
    Payload required to create a new ticket.

    start_date defaults to now if not provided.
    """
    title: str = Field(..., min_length=1, max_length=200, examples=["Login page crashes on Safari"])
    description: str | None = Field(None, max_length=5000, examples=["Steps to reproduce: ..."])
    domain: DomainEnum = Field(..., examples=[DomainEnum.ENGINEERING])
    priority: PriorityEnum = Field(..., examples=[PriorityEnum.HIGH])
    start_date: datetime | None = Field(
        None,
        description="Defaults to current UTC time if not supplied",
    )
    deadline: datetime | None = Field(None, description="Optional target completion date")


class TicketUpdate(BaseModel):
    """
    Partial update payload — all fields optional (PATCH semantics).
    Only status and priority changes are tracked in events[].
    """
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=5000)
    domain: DomainEnum | None = None
    priority: PriorityEnum | None = None
    status: StatusEnum | None = None
    start_date: datetime | None = None
    deadline: datetime | None = None


# ── Output Schemas ─────────────────────────────────────────────────────────────

class TicketPublic(BaseModel):
    """
    Public-facing ticket representation returned by all read endpoints.
    Translates `_id` → `id` so clients never see MongoDB internals.
    """
    id: str
    ticket_key: str | None = None
    title: str
    description: str | None
    domain: DomainEnum
    priority: PriorityEnum
    status: StatusEnum
    start_date: datetime
    deadline: datetime | None
    created_at: datetime
    updated_at: datetime
    events: list[TicketEvent]

    model_config = {"populate_by_name": True}


class TicketListResponse(BaseModel):
    """Paginated ticket list wrapper."""
    total: int = Field(..., description="Total matching documents")
    page: int
    limit: int
    tickets: list[TicketPublic]


# ── Analytics Schema ───────────────────────────────────────────────────────────

class DomainCount(BaseModel):
    domain: str
    count: int


class StatusCount(BaseModel):
    status: str
    count: int


class PriorityCount(BaseModel):
    priority: str
    count: int


class TicketSummary(BaseModel):
    """
    Response shape for GET /tickets/summary.
    Built from a single MongoDB $facet aggregation pipeline.
    """
    total: int = Field(..., description="Total number of tickets")
    by_domain: list[DomainCount] = Field(..., description="Ticket count per domain")
    by_status: list[StatusCount] = Field(..., description="Ticket count per status")
    by_priority: list[PriorityCount] = Field(..., description="Ticket count per priority")
    high_priority_count: int = Field(
        ...,
        description="Number of High + Critical tickets",
    )
