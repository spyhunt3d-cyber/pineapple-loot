"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/loot-table",    label: "Loot Table" },
  { href: "/loot-priority", label: "Priority" },
  { href: "/soft-reserves", label: "Soft Reserves" },
  { href: "/players",       label: "Players" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[--color-border] bg-[--color-surface]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-base sm:text-lg font-bold tracking-wide text-[--color-gold]">
              🍍 <span className="hidden xs:inline">Pineapple </span>Loot Xpress
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-[--color-surface-2] text-[--color-gold]"
                      : "text-[--color-text-muted] hover:text-[--color-text] hover:bg-[--color-surface-2]"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Admin pill — always visible */}
          <Link
            href="/admin"
            className={cn(
              "shrink-0 px-3 py-1.5 rounded border text-xs font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "border-[--color-gold] text-[--color-gold] bg-[--color-gold]/10"
                : "border-[--color-border] text-[--color-text-muted] hover:border-[--color-gold]/50 hover:text-[--color-gold]"
            )}
          >
            ⚙ Admin
          </Link>
        </div>

        {/* Mobile nav strip */}
        <nav className="flex md:hidden gap-1 pb-2 overflow-x-auto scrollbar-none">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors shrink-0",
                  active
                    ? "bg-[--color-surface-2] text-[--color-gold]"
                    : "text-[--color-text-muted] hover:text-[--color-text]"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
