"use client";

/**
 * Badge UI component — pill-shaped label with Apple system color variants.
 * Used for domain, priority, and status throughout the app.
 */

import React from "react";
import type { Domain, Priority, TicketStatus } from "@/lib/types";
import { PriorityIcon } from "./PriorityIcon";

// ── Color maps ─────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<Priority, string> = {
  Low:      "bg-green-500/15 text-green-400 ring-green-500/25",
  Medium:   "bg-yellow-400/15 text-yellow-300 ring-yellow-400/25",
  High:     "bg-orange-500/15 text-orange-400 ring-orange-500/25",
  Critical: "bg-red-500/15 text-red-400 ring-red-500/25",
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  "Open":        "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  "In Progress": "bg-purple-500/15 text-purple-400 ring-purple-500/25",
  "Closed":      "bg-white/10 text-white/50 ring-white/15",
};

const DOMAIN_STYLES: Record<Domain, string> = {
  Engineering: "bg-cyan-500/15 text-cyan-400 ring-cyan-500/25",
  DevOps:      "bg-teal-500/15 text-teal-400 ring-teal-500/25",
  HR:          "bg-pink-500/15 text-pink-400 ring-pink-500/25",
  IT:          "bg-indigo-500/15 text-indigo-400 ring-indigo-500/25",
  Finance:     "bg-amber-500/15 text-amber-400 ring-amber-500/25",
};

// ── Priority dot color ─────────────────────────────────────────────────────

export const PRIORITY_DOT: Record<Priority, string> = {
  Low:      "bg-green-400",
  Medium:   "bg-yellow-300",
  High:     "bg-orange-400",
  Critical: "bg-red-400",
};

// ── Component ──────────────────────────────────────────────────────────────

interface BadgeProps {
  variant: "priority" | "status" | "domain";
  value: string;
  showDot?: boolean;
  className?: string;
}

export function Badge({ variant, value, showDot = false, className = "" }: BadgeProps) {
  let styles = "";
  let dotColor = "";

  if (variant === "priority") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[12px] font-medium text-white/80 transition-all ${className}`}>
        <PriorityIcon priority={value as Priority} />
        {value}
      </span>
    );
  } else if (variant === "status") {
    styles = STATUS_STYLES[value as TicketStatus] ?? "bg-white/10 text-white/50";
  } else {
    styles = DOMAIN_STYLES[value as Domain] ?? "bg-white/10 text-white/50";
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5
        text-xs font-medium rounded-full ring-1 ring-inset
        transition-all duration-150
        ${styles} ${className}
      `}
    >
      {showDot && dotColor && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      )}
      {value}
    </span>
  );
}

// ── Priority indicator dot (standalone) ───────────────────────────────────

export function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[priority]}`}
    />
  );
}
