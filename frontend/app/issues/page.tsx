"use client";

/**
 * Issues page — split-pane layout.
 * Left: IssueTable (filterable, sortable, paginated)
 * Right: IssueDetail (opens when a row is selected)
 */

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IssueTable } from "@/app/components/IssueTable";
import { IssueDetail } from "@/app/components/IssueDetail";
import { CreateIssueModal } from "@/app/components/CreateIssueModal";
import { useHotkeys } from "react-hotkeys-hook";
import { ticketApi } from "@/lib/api";
import type { Ticket } from "@/lib/types";

function IssuesContent() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Support ?id= query param (from command palette navigation)
  const idParam = searchParams.get("id");
  useEffect(() => {
    if (idParam) {
      ticketApi.getById(idParam).then((t) => setSelected(t)).catch(console.error);
    }
  }, [idParam]);

  const handleUpdated = (updated: Ticket) => {
    setSelected(updated);
    setRefreshKey(k => k + 1);
  };

  const handleDeleted = () => {
    setSelected(null);
    setRefreshKey(k => k + 1);
  };

  const handleCreated = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left pane: Issue list ────────────────────────────────────────── */}
      <div
        className={`
          flex flex-col border-r border-white/8 overflow-hidden transition-all duration-300
          ${selected ? "w-0 md:w-[55%] lg:w-[60%]" : "w-full"}
        `}
      >
        {/* Page title bar */}
        <div className="hidden md:flex items-center justify-between px-4 py-3.5 border-b border-white/8 shrink-0">
          <div>
            <h1 className="text-5xl font-semibold text-white">Issues</h1>
            <p className="text-[11px] text-white/35 mt-2 font-mono">
              Press <kbd className="px-1 py-0.5 rounded bg-white/8 text-[14px] mr-1">⌘ K</kbd> to search &nbsp;·&nbsp;
              <kbd className="px-1 py-0.5 rounded bg-white/8 text-[14px]">⌘ C</kbd> to create
            </p>
          </div>
        </div>

        <IssueTable
          onSelect={setSelected}
          selectedId={selected?.id ?? null}
          onCreateClick={() => window.dispatchEvent(new CustomEvent('open-create-issue'))}
          refreshKey={refreshKey}
        />
      </div>

      {/* ── Right pane: Issue detail ─────────────────────────────────────── */}
      {selected && (
        <div className={`
          flex-1 overflow-hidden bg-[#1C1C1E]
          ${selected ? "flex flex-col" : "hidden"}
        `}>
          <IssueDetail
            ticket={selected}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        </div>
      )}

    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={
      <div className="h-full w-full flex items-center justify-center bg-[#1C1C1E]">
        <div className="animate-pulse text-white/20 font-medium">Loading Issues...</div>
      </div>
    }>
      <IssuesContent />
    </Suspense>
  );
}
