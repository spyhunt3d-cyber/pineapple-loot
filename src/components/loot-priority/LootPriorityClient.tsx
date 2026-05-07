"use client";

import { useState } from "react";
import { LootPriority } from "@prisma/client";
import { CLASS_COLORS, ALL_CLASSES, CLASS_SPECS, getWowheadItemUrl, getWowheadDataAttr } from "@/lib/wow-constants";

interface Props {
  priorities: LootPriority[];
  instances: string[];
}

const TIER_STYLES: Record<number, { dot: string; badge: string }> = {
  1: { dot: "bg-amber-400",  badge: "bg-amber-900/40 text-amber-300 border-amber-700"  },
  2: { dot: "bg-zinc-400",   badge: "bg-zinc-800/40 text-zinc-300 border-zinc-600"    },
  3: { dot: "bg-amber-800",  badge: "bg-amber-950/40 text-amber-700 border-amber-900" },
};

export function LootPriorityClient({ priorities, instances }: Props) {
  const [classFilter, setClassFilter]       = useState<string>("");
  const [specFilter, setSpecFilter]         = useState<string>("");
  const [instanceFilter, setInstanceFilter] = useState<string>("");
  const [search, setSearch]                 = useState<string>("");

  const specs = classFilter ? CLASS_SPECS[classFilter] ?? [] : [];

  const filtered = priorities.filter((p) => {
    if (classFilter    && p.class    !== classFilter    && p.class !== "*") return false;
    if (specFilter     && p.spec     !== specFilter     && p.spec  !== "*") return false;
    if (instanceFilter && p.instance !== instanceFilter)                     return false;
    if (search && !p.itemName.toLowerCase().includes(search.toLowerCase()))  return false;
    return true;
  });

  const byBoss = filtered.reduce<Record<string, LootPriority[]>>((acc, p) => {
    const key = p.bossName || "Unknown Boss";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const hasFilters = !!(classFilter || specFilter || instanceFilter || search);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end">
        <div className="col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted] mb-1.5">
            Search
          </label>
          <input
            type="text"
            placeholder="Item name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field w-full sm:w-48"
          />
        </div>

        {instances.length > 0 && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted] mb-1.5">
              Instance
            </label>
            <select
              value={instanceFilter}
              onChange={(e) => setInstanceFilter(e.target.value)}
              className="field w-auto"
            >
              <option value="">All Instances</option>
              {instances.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted] mb-1.5">
            Class
          </label>
          <select
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setSpecFilter(""); }}
            className="field w-auto"
          >
            <option value="">All Classes</option>
            {ALL_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {specs.length > 0 && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted] mb-1.5">
              Spec
            </label>
            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className="field w-auto"
            >
              <option value="">All Specs</option>
              {specs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {hasFilters && (
          <button
            onClick={() => { setClassFilter(""); setSpecFilter(""); setInstanceFilter(""); setSearch(""); }}
            className="text-xs text-[--color-text-muted] hover:text-[--color-text] underline self-end pb-0.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No items match your filters.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byBoss).map(([boss, items]) => (
            <div key={boss}>
              <h2 className="section-label border-b border-[--color-border] pb-2 mb-3">
                {boss}
              </h2>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Class</th>
                      <th>Spec</th>
                      <th className="w-24">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => {
                      const classColor = CLASS_COLORS[p.class] ?? "#e2e0d8";
                      const tierStyle  = TIER_STYLES[p.priorityTier] ?? TIER_STYLES[3];
                      return (
                        <tr key={p.id}>
                          <td>
                            <a
                              href={getWowheadItemUrl(p.itemId, p.instance)}
                              data-wowhead={getWowheadDataAttr(p.itemId, p.instance)}
                              target="_blank"
                              rel="noreferrer"
                              className="item-link"
                            >
                              {p.itemName}
                            </a>
                          </td>
                          <td className="font-medium" style={{ color: p.class === "*" ? undefined : classColor }}>
                            {p.class === "*" ? <span className="muted">All</span> : p.class}
                          </td>
                          <td className="muted">
                            {p.spec === "*" ? "All" : p.spec}
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs w-fit ${tierStyle.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${tierStyle.dot}`} />
                              T{p.priorityTier}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
