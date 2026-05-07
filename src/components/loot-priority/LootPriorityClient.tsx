"use client";

import { useState } from "react";
import { LootPriority } from "@prisma/client";
import { CLASS_COLORS, ALL_CLASSES, CLASS_SPECS } from "@/lib/wow-constants";

interface Props {
  priorities: LootPriority[];
  instances: string[];
}

const TIER_STYLES: Record<number, { dot: string; badge: string }> = {
  1: { dot: "bg-amber-400", badge: "bg-amber-900/40 text-amber-300 border-amber-700" },
  2: { dot: "bg-zinc-400",  badge: "bg-zinc-800/40 text-zinc-300 border-zinc-600"  },
  3: { dot: "bg-amber-800", badge: "bg-amber-950/40 text-amber-700 border-amber-900" },
};

export function LootPriorityClient({ priorities, instances }: Props) {
  const [classFilter, setClassFilter] = useState<string>("");
  const [specFilter, setSpecFilter] = useState<string>("");
  const [instanceFilter, setInstanceFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const specs = classFilter ? CLASS_SPECS[classFilter] ?? [] : [];

  const filtered = priorities.filter((p) => {
    if (classFilter && p.class !== classFilter && p.class !== "*") return false;
    if (specFilter && p.spec !== specFilter && p.spec !== "*") return false;
    if (instanceFilter && p.instance !== instanceFilter) return false;
    if (search && !p.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by boss for display
  const byBoss = filtered.reduce<Record<string, LootPriority[]>>((acc, p) => {
    const key = p.bossName || "Unknown Boss";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-gold] w-48"
        />

        {instances.length > 0 && (
          <select
            value={instanceFilter}
            onChange={(e) => setInstanceFilter(e.target.value)}
            className="rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
          >
            <option value="">All Instances</option>
            {instances.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        )}

        <select
          value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value); setSpecFilter(""); }}
          className="rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
        >
          <option value="">All Classes</option>
          {ALL_CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {specs.length > 0 && (
          <select
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
          >
            <option value="">All Specs</option>
            {specs.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {(classFilter || specFilter || instanceFilter || search) && (
          <button
            onClick={() => { setClassFilter(""); setSpecFilter(""); setInstanceFilter(""); setSearch(""); }}
            className="text-sm text-[--color-text-muted] hover:text-[--color-text] underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[--color-text-muted]">No items match your filters.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(byBoss).map(([boss, items]) => (
            <div key={boss}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[--color-text-muted] border-b border-[--color-border] pb-1">
                {boss}
              </h2>
              <div className="overflow-hidden rounded-lg border border-[--color-border]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--color-border] bg-[--color-surface-2]">
                      <th className="px-4 py-2 text-left font-medium text-[--color-text-muted]">Item</th>
                      <th className="px-4 py-2 text-left font-medium text-[--color-text-muted]">Class</th>
                      <th className="px-4 py-2 text-left font-medium text-[--color-text-muted]">Spec</th>
                      <th className="px-4 py-2 text-left font-medium text-[--color-text-muted] w-24">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--color-border]">
                    {items.map((p) => {
                      const classColor = CLASS_COLORS[p.class] ?? "#e2e0d8";
                      const tierStyle = TIER_STYLES[p.priorityTier] ?? TIER_STYLES[3];
                      return (
                        <tr key={p.id} className="bg-[--color-surface] hover:bg-[--color-surface-2] transition-colors">
                          <td className="px-4 py-2">
                            <a
                              href={`https://www.wowhead.com/item=${p.itemId}`}
                              data-wowhead={`item=${p.itemId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[--color-gold-light] hover:underline"
                            >
                              {p.itemName}
                            </a>
                          </td>
                          <td className="px-4 py-2 font-medium" style={{ color: classColor }}>
                            {p.class === "*" ? "All" : p.class}
                          </td>
                          <td className="px-4 py-2 text-[--color-text-muted]">
                            {p.spec === "*" ? "All" : p.spec}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs w-fit ${tierStyle.badge}`}>
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
