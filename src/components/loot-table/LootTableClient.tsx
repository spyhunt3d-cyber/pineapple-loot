"use client";

import { useState } from "react";
import { Raid, RaidWeek } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { CLASS_COLORS } from "@/lib/wow-constants";
import { getRollRange, getRollRangeColorClass } from "@/lib/roll-calculator";

type RaidWithWeek = Raid & { week: RaidWeek };

interface ReserveEntry {
  name: string;
  class: string;
  specName: string;
  itemsResolved: { id: string; name: string }[];
}

interface SoftresResponse {
  raidId: string;
  entries: ReserveEntry[];
  itemNames: Record<string, string>;
}

interface Props {
  raids: RaidWithWeek[];
}

export function LootTableClient({ raids }: Props) {
  const [selectedRaidId, setSelectedRaidId] = useState<string>("");
  const [softresId, setSoftresId] = useState<string>("");
  const [data, setData] = useState<SoftresResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reserves for a given softres ID
  async function loadReserves(id: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/softres/${id.trim()}`);
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? "Failed to load");
      }
      const json: SoftresResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleRaidSelect(raidId: string) {
    setSelectedRaidId(raidId);
    if (raidId) {
      const raid = raids.find((r) => String(r.id) === raidId);
      if (raid) {
        setSoftresId(raid.softresId);
        loadReserves(raid.softresId);
      }
    }
  }

  function handleManualLoad() {
    loadReserves(softresId);
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Known raids dropdown */}
        {raids.length > 0 && (
          <div className="flex-1">
            <label className="block text-sm text-[--color-text-muted] mb-1">
              Select a raid night
            </label>
            <select
              value={selectedRaidId}
              onChange={(e) => handleRaidSelect(e.target.value)}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
            >
              <option value="">— Choose a raid —</option>
              {raids.map((raid) => (
                <option key={raid.id} value={String(raid.id)}>
                  Night {raid.night} — {raid.instance} — {formatDate(raid.raidDate)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Manual Softres ID input */}
        <div className="flex-1">
          <label className="block text-sm text-[--color-text-muted] mb-1">
            Or enter a Softres.it raid ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. tu8jdg"
              value={softresId}
              onChange={(e) => setSoftresId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualLoad()}
              className="flex-1 rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
            />
            <button
              onClick={handleManualLoad}
              disabled={loading || !softresId.trim()}
              className="rounded-md border border-[--color-gold]/50 bg-[--color-gold]/10 px-4 py-2 text-sm text-[--color-gold] hover:bg-[--color-gold]/20 disabled:opacity-40 transition-colors"
            >
              Load
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-16 text-center text-[--color-text-muted] animate-pulse">
          Loading reserves from Softres.it…
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-2">
          <p className="text-sm text-[--color-text-muted]">
            {data.entries.length} player{data.entries.length !== 1 ? "s" : ""} with reserves
          </p>

          <div className="overflow-hidden rounded-lg border border-[--color-border]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--color-border] bg-[--color-surface-2]">
                  <th className="px-4 py-3 text-left font-medium text-[--color-text-muted]">Player</th>
                  <th className="px-4 py-3 text-left font-medium text-[--color-text-muted]">Spec</th>
                  <th className="px-4 py-3 text-left font-medium text-[--color-text-muted]">Reserve 1</th>
                  <th className="px-4 py-3 text-left font-medium text-[--color-text-muted]">Reserve 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-border]">
                {data.entries.map((entry, idx) => {
                  const classColor = CLASS_COLORS[entry.class] ?? "#e2e0d8";
                  return (
                    <tr
                      key={idx}
                      className="bg-[--color-surface] hover:bg-[--color-surface-2] transition-colors"
                    >
                      {/* Player name in class color */}
                      <td className="px-4 py-3 font-medium" style={{ color: classColor }}>
                        {entry.name}
                      </td>

                      {/* Spec */}
                      <td className="px-4 py-3 text-[--color-text-muted]">
                        <span className="text-xs" style={{ color: classColor }}>
                          {entry.specName}
                        </span>
                      </td>

                      {/* Reserve slots — linked to Wowhead */}
                      {[0, 1].map((slotIdx) => {
                        const item = entry.itemsResolved[slotIdx];
                        return (
                          <td key={slotIdx} className="px-4 py-3">
                            {item ? (
                              <a
                                href={`https://www.wowhead.com/item=${item.id}`}
                                data-wowhead={`item=${item.id}`}
                                className="text-[--color-gold-light] hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                {item.name}
                              </a>
                            ) : (
                              <span className="text-[--color-text-muted]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="rounded-lg border border-dashed border-[--color-border] py-16 text-center">
          <p className="text-[--color-text-muted]">Select a raid or enter a Softres ID to view reserves.</p>
        </div>
      )}
    </div>
  );
}
