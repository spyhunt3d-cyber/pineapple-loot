"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const ADMIN_NAV = [
  { href: "/admin",               label: "Dashboard",    icon: "◈" },
  { href: "/admin/raids",         label: "Raid Weeks",   icon: "📅" },
  { href: "/admin/import",        label: "Import",       icon: "↑" },
  { href: "/admin/raid-loot-priority", label: "Raid Loot Priority", icon: "📋" },
  { href: "/admin/signups",        label: "Raid Helper",  icon: "⚔️" },
  { href: "/admin/loot-wins",     label: "Record Win",   icon: "🏆" },
  { href: "/admin/players",       label: "Players",      icon: "👥" },
  { href: "/admin/export",        label: "Export",       icon: "↓" },
];

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors whitespace-nowrap ${
        active
          ? "bg-[--color-surface-2] text-[--color-gold] font-medium"
          : "text-[--color-text-muted] hover:bg-[--color-surface-2] hover:text-[--color-text]"
      }`}
    >
      <span className="text-sm w-4 text-center opacity-60 shrink-0">{icon}</span>
      {label}
    </Link>
  );
}

export function AdminSidebarNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-[--color-border] bg-[--color-surface] flex-col">
        {/* Brand */}
        <div className="p-4 border-b border-[--color-border]">
          <p className="text-sm font-bold text-[--color-gold]">🍍 Pineapple Loot</p>
          <p className="section-label mt-0.5">Admin Panel</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {ADMIN_NAV.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 space-y-1 border-t border-[--color-border]">
          <Link
            href="/"
            className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-[--color-text-muted] hover:bg-[--color-surface-2] hover:text-[--color-text] transition-colors"
          >
            <span className="text-xs w-4 text-center opacity-60">←</span>
            Public Site
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm font-medium text-red-400/80 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <span className="text-xs w-4 text-center">⏻</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile top strip ────────────────────────── */}
      <div className="md:hidden border-b border-[--color-border] bg-[--color-surface] shrink-0">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[--color-border]">
          <span className="text-sm font-bold text-[--color-gold]">🍍 Admin</span>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-[--color-text-muted] hover:text-[--color-text] px-2 py-1">
              ← Public
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs font-medium text-red-400/80 hover:text-red-400 px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        {/* Nav scroll strip */}
        <nav className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
          {ADMIN_NAV.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>
      </div>
    </>
  );
}
