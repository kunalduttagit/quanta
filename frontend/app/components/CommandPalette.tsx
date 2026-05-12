"use client";

/**
 * Command Palette — CMD+K for search, CMD+C for create-issue modal.
 *
 * Uses react-hotkeys-hook for keyboard bindings.
 * Search results are fetched live from the API as user types.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { Search, Plus, Ticket, ArrowRight, Loader2, X } from "lucide-react";
import { ticketApi } from "@/lib/api";
import type { Ticket as TicketType } from "@/lib/types";
import { Badge } from "./ui/Badge";

interface CommandPaletteProps {
  onCreateIssue: () => void;
}

export function CommandPalette({ onCreateIssue }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useHotkeys("meta+k", (e) => { e.preventDefault(); setOpen(true); }, { enableOnFormTags: true });
  useHotkeys("meta+c", (e) => {
    e.preventDefault();
    setOpen(false);
    onCreateIssue();
  }, { enableOnFormTags: true });
  useHotkeys("escape", () => setOpen(false), { enableOnFormTags: true });

  // ── Search ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); return; }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await ticketApi.list({ search: query, limit: 6 });
        setResults(data.tickets);
        setSelected(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Keyboard navigation within results ────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) {
      router.push(`/issues?id=${results[selected].id}`);
      setOpen(false);
    }
  }, [results, selected, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[560px] rounded-2xl bg-[#2C2C2E] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search className="w-4 h-4 text-white/35 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets…"
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none"
            id="command-palette-input"
          />
          {loading && <Loader2 className="w-4 h-4 text-white/30 animate-spin shrink-0" />}
          {!loading && query && (
            <button onClick={() => setQuery("")} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/8 text-[10px] text-white/35 font-medium">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="py-1.5 max-h-[320px] overflow-y-auto">
            {results.map((ticket, i) => (
              <li key={ticket.id}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 ${
                    i === selected ? "bg-white/8" : "hover:bg-white/5"
                  }`}
                  onClick={() => { router.push(`/issues?id=${ticket.id}`); setOpen(false); }}
                >
                  <Ticket className="w-4 h-4 text-white/35 shrink-0" />
                  <span className="flex-1 text-[13px] text-white/85 truncate">{ticket.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="priority" value={ticket.priority} />
                    <Badge variant="status" value={ticket.status} />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/20" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {query && !loading && results.length === 0 && (
          <div className="py-10 text-center text-[13px] text-white/30">
            No tickets matching &ldquo;{query}&rdquo;
          </div>
        )}

        {/* Footer hints */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/8 bg-white/2">
          <div className="flex items-center gap-4 text-[11px] text-white/25">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-white/8 text-[10px]">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1 py-0.5 rounded bg-white/8 text-[10px]">↵</kbd> open
            </span>
          </div>
          <button
            className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            onClick={() => { setOpen(false); onCreateIssue(); }}
          >
            <Plus className="w-3.5 h-3.5" />
            Create issue
            <kbd className="px-1 py-0.5 rounded bg-white/8 text-[10px] text-white/30">⌘C</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
