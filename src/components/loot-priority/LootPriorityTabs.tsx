"use client";

import { useState, useEffect } from "react";
import { getWowheadItemUrl, getWowheadDataAttr, RAID_TIER_GROUPS } from "@/lib/wow-constants";
import { PriorityChainDisplay } from "./PriorityChainDisplay";

// Flat ordered list of instance names derived from phase order
const INSTANCE_PHASE_ORDER: string[] = RAID_TIER_GROUPS.flatMap((g) => g.instances);

function sortInstances(instances: string[]): string[] {
  return [...instances].sort((a, b) => {
    const ai = INSTANCE_PHASE_ORDER.indexOf(a);
    const bi = INSTANCE_PHASE_ORDER.indexOf(b);
    // Known instances sort by phase order; unknowns go to the end alphabetically
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

type PrioEntry = { class: string; spec: string };
type PrioChain = PrioEntry[][];
type SortCol = "ilvl" | "item" | "slot" | "priority" | "notes";

// Common WoW class abbreviations → full class name
const CLASS_ALIASES: Record<string, string> = {
  dk:      "death knight",
  dh:      "demon hunter",
  druid:   "druid",
  evoker:  "evoker",
  hunt:    "hunter",
  hunter:  "hunter",
  mage:    "mage",
  monk:    "monk",
  pala:    "paladin",
  pally:   "paladin",
  paladin: "paladin",
  priest:  "priest",
  rogue:   "rogue",
  sham:    "shaman",
  shaman:  "shaman",
  lock:    "warlock",
  warlock: "warlock",
  war:     "warrior",
  warrior: "warrior",
};

function expandQuery(q: string): string {
  return CLASS_ALIASES[q] ?? q;
}

interface RaidLootItem {
  id: number;
  itemId: string;
  itemName: string;
  instance: string;
  bossName: string;
  itemSlot: string | null;
  ilvl: number | null;
  priorityChain: unknown;
  notes: string | null;
}

function SortHeader({ col, label, sortBy, sortDir, onSort, className }: {
  col: SortCol; label: string; sortBy: SortCol; sortDir: "asc" | "desc";
  onSort: (col: SortCol) => void; className?: string;
}) {
  const active = sortBy === col;
  return (
    <th className={className}>
      <button
        onClick={() => onSort(col)}
        className="flex items-center gap-1 hover:text-[--color-gold] transition-colors uppercase tracking-wide text-[10px] font-semibold w-full"
      >
        {label}
        <span className={`text-[10px] ${active ? "text-[--color-gold]" : "opacity-30"}`}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

export function LootPriorityTabs({ items }: { items: RaidLootItem[] }) {
  const instances = sortInstances([...new Set(items.map((i) => i.instance))]);
  const [activeTab, setActiveTab] = useState(instances[0] ?? "");
  const [sortBy,  setSortBy]  = useState<SortCol>("ilvl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch]   = useState("");

  function toggleSort(col: SortCol) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir(col === "ilvl" ? "desc" : "asc"); }
  }

  function sortVal(item: RaidLootItem): string | number {
    if (sortBy === "ilvl")     return item.ilvl ?? 0;
    if (sortBy === "item")     return item.itemName.toLowerCase();
    if (sortBy === "slot")     return (item.itemSlot ?? "").toLowerCase();
    if (sortBy === "priority") {
      const chain = item.priorityChain as PrioChain | null;
      return chain?.[0]?.map(e => e.class).join("") ?? "";
    }
    if (sortBy === "notes") return (item.notes ?? "").toLowerCase();
    return "";
  }

  // Re-run Wowhead link processing after search filters change the visible items
  useEffect(() => {
    const id = setTimeout(() => {
      const wh = (window as unknown as Record<string, unknown>)["WH"] as { Tooltips?: { refreshLinks?: () => void } } | undefined;
      wh?.Tooltips?.refreshLinks?.();
    }, 50);
    return () => clearTimeout(id);
  }, [search, activeTab]);

  const q  = search.trim().toLowerCase();
  const eq = expandQuery(q); // expanded form, e.g. "dk" → "death knight"

  function matchesSearch(item: RaidLootItem): boolean {
    if (!q) return true;
    if (item.itemName.toLowerCase().includes(q)) return true;
    if ((item.itemSlot ?? "").toLowerCase().includes(q)) return true;
    const chain = item.priorityChain as PrioChain | null;
    const classMatch = (cls: string) => {
      const c = cls.toLowerCase();
      return c.includes(q) || c.includes(eq);
    };
    if (chain?.some((tier) => tier.some((e) => classMatch(e.class)))) return true;
    return false;
  }

  const instItems = items.filter((i) => i.instance === activeTab && matchesSearch(i));
  const bosses = [...new Set(items.filter((i) => i.instance === activeTab).map((i) => i.bossName))];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {instances.map((inst) => (
          <button key={inst} onClick={() => setActiveTab(inst)} className={`btn-tab ${activeTab === inst ? "active" : ""}`}>
            {inst}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <input
          type="text"
          placeholder="Search by name, slot, or class…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field w-full pr-8"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[--color-text-muted] hover:text-[--color-text] leading-none"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="space-y-6">
        {instItems.length === 0 && q ? (
          <div className="empty-state">No items match &ldquo;{search}&rdquo;.</div>
        ) : bosses.filter((boss) => instItems.some((i) => i.bossName === boss)).map((boss) => {
          const bossItems = instItems
            .filter((i) => i.bossName === boss)
            .slice()
            .sort((a, b) => {
              const av = sortVal(a);
              const bv = sortVal(b);
              const cmp = typeof av === "number" && typeof bv === "number"
                ? av - bv
                : String(av).localeCompare(String(bv));
              return sortDir === "asc" ? cmp : -cmp;
            });

          return (
            <div key={boss}>
              <h3 className="section-label border-b border-[--color-border] pb-2 mb-3">
                {boss || "Unknown Boss"}
              </h3>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <SortHeader col="ilvl"     label="iLvl"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="w-12" />
                      <SortHeader col="item"     label="Item"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                      <SortHeader col="slot"     label="Slot"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                      <SortHeader col="priority" label="Priority" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                      <SortHeader col="notes"    label="Notes"    sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {bossItems.map((item) => (
                      <tr key={item.id}>
                        <td className="muted text-center">{item.ilvl ?? "—"}</td>
                        <td>
                          <a href={getWowheadItemUrl(item.itemId, item.instance)}
                            data-wowhead={getWowheadDataAttr(item.itemId, item.instance)}
                            target="_blank" rel="noreferrer" className="item-link font-medium">
                            {item.itemName}
                          </a>
                        </td>
                        <td className="muted">{item.itemSlot ?? "—"}</td>
                        <td><PriorityChainDisplay chain={item.priorityChain as PrioChain | null} /></td>
                        <td className="muted text-xs whitespace-pre-wrap">{item.notes ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

