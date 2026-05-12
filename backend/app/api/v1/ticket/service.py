"""
Ticket service — orchestrates business logic between controller and repository.

Handles:
- Date defaulting (start_date → now if omitted)
- Audit event generation on status/priority changes
- Mapping between public DTOs and internal documents
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.ticket.model import TicketDocument, TicketEvent
from app.api.v1.ticket.repository import TicketRepository
from app.api.v1.ticket.schema import (
    TicketCreate,
    TicketListResponse,
    TicketPublic,
    TicketSummary,
    TicketUpdate,
)

# Fields that generate an audit event when changed
_TRACKED_FIELDS = {"status", "priority"}


def _to_public(doc: TicketDocument) -> TicketPublic:
    """Convert internal TicketDocument → public DTO."""
    return TicketPublic(
        id=doc.id,
        ticket_key=doc.ticket_key,
        title=doc.title,
        description=doc.description,
        domain=doc.domain,
        priority=doc.priority,
        status=doc.status,
        start_date=doc.start_date,
        deadline=doc.deadline,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        events=doc.events,
    )


class TicketService:
    """
    Stateless service layer for ticket operations.

    Accepts a Motor database handle so it remains decoupled from
    the connection management and easy to unit-test.
    """

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._repo = TicketRepository(db)

    # ── Create ─────────────────────────────────────────────────────────────────

    async def create(self, data: TicketCreate) -> TicketPublic:
        """
        Create a new ticket from validated client input.

        Args:
            data: TicketCreate DTO from the request body.
        Returns:
            TicketPublic confirmation DTO.
        """
        now = datetime.now(timezone.utc)
        doc = TicketDocument(
            title=data.title,
            description=data.description,
            domain=data.domain,
            priority=data.priority,
            start_date=data.start_date or now,
            deadline=data.deadline,
            created_at=now,
            updated_at=now,
        )
        created = await self._repo.create(doc)
        return _to_public(created)

    # ── Read ───────────────────────────────────────────────────────────────────

    async def get_by_id(self, ticket_id: str) -> TicketPublic:
        """
        Fetch a single ticket by ID.

        Raises 404 if not found.
        """
        doc = await self._repo.get_by_id(ticket_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket '{ticket_id}' not found.",
            )
        return _to_public(doc)

    async def list_all(
        self,
        *,
        domain: str | None = None,
        priority: str | None = None,
        status_filter: str | None = None,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        limit: int = 20,
    ) -> TicketListResponse:
        """
        Return paginated, filtered ticket list.

        Args:
            domain: Filter by domain name (case-sensitive enum value).
            priority: Filter by priority name.
            status_filter: Filter by status name.
            search: Substring search on title.
            sort_by: Column to sort.
            sort_order: 'asc' or 'desc'.
            page: 1-based page number.
            limit: Page size (max 100).
        Returns:
            TicketListResponse with metadata and ticket list.
        """
        from pymongo import ASCENDING, DESCENDING
        from app.api.v1.ticket.model import DomainEnum, PriorityEnum, StatusEnum

        # Validate enum filters without crashing hard
        domain_enum = DomainEnum(domain) if domain else None
        priority_enum = PriorityEnum(priority) if priority else None
        status_enum = StatusEnum(status_filter) if status_filter else None

        order = DESCENDING if sort_order.lower() == "desc" else ASCENDING

        docs, total = await self._repo.list_all(
            domain=domain_enum,
            priority=priority_enum,
            status=status_enum,
            search=search,
            sort_by=sort_by,
            sort_order=order,
            page=page,
            limit=limit,
        )

        return TicketListResponse(
            total=total,
            page=page,
            limit=limit,
            tickets=[_to_public(d) for d in docs],
        )

    # ── Update ─────────────────────────────────────────────────────────────────

    async def update(self, ticket_id: str, data: TicketUpdate) -> TicketPublic:
        """
        Partially update a ticket and append audit events for tracked fields.

        Args:
            ticket_id: UUID string of the ticket to update.
            data: TicketUpdate DTO (all fields optional).
        Returns:
            Updated TicketPublic.
        Raises:
            404 if ticket not found.
        """
        # Fetch current state to diff against
        existing = await self._repo.get_by_id(ticket_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket '{ticket_id}' not found.",
            )

        update_dict = data.model_dump(exclude_none=True)
        if not update_dict:
            return _to_public(existing)

        # ── Generate audit events for tracked field changes ────────────────────
        events_to_append: list[TicketEvent] = []
        now = datetime.now(timezone.utc)

        for field in _TRACKED_FIELDS:
            if field in update_dict:
                old_val = getattr(existing, field).value
                new_val = update_dict[field].value if hasattr(update_dict[field], "value") else str(update_dict[field])
                if old_val != new_val:
                    events_to_append.append(
                        TicketEvent(
                            field=field,
                            old_value=old_val,
                            new_value=new_val,
                            changed_at=now,
                        )
                    )

        # ── Serialize enum values for MongoDB storage ──────────────────────────
        serialised: dict = {}
        for k, v in update_dict.items():
            serialised[k] = v.value if hasattr(v, "value") else v

        updated = await self._repo.update(ticket_id, serialised)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket '{ticket_id}' not found during update.",
            )

        # Append audit events after main update
        for event in events_to_append:
            await self._repo.append_event(ticket_id, event.model_dump())

        # Reload to get the latest state with events
        final = await self._repo.get_by_id(ticket_id)
        return _to_public(final)  # type: ignore[arg-type]

    # ── Delete ─────────────────────────────────────────────────────────────────

    async def delete(self, ticket_id: str) -> None:
        """
        Delete a ticket.

        Raises:
            404 if not found.
        """
        deleted = await self._repo.delete(ticket_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket '{ticket_id}' not found.",
            )

    # ── Analytics ──────────────────────────────────────────────────────────────

    async def get_summary(self) -> TicketSummary:
        """
        Return ticket analytics from a single MongoDB aggregation pipeline.

        Returns:
            TicketSummary with counts by domain, status, priority.
        """
        return await self._repo.get_summary()
