"use client";

import { useState, useEffect, useCallback } from "react";
import { Raid, RaidWeek } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { CLASS_COLORS, getWowheadItemUrl, getWowheadDataAttr } from "@/lib/wow-constants";
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
  raid: { night: number; instance: string };
}

interface Props {
  weeks: RaidWithWeek[];
}

const ROLL_RANGE_LABELS = ["1–100", "20–120", "50–150", "90–190", "140–240", "200–300"];
const ROLL_RANGE_COLORS = [
  "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  "bg-green-900/50 text-green-300 border-green-700",
  "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  "bg-orange-900/50 text-orange-300 border-orange-700",
  "bg-red-900/50 text-red-300 border-red-700",
  "bg-amber-900/50 text-amber-300 border-amber-600 font-bold",
];

export function SoftReservesClient({ weeks }: Props) {
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(weeks[0]?.id ?? null);
  const [activeNight, setActiveNight]         = useState<1 | 2>(1);
  const [reserves, setReserves]               = useState<ReserveWithRange[]>([]);
  const [bossOrder,   setBossOrder]   = useState<Record<string, number>>({});   // bossName → order
  const [itemBossMap, setItemBossMap] = useState<Record<string, number>>({});   // itemId → bossOrder
  const [loading, setLoading]                 = useState(false);
  const [search, setSearch]                   = useState("");

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId);

  const loadReserves = useCallback(async (weekId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/soft-reserves?weekId=${weekId}`);
      const { reserves: data } = await res.json() as { reserves: ReserveWithRange[] };
      setReserves(data ?? []);
      // Re-init Wowhead tooltips after data loads
      setTimeout(() => {
        const wh = (window as unknown as Record<string, unknown>)["WH"] as { Tooltips?: { refreshLinks?: () => void } } | undefined;
        wh?.Tooltips?.refreshLinks?.();
      }, 100);
      // Derive instance from first reserve and fetch boss order via itemId
      const instance = data?.[0]?.raid?.instance;
      if (instance) {
        const r2 = await fetch(`/api/raid-loot?instance=${encodeURIComponent(instance)}`);
        const { items } = await r2.json() as { items: { itemId: string; bossName: string; bossOrder: number }[] };
        const byName: Record<string, number> = {};
        const byItem: Record<string, number> = {};
        for (const item of (items ?? [])) {
          byName[item.bossName] = item.bossOrder;
          byItem[item.itemId]   = item.bossOrder;
        }
        setBossOrder(byName);
        setItemBossMap(byItem);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWeekId) loadReserves(selectedWeekId);
  }, [selectedWeekId, loadReserves]);

  const hasNight = (night: 1 | 2) => selectedWeek?.raids.some((r) => r.night === night) ?? false;

  const nightReserves = reserves.filter((r) => r.raid.night === activeNight);

  // Group by boss → item
  const byBoss = nightReserves.reduce<Record<string, Record<string, ReserveWithRange[]>>>(
    (acc, r) => {
      const boss = r.bossName || "Unknown Boss";
      const key  = `${r.itemId}::${r.itemName}`;
      if (!acc[boss]) acc[boss] = {};
      if (!acc[boss][key]) acc[boss][key] = [];
      acc[boss][key].push(r);
      return acc;
    },
    {}
  );

  // Sort players within each item by weeksConsecutive desc
  Object.values(byBoss).forEach((items) =>
    Object.values(items).forEach((players) =>
      players.sort((a, b) => b.weeksConsecutive - a.weeksConsecutive)
    )
  );

  const filteredBosses = Object.entries(byBoss)
    .filter(([boss, items]) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        boss.toLowerCase().includes(q) ||
        Object.entries(items).some(
          ([key, players]) =>
            key.toLowerCase().includes(q) ||
            players.some((p) => p.player.charName.toLowerCase().includes(q))
        )
      );
    })
    .sort(([aBoss, aItems], [bBoss, bItems]) => {
      // Try itemId lookup first (reliable), fall back to boss name lookup
      const firstItemA = Object.values(aItems)[0]?.[0]?.itemId;
      const firstItemB = Object.values(bItems)[0]?.[0]?.itemId;
      const ao = (firstItemA ? itemBossMap[firstItemA] : undefined) ?? bossOrder[aBoss] ?? 999;
      const bo = (firstItemB ? itemBossMap[firstItemB] : undefined) ?? bossOrder[bBoss] ?? 999;
      return ao !== bo ? ao - bo : aBoss.localeCompare(bBoss);
    });

  const totalItems   = Object.values(byBoss).reduce((s, items) => s + Object.keys(items).length, 0);
  const totalPlayers = new Set(nightReserves.map((r) => r.player.charName)).size;

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
            Raid Week
          </label>
          <select
            value={selectedWeekId ?? ""}
            onChange={(e) => setSelectedWeekId(Number(e.target.value))}
            className="field w-full sm:w-auto sm:min-w-56"
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

        <div className="flex flex-col gap-1 flex-1 min-w-40">
          <label className="text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
            Search item / player / boss
          </label>
          <input
            className="field"
            placeholder="e.g. cloak, feckful, garrosh…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Night tabs */}
      <div className="tab-underline-bar">
        {([1, 2] as const).map((night) => (
          <button
            key={night}
            onClick={() => setActiveNight(night)}
            disabled={!hasNight(night)}
            className={`tab-underline ${activeNight === night ? "active" : ""}`}
          >
            Night {night}
          </button>
        ))}

        {!loading && nightReserves.length > 0 && (
          <span className="ml-auto self-center text-xs text-[--color-text-muted] pr-1">
            {totalItems} items · {totalPlayers} players
          </span>
        )}
      </div>

      {/* Roll range legend */}
      <div className="flex flex-wrap gap-1.5">
        {ROLL_RANGE_LABELS.map((label, i) => (
          <span key={i} className={`rounded border px-2 py-0.5 text-xs ${ROLL_RANGE_COLORS[i]}`}>
            Wk {i + 1}: {label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-[--color-text-muted] animate-pulse text-sm">
          Loading reserves…
        </div>
      ) : filteredBosses.length === 0 ? (
        <div className="empty-state">
          {search ? "No matches." : "No reserves for this night."}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredBosses.map(([boss, items]) => (
            <div key={boss}>
              {/* Boss header */}
              <h2 className="text-sm font-bold text-[--color-gold] border-b border-[--color-border] pb-2 mb-3 flex items-center gap-2">
                {boss}
                <span className="text-xs font-normal text-[--color-text-muted]">
                  {Object.keys(items).length} item{Object.keys(items).length !== 1 ? "s" : ""}
                </span>
              </h2>

              <div className="space-y-3">
                {Object.entries(items).map(([itemKey, players]) => {
                  const [itemId, itemName] = itemKey.split("::");
                  const topStack = players[0]?.weeksConsecutive ?? 1;
                  return (
                    <div
                      key={itemKey}
                      className="bg-[--color-surface] border border-[--color-border] rounded-lg overflow-hidden"
                    >
                      {/* Item header row */}
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[--color-border] bg-[--color-surface-2]">
                        <a
                          href={getWowheadItemUrl(itemId, players[0]?.raid.instance)}
                          data-wowhead={getWowheadDataAttr(itemId, players[0]?.raid.instance)}
                          target="_blank"
                          rel="noreferrer"
                          className="item-link font-semibold text-sm flex-1"
                        >
                          {itemName}
                        </a>
                        <span className="text-xs text-[--color-text-muted]">
                          {players.length} SR{players.length !== 1 ? "s" : ""}
                        </span>
                        {topStack >= 3 && (
                          <span className={`text-xs rounded border px-1.5 py-0.5 ${ROLL_RANGE_COLORS[topStack - 1]}`}>
                            top: wk {topStack}
                          </span>
                        )}
                      </div>

                      {/* Players list */}
                      <div className="divide-y divide-[--color-border]">
                        {players.map((r) => {
                          const classColor = CLASS_COLORS[r.player.class ?? ""] ?? "#e2e0d8";
                          const rangeColor = getRollRangeColorClass(r.rollRange.week);
                          return (
                            <div
                              key={r.id}
                              className="flex items-center gap-3 px-4 py-2 text-sm"
                            >
                              {/* Rank dot — highlights top stacker(s) */}
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  r.weeksConsecutive === topStack && topStack > 1
                                    ? "bg-[--color-gold]"
                                    : "bg-[--color-border]"
                                }`}
                              />

                              {/* Player name */}
                              <span
                                className="font-medium w-28 shrink-0 truncate capitalize"
                                style={{ color: classColor }}
                              >
                                {r.player.charName}
                              </span>

                              {/* Class / spec */}
                              <span className="text-xs flex-1 truncate" style={{ color: classColor }}>
                                {r.player.class ?? ""}
                                {r.player.spec ? <span className="text-[--color-text-muted]"> · {r.player.spec}</span> : ""}
                              </span>

                              {/* Weeks stacked */}
                              <span className="text-xs text-[--color-text-muted] w-14 text-right shrink-0">
                                {r.weeksConsecutive === 6 ? (
                                  <span className="text-amber-400 font-medium">6 wks ★</span>
                                ) : (
                                  `${r.weeksConsecutive} wk${r.weeksConsecutive !== 1 ? "s" : ""}`
                                )}
                              </span>

                              {/* Roll range badge */}
                              <span
                                className={`rounded border px-2 py-0.5 text-xs font-mono w-20 text-center shrink-0 ${rangeColor}`}
                              >
                                {r.rollRange.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
