"use client";

/**
 * LayoutShell — client component that wraps all pages with:
 * - Collapsible Sidebar
 * - Command Palette (CMD+K)
 * - Create Issue Modal (CMD+C)
 * - Mobile menu toggle
 *
 * Kept separate from layout.tsx (server component) so we can use React state.
 */

import React, { useState } from "react";
import { Sidebar, MobileMenuButton } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { CreateIssueModal } from "./CreateIssueModal";

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  React.useEffect(() => {
    const handleOpen = () => setCreateOpen(true);
    window.addEventListener("open-create-issue", handleOpen);
    return () => window.removeEventListener("open-create-issue", handleOpen);
  }, []);

  const handleCreated = () => setRefreshKey(k => k + 1);

  return (
    <div className="flex min-h-screen bg-[#1C1C1E]">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Top bar (mobile only) ──────────────────────────────────────── */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-white/8 shrink-0">
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          <span className="text-[14px] font-semibold text-white/80">Quanta Track</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="text-[12px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              + New
            </button>
          </div>
        </header>

        {/* ── Main content ────────────────────────────────────────────────── */}
        {/* Pass refreshKey via data attribute so child pages can react */}
        <main
          className="flex-1 overflow-hidden"
          data-refresh-key={refreshKey}
        >
          {children}
        </main>
      </div>

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      <CommandPalette onCreateIssue={() => setCreateOpen(true)} />
      <CreateIssueModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
