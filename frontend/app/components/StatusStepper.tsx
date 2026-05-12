"use client";

/**
 * StatusStepper — delivery-tracker style vertical event timeline.
 * Renders the ticket's events[] audit log as an ordered list of steps.
 */

import React from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import type { TicketEvent, TicketStatus } from "@/lib/types";
import { Badge } from "./ui/Badge";

interface StatusStepperProps {
  events: TicketEvent[];
  currentStatus: TicketStatus;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const FIELD_LABEL: Record<string, string> = {
  status:   "Status changed",
  priority: "Priority changed",
};

export function StatusStepper({ events, currentStatus, createdAt }: StatusStepperProps) {
  const isOpen = currentStatus === "Open";

  // Build synthetic first event (ticket created)
  const allSteps = [
    {
      field: "created",
      old_value: "",
      new_value: "Open",
      changed_at: createdAt,
      label: "Ticket created",
    },
    ...events.map(e => ({
      ...e,
      label: FIELD_LABEL[e.field] ?? `${e.field} changed`,
    })),
  ];

  return (
    <div className="space-y-0">
      {allSteps.map((step, i) => {
        const isLast = i === allSteps.length - 1;
        const isStatusChange = step.field === "status" || step.field === "created";
        const isPriorityChange = step.field === "priority";

        return (
          <div key={i} className="flex gap-3">
            {/* ── Timeline spine ────────────────────────────────────────── */}
            <div className="flex flex-col items-center">
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10
                ${isLast ? "bg-blue-500/20 ring-1 ring-blue-500/40" : "bg-white/5 ring-1 ring-white/10"}
              `}>
                {isLast
                  ? <Circle className="w-3 h-3 text-blue-400" />
                  : <CheckCircle2 className="w-3 h-3 text-white/30" />
                }
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-white/8 my-1" />
              )}
            </div>

            {/* ── Step content ──────────────────────────────────────────── */}
            <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
              <p className="text-[12px] font-medium text-white/70 mb-1">{step.label}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {step.old_value && isStatusChange && (
                  <>
                    <Badge variant="status" value={step.old_value} />
                    <ArrowRight className="w-3 h-3 text-white/25" />
                    <Badge variant="status" value={step.new_value} />
                  </>
                )}
                {isPriorityChange && (
                  <>
                    <Badge variant="priority" value={step.old_value} />
                    <ArrowRight className="w-3 h-3 text-white/25" />
                    <Badge variant="priority" value={step.new_value} />
                  </>
                )}
                {!step.old_value && step.field === "created" && (
                  <Badge variant="status" value="Open" />
                )}
              </div>
              <p className="text-[11px] text-white/30 mt-1.5">{formatDate(step.changed_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
