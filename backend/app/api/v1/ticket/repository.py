"""
Ticket repository — all raw MongoDB operations live here.

All methods are async and work directly with the Motor collection.
Business logic belongs in the service layer, not here.
"""

from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from app.api.v1.ticket.model import DomainEnum, PriorityEnum, StatusEnum, TicketDocument
from app.api.v1.ticket.schema import TicketSummary, DomainCount, StatusCount, PriorityCount

# MongoDB collection name
COLLECTION = "tickets"


class TicketRepository:
    """
    Data-access layer for the tickets collection.

    Accepts an AsyncIOMotorDatabase handle injected per request so
    the class stays stateless and lambda-compatible.
    """

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db[COLLECTION]

    # ── Create ─────────────────────────────────────────────────────────────────

    async def create(self, doc: TicketDocument) -> TicketDocument:
        """
        Insert a new ticket document.

        Args:
            doc: Fully formed TicketDocument (id already set by service layer).
        Returns:
            The inserted TicketDocument.
        """
        counter = await self._col.database["counters"].find_one_and_update(
            {"_id": "ticket_seq"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True
        )
        doc.ticket_key = f"EAI-{counter['seq']}"
        await self._col.insert_one(doc.to_db())
        return doc

    # ── Read ───────────────────────────────────────────────────────────────────

    async def get_by_id(self, ticket_id: str) -> TicketDocument | None:
        """
        Fetch a single ticket by its UUID string.

        Args:
            ticket_id: UUID4 string matching `_id` in MongoDB.
        Returns:
            TicketDocument or None if not found.
        """
        raw = await self._col.find_one({"_id": ticket_id})
        return TicketDocument.from_db(raw) if raw else None

    async def list_all(
        self,
        *,
        domain: DomainEnum | None = None,
        priority: PriorityEnum | None = None,
        status: StatusEnum | None = None,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: int = DESCENDING,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[TicketDocument], int]:
        """
        Return paginated, filtered, and sorted tickets.

        Args:
            domain: Optional domain filter.
            priority: Optional priority filter.
            status: Optional status filter.
            search: Optional case-insensitive title substring search.
            sort_by: Field name to sort on.
            sort_order: 1 = ASC, -1 = DESC.
            page: 1-indexed page number.
            limit: Documents per page (max 100).
        Returns:
            Tuple of (list of TicketDocument, total count).
        """
        limit = min(limit, 100)
        skip = (page - 1) * limit

        # ── Build filter ───────────────────────────────────────────────────────
        query: dict[str, Any] = {}
        if domain:
            query["domain"] = domain.value
        if priority:
            query["priority"] = priority.value
        if status:
            query["status"] = status.value
        if search:
            query["title"] = {"$regex": search, "$options": "i"}

        # ── Allowed sort fields (whitelist to prevent injection) ────────────────
        allowed_sort = {"created_at", "updated_at", "title", "priority", "status", "domain", "deadline"}
        if sort_by not in allowed_sort:
            sort_by = "created_at"

        total = await self._col.count_documents(query)

        # ── Logical sorting for Priority and Status ────────────────────────────
        # These fields require mapping strings to numeric ranks for intuitive sorting
        if sort_by in {"priority", "status"}:
            rank_map = {
                "priority": [PriorityEnum.LOW.value, PriorityEnum.MEDIUM.value, PriorityEnum.HIGH.value, PriorityEnum.CRITICAL.value],
                "status": [StatusEnum.OPEN.value, StatusEnum.IN_PROGRESS.value, StatusEnum.CLOSED.value]
            }
            order_array = rank_map[sort_by]

            pipeline = [
                {"$match": query},
                {"$addFields": {
                    "sort_rank": {"$indexOfArray": [order_array, f"${sort_by}"]}
                }},
                {"$sort": {"sort_rank": sort_order, "created_at": DESCENDING}},
                {"$skip": skip},
                {"$limit": limit}
            ]
            cursor = self._col.aggregate(pipeline)
            docs = [TicketDocument.from_db(d) async for d in cursor]
            return docs, total

        # ── Standard sorting for other fields ──────────────────────────────────
        cursor = (
            self._col.find(query)
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        docs = [TicketDocument.from_db(d) async for d in cursor]
        return docs, total

    # ── Update ─────────────────────────────────────────────────────────────────

    async def update(self, ticket_id: str, update_data: dict[str, Any]) -> TicketDocument | None:
        """
        Apply a partial update to a ticket document.

        Args:
            ticket_id: UUID string of the ticket.
            update_data: Dict of fields to set (already validated by service).
        Returns:
            Updated TicketDocument or None if ticket not found.
        """
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await self._col.find_one_and_update(
            {"_id": ticket_id},
            {"$set": update_data},
            return_document=True,  # motor returns the updated doc
        )
        return TicketDocument.from_db(result) if result else None

    async def append_event(self, ticket_id: str, event_doc: dict[str, Any]) -> None:
        """
        Push a new audit event into the events array and bump updated_at.

        Args:
            ticket_id: UUID string.
            event_doc: Serialised TicketEvent dict.
        """
        await self._col.update_one(
            {"_id": ticket_id},
            {
                "$push": {"events": event_doc},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    # ── Delete ─────────────────────────────────────────────────────────────────

    async def delete(self, ticket_id: str) -> bool:
        """
        Hard-delete a ticket document.

        Args:
            ticket_id: UUID string.
        Returns:
            True if deleted, False if not found.
        """
        result = await self._col.delete_one({"_id": ticket_id})
        return result.deleted_count == 1

    # ── Analytics ──────────────────────────────────────────────────────────────

    async def get_summary(self) -> TicketSummary:
        """
        Compute ticket analytics via a single $facet aggregation pipeline.

        Returns:
            TicketSummary with totals, domain/status/priority breakdowns,
            and a high-priority count — all in one round-trip.
        """
        pipeline = [
            {
                "$facet": {
                    "total": [{"$count": "count"}],
                    "by_domain": [
                        {"$group": {"_id": "$domain", "count": {"$sum": 1}}},
                        {"$sort": {"_id": ASCENDING}},
                    ],
                    "by_status": [
                        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                    ],
                    "by_priority": [
                        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
                    ],
                    "high_priority": [
                        {
                            "$match": {
                                "priority": PriorityEnum.CRITICAL.value
                            }
                        },
                        {"$count": "count"},
                    ],
                }
            }
        ]

        cursor = self._col.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        facet = results[0] if results else {}

        total = facet.get("total", [{}])[0].get("count", 0) if facet.get("total") else 0
        high_priority_count = facet.get("high_priority", [{}])[0].get("count", 0) if facet.get("high_priority") else 0

        by_domain = [
            DomainCount(domain=d["_id"], count=d["count"])
            for d in facet.get("by_domain", [])
        ]
        by_status = [
            StatusCount(status=s["_id"], count=s["count"])
            for s in facet.get("by_status", [])
        ]
        by_priority = [
            PriorityCount(priority=p["_id"], count=p["count"])
            for p in facet.get("by_priority", [])
        ]

        return TicketSummary(
            total=total,
            by_domain=by_domain,
            by_status=by_status,
            by_priority=by_priority,
            high_priority_count=high_priority_count,
        )
