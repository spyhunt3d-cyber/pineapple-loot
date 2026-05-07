"use client";

import { useState } from "react";
import { Raid, RaidWeek } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { CLASS_COLORS, getWowheadItemUrl, getWowheadDataAttr } from "@/lib/wow-constants";

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
  const selectedRaid = raids.find(r => String(r.id) === selectedRaidId) ?? null;
  const [softresId, setSoftresId] = useState<string>("");
  const [data, setData] = useState<SoftresResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setData(await res.json());
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
      if (raid) { setSoftresId(raid.softresId); loadReserves(raid.softresId); }
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {raids.length > 0 && (
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted] mb-1.5">
              Select a raid night
            </label>
            <select
              value={selectedRaidId}
              onChange={(e) => handleRaidSelect(e.target.value)}
              className="field"
            >
              <option value="">— Choose a raid —</option>
              {raids.filter(r => !r.softresId.startsWith("n2-")).map((raid) => (
                <option key={raid.id} value={String(raid.id)}>
                  Night {raid.night} — {raid.instance} — {formatDate(raid.raidDate)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted] mb-1.5">
            Or enter a Softres.it raid ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. tu8jdg"
              value={softresId}
              onChange={(e) => setSoftresId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadReserves(softresId)}
              className="field"
            />
            <button
              onClick={() => loadReserves(softresId)}
              disabled={loading || !softresId.trim()}
              className="btn-gold"
            >
              Load
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-[--color-text-muted] animate-pulse text-sm">
          Loading reserves from Softres.it…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-[--color-text-muted]">
            {data.entries.length} player{data.entries.length !== 1 ? "s" : ""} with reserves
          </p>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Spec</th>
                  <th>Reserve 1</th>
                  <th>Reserve 2</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, idx) => {
                  const classColor = CLASS_COLORS[entry.class] ?? "#e2e0d8";
                  return (
                    <tr key={idx}>
                      <td className="font-medium" style={{ color: classColor }}>
                        {entry.name}
                      </td>
                      <td className="muted text-xs" style={{ color: classColor }}>
                        {entry.specName}
                      </td>
                      {[0, 1].map((slotIdx) => {
                        const item = entry.itemsResolved[slotIdx];
                        return (
                          <td key={slotIdx}>
                            {item ? (
                              <a
                                href={getWowheadItemUrl(item.id, selectedRaid?.instance)}
                                data-wowhead={getWowheadDataAttr(item.id, selectedRaid?.instance)}
                                className="item-link"
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
        <div className="empty-state">
          Select a raid or enter a Softres ID to view reserves.
        </div>
      )}
    </div>
  );
}
