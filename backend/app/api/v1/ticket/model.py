"""
Ticket domain models (MongoDB document shapes).

These are the internal representations stored in MongoDB.
Never expose _id directly — use the `id` alias instead.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Enumerations ───────────────────────────────────────────────────────────────

class DomainEnum(str, Enum):
    """Business domains a ticket can belong to."""
    ENGINEERING = "Engineering"
    DEVOPS = "DevOps"
    HR = "HR"
    IT = "IT"
    FINANCE = "Finance"


class PriorityEnum(str, Enum):
    """Ticket urgency levels (ascending severity)."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class StatusEnum(str, Enum):
    """Allowed ticket lifecycle states."""
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"


# ── Audit Event ────────────────────────────────────────────────────────────────

class TicketEvent(BaseModel):
    """
    Immutable audit log entry appended whenever a tracked field changes.
    Powers the StatusStepper timeline on the frontend.
    """
    field: str = Field(..., description="Name of the field that changed, e.g. 'status'")
    old_value: str = Field(..., description="Previous value before the change")
    new_value: str = Field(..., description="New value after the change")
    changed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of the change",
    )


# ── Ticket Document ────────────────────────────────────────────────────────────

class TicketDocument(BaseModel):
    """
    Full MongoDB document representation for a ticket.

    `id` is stored as `_id` in MongoDB (UUID string).
    Use `model_dump(by_alias=True)` when writing to the database.
    """
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        alias="_id",
        description="Unique ticket identifier (UUID4)",
    )
    ticket_key: str | None = Field(None, description="Auto-incrementing ID like EAI-1")
    title: str = Field(..., min_length=1, max_length=200, description="Short ticket title")
    description: str | None = Field(None, description="Optional detailed description")
    domain: DomainEnum = Field(..., description="Business domain")
    priority: PriorityEnum = Field(..., description="Urgency level")
    status: StatusEnum = Field(StatusEnum.OPEN, description="Current lifecycle state")
    start_date: datetime = Field(..., description="When work begins (or was created)")
    deadline: datetime | None = Field(None, description="Target completion date")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    events: list[TicketEvent] = Field(
        default_factory=list,
        description="Ordered audit log of tracked field changes",
    )

    model_config = {
        "populate_by_name": True,  # Allow both `id` and `_id`
        "json_encoders": {datetime: lambda v: v.isoformat()},
    }

    def to_db(self) -> dict[str, Any]:
        """Serialise for MongoDB — uses `_id` alias."""
        return self.model_dump(by_alias=True)

    @classmethod
    def from_db(cls, doc: dict[str, Any]) -> "TicketDocument":
        """Deserialise from a raw MongoDB document."""
        return cls.model_validate(doc)
