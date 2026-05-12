"use client";

/**
 * Dashboard page — Apple Health-inspired overview with:
 * - Stat cards (total, open, in-progress, closed, high-priority)
 * - Recharts donut chart: tickets by domain
 * - Recharts bar chart: tickets by status
 * - Recharts area chart: tickets by priority
 */

import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Ticket as TicketIcon, AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw,
} from "lucide-react";
import { ticketApi } from "@/lib/api";
import type { TicketSummary, Ticket } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";

// ── Color constants ────────────────────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  Engineering: "#3DC8FF",  // Apple cyan
  DevOps: "#30D158",  // Apple green
  HR: "#FF375F",  // Apple pink
  IT: "#6D7CFF",  // Apple indigo
  Finance: "#FFD60A",  // Apple yellow
};

const STATUS_COLORS: Record<string, string> = {
  "Open": "#0091FF",
  "In Progress": "#DB34F2",
  "Closed": "#636366",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "#30D158",
  Medium: "#FFD60A",
  High: "#FF9230",
  Critical: "#FF4245",
};

// ── Stat card ──────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sublabel?: string;
}

function StatCard({ label, value, icon, color, sublabel }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-[#2C2C2E] rounded-2xl border border-white/6">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}20` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-[24px] font-bold text-white leading-none">{value}</p>
        <p className="text-[12px] text-white/45 mt-1">{label}</p>
        {sublabel && <p className="text-[11px] text-white/25">{sublabel}</p>}
      </div>
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 bg-[#3A3A3C] border border-white/10 rounded-[10px] text-[12px]">
      {label && <p className="text-white/50 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-white font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ── Priority Segmented Chart ───────────────────────────────────────────────
function PrioritySegmentedChart({ data, total }: { data: { name: string; count: number }[], total: number }) {
  if (total === 0) return <div className="text-[12px] text-white/25 text-center py-8">No data</div>;

  const SEGMENTS = 56;
  let segmentsArr: string[] = [];

  const sortedData = [...data].sort((a, b) => {
    const order: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
    return order[a.name] - order[b.name];
  });

  sortedData.forEach(d => {
    const count = Math.round((d.count / total) * SEGMENTS);
    for (let i = 0; i < count; i++) segmentsArr.push(PRIORITY_COLORS[d.name]);
  });

  if (segmentsArr.length > SEGMENTS) segmentsArr = segmentsArr.slice(0, SEGMENTS);
  while (segmentsArr.length < SEGMENTS) segmentsArr.push("rgba(255,255,255,0.05)");

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="mb-4">
        <h2 className="text-[42px] font-bold text-white leading-none tracking-tight">{total}</h2>
        <p className="text-[13px] text-white/50 mt-1 font-medium">Total Issues</p>
      </div>

      <div className="flex items-center gap-[3px] w-full mb-6">
        {segmentsArr.map((color, i) => (
          <div key={i} className="flex-1 h-24 rounded-full" style={{ backgroundColor: color }} />
        ))}
      </div>

      <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
        {sortedData.map(d => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[d.name] }} />
            <p className="text-[11px] text-white/70">
              {d.name} <span className="font-semibold text-white">{d.count}</span> <span className="text-white/30">({Math.round((d.count / total) * 100)}%)</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [summary, setSummary] = useState<TicketSummary | null>(null);
  const [upcoming, setUpcoming] = useState<Ticket[]>([]);
  const [recent, setRecent] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, upData, recData] = await Promise.all([
        ticketApi.summary(),
        ticketApi.list({ sort_by: "deadline", sort_order: "asc", limit: 20 }),
        ticketApi.list({ sort_by: "created_at", sort_order: "desc", limit: 3 })
      ]);
      setSummary(sumData);

      const now = new Date();
      const filteredUpcoming = upData.tickets
        .filter(t => t.deadline && new Date(t.deadline) >= now && t.status !== "Closed")
        .slice(0, 3);
      setUpcoming(filteredUpcoming);
      setRecent(recData.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCount = summary?.by_status.find(s => s.status === "Open")?.count ?? 0;
  const inProgressCount = summary?.by_status.find(s => s.status === "In Progress")?.count ?? 0;
  const closedCount = summary?.by_status.find(s => s.status === "Closed")?.count ?? 0;

  const domainData = (summary?.by_domain ?? []).map(d => ({
    name: d.domain, value: d.count,
  }));

  const statusData = (summary?.by_status ?? []).map(s => ({
    name: s.status, count: s.count,
  }));

  const priorityData = (summary?.by_priority ?? []).map(p => ({
    name: p.priority, count: p.count,
  }));

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            {/* <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" /> */}
            <h1 className="text-5xl font-bold text-white tracking-tight">Dashboard</h1>
          </div>
          <p className="text-[13px] text-white/40 mt-2">Live ticket analytics</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-white/5 hover:bg-white/8 text-[13px] text-white/60 hover:text-white/90 transition-all"
          id="dashboard-refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-white/30">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading analytics…
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-[13px] text-red-400 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && summary && (
        <>
          {/* ── Stat cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Total Issues"
              value={summary.total}
              icon={<TicketIcon className="w-5 h-5" />}
              color="#0091FF"
            />
            <StatCard
              label="Open"
              value={openCount}
              icon={<Clock className="w-5 h-5" />}
              color="#FF9230"
            />
            <StatCard
              label="In Progress"
              value={inProgressCount}
              icon={<Loader2 className="w-5 h-5" />}
              color="#DB34F2"
            />
            <StatCard
              label="Closed"
              value={closedCount}
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="#30D158"
            />
          </div>

          {/* Critical-priority alert */}
          {summary.high_priority_count > 0 && (
            <Link href="/issues?priority=Critical" className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6 hover:bg-red-500/15 transition-colors cursor-pointer">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-[13px] text-red-300">
                <span className="font-semibold">{summary.high_priority_count}</span> Critical priority {summary.high_priority_count === 1 ? "issue requires" : "issues require"} attention.
                <span className="px-4 underline text-red-400/70 hover:text-red-400">View All</span>
              </p>
            </Link>
          )}

          {/* ── Charts row ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Donut — by domain */}
            <div className="bg-[#2C2C2E] rounded-2xl border border-white/6 p-5 lg:col-span-3 flex flex-col h-full">
              <h3 className="text-[13px] font-semibold text-white/80 mb-4">By Domain</h3>
              {domainData.length === 0 ? (
                <p className="text-[12px] text-white/25 text-center py-8">No data</p>
              ) : (
                <div className="flex-1 flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={domainData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                        animationBegin={0}
                        animationDuration={700}
                      >
                        {domainData.map(entry => (
                          <Cell
                            key={entry.name}
                            fill={DOMAIN_COLORS[entry.name] ?? "#636366"}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="space-y-1.5 mt-4">
                    {domainData.map(d => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: DOMAIN_COLORS[d.name] ?? "#636366" }}
                          />
                          <span className="text-[12px] text-white/55">{d.name}</span>
                        </div>
                        <span className="text-[12px] font-medium text-white/75">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Segmented — by priority (EXPANDED) */}
            <div className="bg-[#2C2C2E] rounded-2xl border border-white/6 p-6 lg:col-span-6">
              <PrioritySegmentedChart data={priorityData} total={summary.total} />
            </div>

            {/* Bar — by status (SHRUNK) */}
            <div className="bg-[#2C2C2E] rounded-2xl border border-white/6 p-5 lg:col-span-3">
              <h3 className="text-[13px] font-semibold text-white/80 mb-4">By Status</h3>
              {statusData.length === 0 ? (
                <p className="text-[12px] text-white/25 text-center py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusData} barSize={24}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={20}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar
                      dataKey="count"
                      name="Tickets"
                      radius={[5, 5, 0, 0]}
                      animationDuration={700}
                    >
                      {statusData.map(entry => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name] ?? "#636366"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Lists row ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

            {/* Upcoming Tickets */}
            <div>
              <h3 className="text-[14px] font-semibold text-white/80 mb-3">Upcoming Deadlines</h3>
              <div className="space-y-2">
                {upcoming.length === 0 ? (
                  <p className="text-[12px] text-white/30 py-4 bg-white/5 rounded-xl text-center">No upcoming tickets</p>
                ) : (
                  upcoming.map(ticket => (
                    <Link key={ticket.id} href={`/issues?id=${ticket.id}`} className="flex flex-col gap-1.5 p-3.5 bg-[#2C2C2E] hover:bg-white/8 rounded-xl border border-white/6 transition-colors group">
                      <div className="flex items-start justify-between">
                        <p className="text-[13px] font-medium text-white/90 truncate group-hover:text-blue-400 transition-colors">{ticket.title}</p>
                        <span className="text-[10px] text-white/40 font-mono ml-2 shrink-0">{ticket.ticket_key || ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ticket.priority === 'Critical' ? 'bg-red-400' : ticket.priority === 'High' ? 'bg-orange-400' : ticket.priority === 'Medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                        <span className="text-[11px] text-white/50">{ticket.status}</span>
                        <span className="text-[11px] text-white/30">•</span>
                        <span className="text-[11px] text-white/50">{ticket.domain}</span>
                        {ticket.deadline && (
                          <>
                            <span className="text-[11px] text-white/30">•</span>
                            <span className="text-[11px] text-red-400 font-medium">Due {new Date(ticket.deadline).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Recent Tickets */}
            <div>
              <h3 className="text-[14px] font-semibold text-white/80 mb-3">Recently Created</h3>
              <div className="space-y-2">
                {recent.length === 0 ? (
                  <p className="text-[12px] text-white/30 py-4 bg-white/5 rounded-xl text-center">No recent tickets</p>
                ) : (
                  recent.map(ticket => (
                    <Link key={ticket.id} href={`/issues?id=${ticket.id}`} className="flex flex-col gap-1.5 p-3.5 bg-[#2C2C2E] hover:bg-white/8 rounded-xl border border-white/6 transition-colors group">
                      <div className="flex items-start justify-between">
                        <p className="text-[13px] font-medium text-white/90 truncate group-hover:text-blue-400 transition-colors">{ticket.title}</p>
                        <span className="text-[10px] text-white/40 font-mono ml-2 shrink-0">{ticket.ticket_key || ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ticket.priority === 'Critical' ? 'bg-red-400' : ticket.priority === 'High' ? 'bg-orange-400' : ticket.priority === 'Medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                        <span className="text-[11px] text-white/50">{ticket.status}</span>
                        <span className="text-[11px] text-white/30">•</span>
                        <span className="text-[11px] text-white/50">{ticket.domain}</span>
                        <span className="text-[11px] text-white/30">•</span>
                        <span className="text-[11px] text-white/40">Created {new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
