/**
 * Centralized API client for the Ticket Management System backend.
 * All requests go through these typed functions.
 */

import type {
  IssueFilters,
  Ticket,
  TicketCreate,
  TicketListResponse,
  TicketSummary,
  TicketUpdate,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Generic fetch helper ───────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message: string =
      errorBody?.detail ?? `Request failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Ticket API ─────────────────────────────────────────────────────────────

export const ticketApi = {
  /**
   * Fetch paginated and filtered ticket list.
   */
  list: (filters: Partial<IssueFilters> = {}): Promise<TicketListResponse> => {
    const params = new URLSearchParams();
    if (filters.domain)     params.set("domain", filters.domain);
    if (filters.priority)   params.set("priority", filters.priority);
    if (filters.status)     params.set("status", filters.status);
    if (filters.search)     params.set("search", filters.search);
    if (filters.sort_by)    params.set("sort_by", filters.sort_by);
    if (filters.sort_order) params.set("sort_order", filters.sort_order);
    if (filters.page)       params.set("page", String(filters.page));
    if (filters.limit)      params.set("limit", String(filters.limit));

    const qs = params.toString();
    return apiFetch<TicketListResponse>(`/tickets/${qs ? `?${qs}` : ""}`);
  },

  /**
   * Fetch a single ticket by ID.
   */
  getById: (id: string): Promise<Ticket> =>
    apiFetch<Ticket>(`/tickets/${id}`),

  /**
   * Create a new ticket.
   */
  create: (data: TicketCreate): Promise<Ticket> =>
    apiFetch<Ticket>("/tickets/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /**
   * Partially update a ticket (PATCH).
   */
  update: (id: string, data: TicketUpdate): Promise<Ticket> =>
    apiFetch<Ticket>(`/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /**
   * Delete a ticket.
   */
  delete: (id: string): Promise<void> =>
    apiFetch<void>(`/tickets/${id}`, { method: "DELETE" }),

  /**
   * Fetch ticket analytics summary.
   */
  summary: (): Promise<TicketSummary> =>
    apiFetch<TicketSummary>("/tickets/summary"),
};
