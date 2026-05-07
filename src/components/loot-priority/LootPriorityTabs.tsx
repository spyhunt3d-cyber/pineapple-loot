"use client";

import { useState } from "react";
import { getWowheadItemUrl, getWowheadDataAttr } from "@/lib/wow-constants";
import { PriorityChainDisplay } from "./PriorityChainDisplay";

type PrioEntry = { class: string; spec: string };
type PrioChain = PrioEntry[][];
type SortCol = "ilvl" | "item" | "slot" | "priority" | "notes";

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
  const instances = [...new Set(items.map((i) => i.instance))];
  const [activeTab, setActiveTab] = useState(instances[0] ?? "");
  const [sortBy,  setSortBy]  = useState<SortCol>("ilvl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  const instItems = items.filter((i) => i.instance === activeTab);
  const bosses = [...new Set(instItems.map((i) => i.bossName))];

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

      {/* Tab content */}
      <div className="space-y-6">
        {bosses.map((boss) => {
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
