"use client";

/**
 * IssueDetail — right-pane ticket detail with Notion-style property editing.
 *
 * Properties (status, priority, domain, dates) are laid out as labelled rows.
 * Clicking a property value opens an inline dropdown — makes editing obvious.
 */

import React, { useState } from "react";
import {
  X, Calendar, AlertCircle, Trash2, Loader2,
  ChevronDown, Activity, AlignLeft, Pencil, CheckCircle2,
} from "lucide-react";
import { ticketApi } from "@/lib/api";
import type { Domain, Priority, Ticket, TicketStatus } from "@/lib/types";
import { Badge } from "./ui/Badge";
import { StatusStepper } from "./StatusStepper";
import { ConfirmModal } from "./ui/ConfirmModal";

const STATUSES: TicketStatus[] = ["Open", "In Progress", "Closed"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];
const DOMAINS: Domain[] = ["Engineering", "DevOps", "HR", "IT", "Finance"];

function formatDate(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

interface IssueDetailProps {
  ticket: Ticket;
  onClose: () => void;
  onUpdated: (updated: Ticket) => void;
  onDeleted: () => void;
}

// ── Reusable inline property row ──────────────────────────────────────────
interface PropertyRowProps {
  label: string;
  saving: boolean;
  children: React.ReactNode;
}
function PropertyRow({ label, saving, children }: PropertyRowProps) {
  return (
    <div className="flex items-center min-h-[32px] group">
      <span className="w-[90px] shrink-0 text-[12px] text-white/35 font-medium">{label}</span>
      <div className="flex-1 relative">
        {children}
        {saving && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 animate-spin pointer-events-none" />
        )}
      </div>
    </div>
  );
}

// ── Inline select that looks like a badge picker ──────────────────────────
interface InlineSelectProps {
  id: string;
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (v: string) => void;
  renderBadge: (v: string) => React.ReactNode;
}
function InlineSelect({ id, value, options, disabled, onChange, renderBadge }: InlineSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        id={id}
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/6 active:bg-white/10 transition-all cursor-pointer disabled:opacity-50 group/btn"
      >
        {renderBadge(value)}
        <ChevronDown className="w-3 h-3 text-white/25 group-hover/btn:text-white/50 transition-colors" />
      </button>

      {open && (
        <>
          {/* Click-away */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 z-30 min-w-[140px] bg-[#3A3A3C] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-up">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`
                  w-full flex items-center justify-between gap-3 px-3 py-2 text-left
                  hover:bg-white/8 transition-colors text-[13px]
                  ${opt === value ? "bg-white/5" : ""}
                `}
              >
                {renderBadge(opt)}
                {opt === value && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function IssueDetail({ ticket, onClose, onUpdated, onDeleted }: IssueDetailProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(ticket.title);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [editingStartDate, setEditingStartDate] = useState(false);

  const handleUpdate = async (field: string, value: string) => {
    setSaving(field);
    setError(null);
    try {
      const updated = await ticketApi.update(ticket.id, { [field]: value });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(null);
    }
  };

  const handleTitleSave = async () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== ticket.title) {
      await handleUpdate("title", titleDraft.trim());
    }
  };

  const handleDateUpdate = async (field: string, value: string) => {
    if (!value) return;
    const iso = new Date(value).toISOString();
    await handleUpdate(field, iso);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await ticketApi.delete(ticket.id);
      onDeleted();
      setDeleteConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setDeleting(false);
    }
  };

  const isOverdue =
    ticket.deadline &&
    new Date(ticket.deadline) < new Date() &&
    ticket.status !== "Closed";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#1C1C1E]">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 shrink-0">
        <p className="text-[11px] text-white/30 font-mono tracking-wide">
          {ticket.ticket_key ? `#${ticket.ticket_key}` : ""}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={deleting}
            className="p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Delete ticket"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/8 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Title — click to edit ─────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4">
          {editingTitle ? (
            <textarea
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTitleSave(); } }}
              rows={2}
              maxLength={200}
              className="w-full bg-transparent text-[18px] font-semibold text-white leading-snug resize-none outline-none border-b border-blue-500/50 pb-1"
            />
          ) : (
            <div
              className="group flex items-start gap-2 cursor-text"
              onClick={() => { setTitleDraft(ticket.title); setEditingTitle(true); }}
            >
              <h2 className="flex-1 text-[18px] font-semibold text-white leading-snug">
                {ticket.title}
              </h2>
              <Pencil className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors mt-1 shrink-0" />
            </div>
          )}
          {saving === "title" && (
            <p className="text-[11px] text-blue-400 mt-1">Saving…</p>
          )}
        </div>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[12px] text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        {/* ── Properties section ───────────────────────────────────────────── */}
        <div className="px-5 pb-5 space-y-1">
          <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-3">
            Properties
          </p>

          {/* Status */}
          <PropertyRow label="Status" saving={saving === "status"}>
            <InlineSelect
              id="detail-status"
              value={ticket.status}
              options={STATUSES}
              disabled={saving === "status"}
              onChange={v => handleUpdate("status", v)}
              renderBadge={v => <Badge variant="status" value={v} />}
            />
          </PropertyRow>

          {/* Priority */}
          <PropertyRow label="Priority" saving={saving === "priority"}>
            <InlineSelect
              id="detail-priority"
              value={ticket.priority}
              options={PRIORITIES}
              disabled={saving === "priority"}
              onChange={v => handleUpdate("priority", v)}
              renderBadge={v => <Badge variant="priority" value={v} showDot />}
            />
          </PropertyRow>

          {/* Domain */}
          <PropertyRow label="Domain" saving={saving === "domain"}>
            <InlineSelect
              id="detail-domain"
              value={ticket.domain}
              options={DOMAINS}
              disabled={saving === "domain"}
              onChange={v => handleUpdate("domain", v)}
              renderBadge={v => <Badge variant="domain" value={v} />}
            />
          </PropertyRow>

          {/* Start date — click to edit inline */}
          <PropertyRow label="Start date" saving={saving === "start_date"}>
            {editingStartDate ? (
              <input
                type="datetime-local"
                autoFocus
                defaultValue={toDateTimeLocal(ticket.start_date)}
                onBlur={e => {
                  setEditingStartDate(false);
                  handleDateUpdate("start_date", e.target.value);
                }}
                className="bg-[#3A3A3C] border border-white/10 rounded-lg px-2 py-1 text-[12px] text-white/80 outline-none focus:border-blue-500/50"
              />
            ) : (
              <button
                onClick={() => setEditingStartDate(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[13px] text-white/70 hover:bg-white/6 hover:text-white/90 transition-all group/d"
              >
                <Calendar className="w-3.5 h-3.5 text-white/30 group-hover/d:text-white/60" />
                {formatDate(ticket.start_date)}
                <Pencil className="w-3 h-3 text-white/20 group-hover/d:text-white/50" />
              </button>
            )}
          </PropertyRow>

          {/* Deadline — click to edit inline */}
          <PropertyRow label="Deadline" saving={saving === "deadline"}>
            {editingDeadline ? (
              <input
                type="datetime-local"
                autoFocus
                defaultValue={toDateTimeLocal(ticket.deadline)}
                onBlur={e => {
                  setEditingDeadline(false);
                  handleDateUpdate("deadline", e.target.value);
                }}
                className="bg-[#3A3A3C] border border-white/10 rounded-lg px-2 py-1 text-[12px] text-white/80 outline-none focus:border-blue-500/50"
              />
            ) : (
              <button
                onClick={() => setEditingDeadline(true)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[13px] hover:bg-white/6 transition-all group/d ${
                  isOverdue ? "text-red-400" : "text-white/70 hover:text-white/90"
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isOverdue ? "text-red-400" : "text-white/30 group-hover/d:text-white/60"}`} />
                {formatDate(ticket.deadline)}
                {isOverdue && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-red-400/15 rounded-full font-medium">
                    Overdue
                  </span>
                )}
                <Pencil className="w-3 h-3 text-white/20 group-hover/d:text-white/50" />
              </button>
            )}
          </PropertyRow>

          {/* Created at (read-only) */}
          <PropertyRow label="Created" saving={false}>
            <span className="px-2 text-[12px] text-white/35">{formatDate(ticket.created_at)}</span>
          </PropertyRow>
        </div>

        {/* ── Description ─────────────────────────────────────────────────── */}
        {ticket.description && (
          <div className="px-5 pb-5">
            <div className="border-t border-white/6 pt-4">
              <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <AlignLeft className="w-3 h-3" /> Description
              </p>
              <p className="text-[13px] text-white/65 leading-relaxed whitespace-pre-wrap bg-white/3 px-4 py-3 rounded-xl">
                {ticket.description}
              </p>
            </div>
          </div>
        )}

        {/* ── Activity / StatusStepper ─────────────────────────────────────── */}
        <div className="px-5 pb-8">
          <div className="border-t border-white/6 pt-4">
            <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> Activity
            </p>
            <StatusStepper
              events={ticket.events}
              currentStatus={ticket.status}
              createdAt={ticket.created_at}
            />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? This action cannot be undone."
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
