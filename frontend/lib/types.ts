/**
 * TypeScript types mirroring the backend Pydantic schemas.
 * Keep in sync with backend/app/api/v1/ticket/schema.py
 */

export type Domain = "Engineering" | "DevOps" | "HR" | "IT" | "Finance";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type TicketStatus = "Open" | "In Progress" | "Closed";

export interface TicketEvent {
  field: string;
  old_value: string;
  new_value: string;
  changed_at: string; // ISO datetime string
}

export interface Ticket {
  id: string;
  ticket_key: string | null;
  title: string;
  description: string | null;
  domain: Domain;
  priority: Priority;
  status: TicketStatus;
  start_date: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  events: TicketEvent[];
}

export interface TicketListResponse {
  total: number;
  page: number;
  limit: number;
  tickets: Ticket[];
}

export interface TicketCreate {
  title: string;
  description?: string;
  domain: Domain;
  priority: Priority;
  start_date?: string;
  deadline?: string;
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  domain?: Domain;
  priority?: Priority;
  status?: TicketStatus;
  start_date?: string;
  deadline?: string;
}

export interface DomainCount { domain: string; count: number; }
export interface StatusCount { status: string; count: number; }
export interface PriorityCount { priority: string; count: number; }

export interface TicketSummary {
  total: number;
  by_domain: DomainCount[];
  by_status: StatusCount[];
  by_priority: PriorityCount[];
  high_priority_count: number;
}

// ── Filter/sort state for the issue table ──────────────────────────────────
export interface IssueFilters {
  domain?: Domain;
  priority?: Priority;
  status?: TicketStatus;
  search?: string;
  sort_by: string;
  sort_order: "asc" | "desc";
  page: number;
  limit: number;
}
