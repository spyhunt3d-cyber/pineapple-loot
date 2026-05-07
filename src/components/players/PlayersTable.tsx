"use client";

import { useState } from "react";
import Link from "next/link";
import { CLASS_COLORS, ROLE_ICONS } from "@/lib/wow-constants";
import { LootWinDrawer, type LootWinRow } from "./LootWinDrawer";

export interface PublicPlayer {
  id: number;
  charName: string;
  server: string;
  class: string | null;
  spec: string | null;
  role: string | null;
  wins: LootWinRow[];
  winCounts: Record<string, number>;
}

export function PlayersTable({ players }: { players: PublicPlayer[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  return (
    <div className="space-y-1">
      {players.map(player => {
        const classColor = CLASS_COLORS[player.class ?? ""] ?? "#e2e0d8";
        const isOpen = open.has(player.id);
        const total = player.wins.length;

        return (
          <div key={player.id} className="rounded-lg border border-[--color-border] bg-[--color-surface] overflow-hidden">
            {/* Main row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Expand toggle */}
              <button
                onClick={() => setOpen(prev => { const n = new Set(prev); n.has(player.id) ? n.delete(player.id) : n.add(player.id); return n; })}
                className="text-[--color-text-muted] hover:text-[--color-gold] transition-colors shrink-0 w-5 text-center"
                title={isOpen ? "Collapse" : "Show loot"}
              >
                <span className={`inline-block transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}>▶</span>
              </button>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/players/${player.charName}-${player.server}`}
                  className="font-semibold hover:underline"
                  style={{ color: classColor }}
                >
                  {player.charName}
                </Link>
                <span className="ml-1 text-xs text-[--color-text-muted]">-{player.server}</span>
              </div>

              {/* Class / Spec */}
              <div className="hidden sm:block w-40 text-sm shrink-0" style={{ color: classColor }}>
                {player.class ?? "—"}
                {player.spec && <span className="text-[--color-text-muted]"> / {player.spec}</span>}
              </div>

              {/* Role */}
              <div className="hidden md:block w-24 text-sm text-[--color-text-muted] shrink-0">
                {player.role ? `${ROLE_ICONS[player.role] ?? ""} ${player.role}` : "—"}
              </div>

              {/* Win counts */}
              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="text-[--color-text-muted]">
                  MS <span className="font-medium text-[--color-text]">{player.winCounts.MS ?? 0}</span>
                </span>
                <span className="text-[--color-text-muted]">
                  SR <span className="font-medium text-[--color-text]">{player.winCounts.SR ?? 0}</span>
                </span>
                <button
                  onClick={() => setOpen(prev => { const n = new Set(prev); n.has(player.id) ? n.delete(player.id) : n.add(player.id); return n; })}
                  className="font-medium text-[--color-text] hover:text-[--color-gold] transition-colors"
                >
                  {total} total
                </button>
              </div>
            </div>

            {/* Drawer */}
            {isOpen && (
              <div className="border-t border-[--color-border] bg-[--color-surface-2]/50 px-4 py-3">
                <LootWinDrawer wins={player.wins} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
