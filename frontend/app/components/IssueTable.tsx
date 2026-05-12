"use client";

/**
 * IssueTable — sortable, filterable, paginated ticket list.
 *
 * Columns: Title, Domain, Priority, Status, Start Date, Deadline
 * Each column header is clickable for sort.
 * Filter chips for domain, priority, status at the top.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Filter, Search, X, Loader2, AlertCircle,
  Trash2, Plus, RefreshCw,
} from "lucide-react";
import { ticketApi } from "@/lib/api";
import type { Domain, IssueFilters, Priority, Ticket, TicketStatus } from "@/lib/types";
import { Badge } from "./ui/Badge";
import { ConfirmModal } from "./ui/ConfirmModal";

const DOMAINS: Domain[] = ["Engineering", "DevOps", "HR", "IT", "Finance"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];
const STATUSES: TicketStatus[] = ["Open", "In Progress", "Closed"];

const DEFAULT_FILTERS: IssueFilters = {
  sort_by: "created_at",
  sort_order: "desc",
  page: 1,
  limit: 20,
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface SortIconProps { field: string; filters: IssueFilters; }
function SortIcon({ field, filters }: SortIconProps) {
  if (filters.sort_by !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-white/20" />;
  return filters.sort_order === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-400" />;
}

interface IssueTableProps {
  onSelect: (ticket: Ticket | null) => void;
  selectedId: string | null;
  onCreateClick: () => void;
  refreshKey: number;
}

export function IssueTable({ onSelect, selectedId, onCreateClick, refreshKey }: IssueTableProps) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<IssueFilters>(() => ({
    ...DEFAULT_FILTERS,
    priority: (searchParams.get("priority") as Priority) || undefined,
  }));
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchTickets = useCallback(async (f: IssueFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await ticketApi.list(f);
      setTickets(res.tickets);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { fetchTickets(filters); }, [filters, fetchTickets, refreshKey]);

  const toggleSort = (field: string) => {
    setFilters(f => ({
      ...f,
      sort_by: field,
      sort_order: f.sort_by === field && f.sort_order === "desc" ? "asc" : "desc",
      page: 1,
    }));
  };

  const setFilter = (key: keyof IssueFilters, value: unknown) => {
    setFilters(f => ({ ...f, [key]: value ?? undefined, page: 1 }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await ticketApi.delete(id);
      if (selectedId === id) onSelect(null);
      fetchTickets(filters);
      setDeleteConfirmId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const hasActiveFilters = !!(filters.domain || filters.priority || filters.status || filters.search);

  const COLUMNS = [
    { key: "ticket_key", label: "ID" },
    { key: "title",      label: "Title" },
    { key: "domain",     label: "Domain" },
    { key: "priority",   label: "Priority" },
    { key: "status",     label: "Status" },
    { key: "start_date", label: "Start" },
    { key: "deadline",   label: "Deadline" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 shrink-0 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search issues…"
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/8 rounded-[8px] text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/40 transition-all"
            id="issue-search"
          />
        </div>

        {/* Domain filter */}
        <select
          value={filters.domain ?? ""}
          onChange={e => setFilter("domain", e.target.value || undefined)}
          className="px-2.5 py-1.5 bg-white/5 border border-white/8 rounded-[8px] text-[12px] text-white/70 focus:outline-none appearance-none cursor-pointer"
          id="filter-domain"
        >
          <option value="">All Domains</option>
          {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Priority filter */}
        <select
          value={filters.priority ?? ""}
          onChange={e => setFilter("priority", e.target.value || undefined)}
          className="px-2.5 py-1.5 bg-white/5 border border-white/8 rounded-[8px] text-[12px] text-white/70 focus:outline-none appearance-none cursor-pointer"
          id="filter-priority"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={filters.status ?? ""}
          onChange={e => setFilter("status", e.target.value || undefined)}
          className="px-2.5 py-1.5 bg-white/5 border border-white/8 rounded-[8px] text-[12px] text-white/70 focus:outline-none appearance-none cursor-pointer"
          id="filter-status"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] text-red-400 hover:bg-red-400/10 transition-all"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}

        {/* Refresh */}
        <button
          onClick={() => fetchTickets(filters)}
          className="p-1.5 rounded-[8px] text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>

        {/* Create */}
        <button
          onClick={onCreateClick}
          id="create-issue-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-[8px] text-[12px] font-semibold text-white transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New Issue
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="flex items-center gap-2 m-4 px-3 py-2.5 rounded-[10px] bg-red-500/10 border border-red-500/20 text-[13px] text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {loading && tickets.length === 0 && (
          <div className="flex items-center justify-center py-20 text-white/30">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <Filter className="w-5 h-5 text-white/25" />
            </div>
            <p className="text-[14px] text-white/50 mb-1">No issues found</p>
            <p className="text-[12px] text-white/25">
              {hasActiveFilters ? "Try clearing your filters" : "Create your first issue to get started"}
            </p>
          </div>
        )}

        {tickets.length > 0 && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/8">
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-[11px] font-medium text-white/35 uppercase tracking-wider whitespace-nowrap"
                  >
                    <button
                      className="flex items-center gap-1 hover:text-white/70 transition-colors"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon field={col.key} filters={filters} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr
                  key={ticket.id}
                  onClick={() => onSelect(selectedId === ticket.id ? null : ticket)}
                  className={`
                    border-b border-white/5 cursor-pointer transition-colors duration-100
                    ${selectedId === ticket.id ? "bg-blue-500/8" : "hover:bg-white/3"}
                  `}
                >
                  <td className="px-4 py-3 min-w-[100px]">
                    <p className="text-[12px] text-white/45 font-mono">{ticket.ticket_key || ""}</p>
                  </td>
                  <td className="px-4 py-3 min-w-[200px] max-w-[300px]">
                    <p className="text-[13px] font-medium text-white/90 truncate">{ticket.title}</p>
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <Badge variant="domain" value={ticket.domain} />
                  </td>
                  <td className="px-4 py-3 min-w-[110px]">
                    <Badge variant="priority" value={ticket.priority} showDot />
                  </td>
                  <td className="px-4 py-3 min-w-[130px]">
                    <Badge variant="status" value={ticket.status} />
                  </td>
                  <td className="px-4 py-3 text-[12px] text-white/45 whitespace-nowrap min-w-[110px]">
                    {formatDate(ticket.start_date)}
                  </td>
                  <td className="px-4 py-3 text-[12px] whitespace-nowrap">
                    {ticket.deadline ? (
                      <span className={new Date(ticket.deadline) < new Date() && ticket.status !== "Closed"
                        ? "text-red-400" : "text-white/45"}>
                        {formatDate(ticket.deadline)}
                      </span>
                    ) : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirmId(ticket.id); }}
                      disabled={deleting === ticket.id}
                      className="p-1 rounded-[6px] text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete ticket"
                    >
                      {deleting === ticket.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {total > filters.limit && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 shrink-0">
          <p className="text-[12px] text-white/30">
            {((filters.page - 1) * filters.limit) + 1}–{Math.min(filters.page * filters.limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="px-2.5 py-1 rounded-[8px] text-[12px] text-white/50 hover:text-white/80 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-[12px] text-white/50">
              {filters.page} / {totalPages}
            </span>
            <button
              disabled={filters.page >= totalPages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="px-2.5 py-1 rounded-[8px] text-[12px] text-white/50 hover:text-white/80 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirmId !== null}
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? This action cannot be undone."
        confirmText="Delete"
        loading={deleting !== null}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
