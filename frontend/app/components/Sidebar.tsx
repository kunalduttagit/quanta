"use client";

/**
 * Collapsible Sidebar navigation.
 *
 * - Desktop (≥1024px): always visible, collapsible to icon rail
 * - Tablet (768–1023px): hidden by default, slide-in overlay
 * - Mobile (<768px): full-screen overlay
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
} from "lucide-react";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/issues",    label: "Issues",    icon: Ticket },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* ── Mobile/Tablet overlay backdrop ────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* ── Sidebar panel ─────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          bg-[#1C1C1E] border-r border-white/8
          transition-all duration-300 ease-out
          ${collapsed ? "w-[64px]" : "w-[220px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* ── Logo / brand ──────────────────────────────────────────────── */}
        <div className={`flex items-center h-14 px-4 border-b border-white/8 ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="object-contain" />
          </div>
          {!collapsed && (
            <span className="text-2xl font-extrabold mb-1 text-white/90 tracking-tight leading-none">
              QuantaTrack
            </span>
          )}
          {/* Mobile close */}
          {!collapsed && (
            <button
              className="ml-auto lg:hidden text-white/40 hover:text-white/80 transition-colors"
              onClick={onMobileClose}
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onMobileClose}
              className={`
                flex items-center gap-3 px-2.5 py-2 rounded-[10px]
                text-[13px] font-medium transition-all duration-150 group
                ${isActive(href)
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/85 hover:bg-white/5"
                }
                ${collapsed ? "justify-center" : ""}
              `}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                  isActive(href) ? "text-blue-400" : "text-white/40 group-hover:text-white/70"
                }`}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          ))}
        </nav>

        {/* ── Collapse toggle (desktop only) ────────────────────────────── */}
        <div className="hidden lg:flex p-2 border-t border-white/8">
          <button
            className="w-full flex items-center justify-center p-2 rounded-[10px] text-white/30 hover:text-white/70 hover:bg-white/5 transition-all duration-150"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />
            }
          </button>
        </div>
      </aside>

      {/* ── Desktop spacer to push main content right ─────────────────────── */}
      <div
        className={`hidden lg:block shrink-0 transition-all duration-300 ${
          collapsed ? "w-[64px]" : "w-[220px]"
        }`}
      />
    </>
  );
}

// ── Mobile menu button (placed in top bar of layout) ──────────────────────
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="lg:hidden p-2 rounded-[10px] text-white/50 hover:text-white/85 hover:bg-white/8 transition-all"
      onClick={onClick}
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
