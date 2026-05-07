"use client";

import { useState, useEffect, useCallback } from "react";
import { Raid, RaidWeek } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { CLASS_COLORS } from "@/lib/wow-constants";
import { getRollRangeColorClass, type RollRange } from "@/lib/roll-calculator";

type RaidWithWeek = RaidWeek & { raids: Raid[] };

interface ReserveWithRange {
  id: number;
  itemId: string;
  itemName: string;
  bossName: string;
  weeksConsecutive: number;
  rollRange: RollRange;
  player: { charName: string; class: string | null; spec: string | null };
  raid: { night: number };
}

interface Props {
  weeks: RaidWithWeek[];
}

export function SoftReservesClient({ weeks }: Props) {
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(
    weeks[0]?.id ?? null
  );
  const [activeNight, setActiveNight] = useState<1 | 2>(1);
  const [reserves, setReserves] = useState<ReserveWithRange[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId);

  const loadReserves = useCallback(async (weekId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/soft-reserves?weekId=${weekId}`);
      const { reserves: data } = await res.json();
      setReserves(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWeekId) loadReserves(selectedWeekId);
  }, [selectedWeekId, loadReserves]);

  // Filter reserves by night
  const nightReserves = reserves.filter((r) => r.raid.night === activeNight);

  // Group by player name for display
  const byPlayer = nightReserves.reduce<Record<string, ReserveWithRange[]>>((acc, r) => {
    const key = r.player.charName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const hasNight = (night: 1 | 2) =>
    selectedWeek?.raids.some((r) => r.night === night) ?? false;

  return (
    <div className="space-y-6">
      {/* Week selector */}
      <div>
        <label className="block text-sm text-[--color-text-muted] mb-1">
          Raid Week
        </label>
        <select
          value={selectedWeekId ?? ""}
          onChange={(e) => setSelectedWeekId(Number(e.target.value))}
          className="rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
        >
          {weeks.map((week) => (
            <option key={week.id} value={week.id}>
              Week of {formatDate(week.weekStart)}
              {week.raids.length > 0
                ? ` (${week.raids.length} night${week.raids.length > 1 ? "s" : ""})`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Night tabs */}
      <div className="flex gap-1 border-b border-[--color-border]">
        {([1, 2] as const).map((night) => (
          <button
            key={night}
            onClick={() => setActiveNight(night)}
            disabled={!hasNight(night)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeNight === night
                ? "border-[--color-gold] text-[--color-gold]"
                : "border-transparent text-[--color-text-muted] hover:text-[--color-text] disabled:opacity-30"
            }`}
          >
            Night {night}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-[--color-text-muted] animate-pulse">
          Loading reserves…
        </div>
      ) : Object.keys(byPlayer).length === 0 ? (
        <div className="py-12 text-center text-[--color-text-muted]">
          No reserves found for this night.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[--color-border]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--color-border] bg-[--color-surface-2]">
                <th className="px-4 py-3 text-left font-medium text-[--color-text-muted]">Player</th>
                <th className="px-4 py-3 text-left font-medium text-[--color-text-muted]">Item</th>
                <th className="px-4 py-3 text-left font-medium text-[--color-text-muted] w-24">Weeks</th>
                <th className="px-4 py-3 text-left font-medium text-[--color-text-muted] w-32">Roll Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {Object.entries(byPlayer).flatMap(([charName, playerReserves]) =>
                playerReserves.map((reserve, i) => {
                  const classColor = CLASS_COLORS[reserve.player.class ?? ""] ?? "#e2e0d8";
                  const rangeColor = getRollRangeColorClass(reserve.rollRange.week);
                  return (
                    <tr
                      key={reserve.id}
                      className="bg-[--color-surface] hover:bg-[--color-surface-2] transition-colors"
                    >
                      {/* Player name — only show on first reserve row */}
                      <td className="px-4 py-3 font-medium" style={{ color: classColor }}>
                        {i === 0 ? (
                          <span>
                            {charName}
                            {reserve.player.spec && (
                              <span className="ml-1 text-xs text-[--color-text-muted]">
                                ({reserve.player.spec})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="opacity-0 select-none">{charName}</span>
                        )}
                      </td>

                      {/* Item name with Wowhead link */}
                      <td className="px-4 py-3">
                        <a
                          href={`https://www.wowhead.com/item=${reserve.itemId}`}
                          data-wowhead={`item=${reserve.itemId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[--color-gold-light] hover:underline"
                        >
                          {reserve.itemName}
                        </a>
                      </td>

                      {/* Consecutive weeks */}
                      <td className="px-4 py-3 text-[--color-text-muted]">
                        {reserve.weeksConsecutive === 6 ? (
                          <span className="text-amber-400 font-medium">6 (max)</span>
                        ) : (
                          reserve.weeksConsecutive
                        )}
                      </td>

                      {/* Roll range badge */}
                      <td className="px-4 py-3">
                        <span className={`rounded border px-2 py-0.5 text-xs font-mono ${rangeColor}`}>
                          {reserve.rollRange.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
