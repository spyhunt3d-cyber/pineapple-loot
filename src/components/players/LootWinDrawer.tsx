"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getWowheadItemUrl, getWowheadDataAttr } from "@/lib/wow-constants";

export interface LootWinRow {
  id: number;
  itemId: string;
  itemName: string;
  bossName: string;
  winType: string;
  raidDate: string;
  instance: string;
  night: number;
}

const WIN_TYPE_STYLE: Record<string, string> = {
  MS:   "bg-emerald-900/40 text-emerald-400 border-emerald-800",
  SR:   "bg-blue-900/40 text-blue-400 border-blue-800",
  PRIO: "bg-amber-900/40 text-amber-400 border-amber-800",
  OS:   "bg-zinc-800 text-zinc-400 border-zinc-700",
};

interface Props {
  wins: LootWinRow[];
  allowDelete?: boolean;
  onDeleted?: (id: number) => void;
}

export function LootWinDrawer({ wins: initialWins, allowDelete, onDeleted }: Props) {
  const [wins, setWins] = useState(initialWins);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function handleDelete(id: number, itemName: string) {
    if (!confirm(`Remove "${itemName}" from this player's loot history?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/loot-wins/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      setWins(w => w.filter(r => r.id !== id));
      onDeleted?.(id);
      toast.success(`"${itemName}" removed`);
    } finally {
      setDeleting(null);
    }
  }

  const realWins = wins.filter(w => w.itemId !== "gargul-import");
  const gargulCount = wins.length - realWins.length;

  if (wins.length === 0) {
    return <p className="py-3 text-xs text-[--color-text-muted] italic">No loot wins recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {realWins.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[--color-border]">
                <th className="py-1.5 px-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide">Item</th>
                <th className="py-1.5 px-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide hidden sm:table-cell">Boss</th>
                <th className="py-1.5 px-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide hidden md:table-cell">Raid</th>
                <th className="py-1.5 px-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide">Date</th>
                <th className="py-1.5 px-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide">Type</th>
                {allowDelete && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {realWins.map(win => (
                <tr key={win.id} className="border-b border-[--color-border]/50 hover:bg-[--color-surface-2]/40">
                  <td className="py-1.5 px-2">
                    <a
                      href={getWowheadItemUrl(win.itemId, win.instance)}
                      data-wowhead={getWowheadDataAttr(win.itemId, win.instance)}
                      target="_blank"
                      rel="noreferrer"
                      className="item-link font-medium"
                    >
                      {win.itemName}
                    </a>
                  </td>
                  <td className="py-1.5 px-2 text-[--color-text-muted] hidden sm:table-cell">{win.bossName}</td>
                  <td className="py-1.5 px-2 text-[--color-text-muted] hidden md:table-cell">
                    Night {win.night} · {win.instance}
                  </td>
                  <td className="py-1.5 px-2 text-[--color-text-muted] whitespace-nowrap">
                    {new Date(win.raidDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-1.5 px-2">
                    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${WIN_TYPE_STYLE[win.winType] ?? WIN_TYPE_STYLE.OS}`}>
                      {win.winType}
                    </span>
                  </td>
                  {allowDelete && (
                    <td className="py-1.5 px-2 text-right">
                      <button
                        onClick={() => handleDelete(win.id, win.itemName)}
                        disabled={deleting === win.id}
                        className="text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-30 text-xs"
                      >
                        {deleting === win.id ? "…" : "✕"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {gargulCount > 0 && (
        <p className="text-xs text-[--color-text-muted]/60 italic px-1">
          +{gargulCount} win{gargulCount !== 1 ? "s" : ""} recorded from Gargul count import (no item details — use Record Loot Win to add specifics)
        </p>
      )}

      {realWins.length === 0 && gargulCount === 0 && (
        <p className="py-3 text-xs text-[--color-text-muted] italic">No loot wins recorded.</p>
      )}
    </div>
  );
}
