"use client";

/**
 * CreateIssueModal — modal form for creating a new ticket.
 * Triggered by CMD+C or the "+ New Issue" button.
 *
 * All datetime-local inputs support both date AND time editing.
 */

import React, { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Calendar } from "lucide-react";
import { ticketApi } from "@/lib/api";
import type { Domain, Priority, TicketCreate } from "@/lib/types";
import { PriorityIcon } from "./ui/PriorityIcon";

const DOMAINS: Domain[] = ["Engineering", "DevOps", "HR", "IT", "Finance"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];

interface FormState {
  title: string;
  description: string;
  domain: Domain | "";
  priority: Priority | "";
  start_date: string;  // datetime-local value e.g. "2026-05-13T09:30"
  deadline: string;
}

function nowLocal(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString().slice(0, 16);
}

interface CreateIssueModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateIssueModal({ open, onClose, onCreated }: CreateIssueModalProps) {
  const [form, setForm] = useState<FormState>({
    title: "", description: "", domain: "", priority: "",
    start_date: nowLocal(), deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ title: "", description: "", domain: "", priority: "", start_date: nowLocal(), deadline: "" });
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const submitTask = async (isCreateMore: boolean) => {
    if (!form.domain || !form.priority) {
      setError("Please select a domain and priority.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: TicketCreate = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        domain: form.domain as Domain,
        priority: form.priority as Priority,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      };
      await ticketApi.create(payload);
      onCreated();
      if (isCreateMore) {
        setForm({ title: "", description: "", domain: "", priority: "", start_date: nowLocal(), deadline: "" });
      } else {
        onClose();
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndClose = (e: React.FormEvent) => {
    e.preventDefault();
    submitTask(false);
  };

  const handleCreateMore = (e: React.MouseEvent) => {
    e.preventDefault();
    submitTask(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />

      {/* Modal card */}
      <div className="relative w-full max-w-[520px] rounded-2xl bg-[#2C2C2E] border border-white/10 shadow-2xl animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
          <h2 className="text-[15px] font-semibold text-white">New Issue</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/35 hover:text-white/75 hover:bg-white/8 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateAndClose} className="p-5 space-y-4">

          {/* Title */}
          <div>
            <input
              required
              autoFocus
              maxLength={200}
              placeholder="Issue title…"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="
                w-full px-0 py-1 bg-transparent border-b border-white/10
                text-[16px] font-medium text-white placeholder:text-white/25
                focus:outline-none focus:border-blue-500/50 transition-colors
              "
              id="ci-title"
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              rows={3}
              maxLength={5000}
              placeholder="Add a description (optional)…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="
                w-full px-0 py-1 bg-transparent border-b border-white/8
                text-[13px] text-white/75 placeholder:text-white/20
                focus:outline-none focus:border-white/20 transition-colors resize-none
              "
              id="ci-desc"
            />
          </div>

          {/* Domain + Priority chips */}
          <div className="grid grid-cols-2 gap-3">

            {/* Domain */}
            <div>
              <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2" htmlFor="ci-domain">
                Domain
              </label>
              <div className="relative">
                <select
                  id="ci-domain"
                  required
                  value={form.domain}
                  onChange={e => setForm(f => ({ ...f, domain: e.target.value as Domain }))}
                  className="
                    w-full px-3 py-2.5 pr-8 rounded-xl
                    bg-white/5 border border-white/10
                    text-[13px] text-white
                    focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20
                    cursor-pointer transition-all
                  "
                >
                  <option value="" disabled className="bg-[#2C2C2E]">Select…</option>
                  {DOMAINS.map(d => (
                    <option key={d} value={d} className="bg-[#2C2C2E]">{d}</option>
                  ))}
                </select>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 text-[10px]">▾</span>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2" htmlFor="ci-priority">
                Priority
              </label>
              <div className="relative">
                <button
                  type="button"
                  id="ci-priority"
                  onClick={() => {
                    const el = document.getElementById("ci-priority-menu");
                    if (el) el.classList.toggle("hidden");
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      const el = document.getElementById("ci-priority-menu");
                      if (el) el.classList.add("hidden");
                    }, 150);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl
                    bg-white/5 border border-white/10
                    text-[13px] ${form.priority ? "text-white" : "text-white/50"}
                    focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20
                    transition-all
                  `}
                >
                  {form.priority ? (
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority={form.priority as Priority} />
                      <span>{form.priority}</span>
                    </div>
                  ) : "Select…"}
                  <span className="text-white/30 text-[10px]">▾</span>
                </button>
                <div id="ci-priority-menu" className="hidden absolute left-0 right-0 top-full mt-1 z-50 bg-[#2C2C2E] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                  {PRIORITIES.map(p => (
                    <div
                      key={p}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm(f => ({ ...f, priority: p as Priority }));
                        document.getElementById("ci-priority-menu")?.classList.add("hidden");
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] text-white hover:bg-white/8 cursor-pointer transition-colors"
                    >
                      <PriorityIcon priority={p as Priority} />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dates — with time support */}
          <div className="grid grid-cols-2 gap-3">

            {/* Start date & time */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2" htmlFor="ci-start">
                <Calendar className="w-3 h-3" /> Start
              </label>
              <input
                id="ci-start"
                type="datetime-local"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="
                  w-full px-3 py-2.5 rounded-xl
                  bg-white/5 border border-white/10
                  text-[12px] text-white/75
                  focus:outline-none focus:border-blue-500/40
                  transition-all cursor-pointer
                "
              />
              <p className="text-[10px] text-white/25 mt-1 pl-1">Date and time</p>
            </div>

            {/* Deadline date & time */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2" htmlFor="ci-deadline">
                <Calendar className="w-3 h-3" /> Deadline
              </label>
              <input
                id="ci-deadline"
                type="datetime-local"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="
                  w-full px-3 py-2.5 rounded-xl
                  bg-white/5 border border-white/10
                  text-[12px] text-white/75
                  focus:outline-none focus:border-blue-500/40
                  transition-all cursor-pointer
                "
              />
              <p className="text-[10px] text-white/25 mt-1 pl-1">Date and time (optional)</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[12px] text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-white/45 hover:text-white/75 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateMore}
              disabled={loading || !form.title.trim()}
              className="
                flex items-center gap-2 px-5 py-2 rounded-xl
                border border-white/10 hover:bg-white/5 active:bg-white/10
                text-[13px] font-semibold text-white
                transition-all disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create more
            </button>
            <button
              id="ci-submit"
              type="submit"
              disabled={loading || !form.title.trim()}
              className="
                flex items-center gap-2 px-5 py-2 rounded-xl
                bg-blue-500 hover:bg-blue-400 active:bg-blue-600
                text-[13px] font-semibold text-white
                transition-all disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
