"use client";

import { useState } from "react";
import { getWowheadItemUrl, getWowheadDataAttr } from "@/lib/wow-constants";
import { PriorityChainDisplay } from "./PriorityChainDisplay";

type PrioEntry = { class: string; spec: string };
type PrioChain = PrioEntry[][];

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

export function LootPriorityTabs({ items }: { items: RaidLootItem[] }) {
  const instances = [...new Set(items.map((i) => i.instance))];
  const [activeTab, setActiveTab] = useState(instances[0] ?? "");

  const instItems = items.filter((i) => i.instance === activeTab);
  const bosses = [...new Set(instItems.map((i) => i.bossName))];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {instances.map((inst) => (
          <button
            key={inst}
            onClick={() => setActiveTab(inst)}
            className={`btn-tab ${activeTab === inst ? "active" : ""}`}
          >
            {inst}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-6">
        {bosses.map((boss) => (
          <div key={boss}>
            <h3 className="section-label border-b border-[--color-border] pb-2 mb-3">
              {boss || "Unknown Boss"}
            </h3>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12">iLvl</th>
                    <th>Item</th>
                    <th>Slot</th>
                    <th>Priority</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {instItems
                    .filter((i) => i.bossName === boss)
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="muted text-center">{item.ilvl ?? "—"}</td>
                        <td>
                          <a
                            href={getWowheadItemUrl(item.itemId, item.instance)}
                            data-wowhead={getWowheadDataAttr(item.itemId, item.instance)}
                            target="_blank"
                            rel="noreferrer"
                            className="item-link font-medium"
                          >
                            {item.itemName}
                          </a>
                        </td>
                        <td className="muted">{item.itemSlot ?? "—"}</td>
                        <td>
                          <PriorityChainDisplay chain={item.priorityChain as PrioChain | null} />
                        </td>
                        <td className="muted text-xs whitespace-pre-wrap">{item.notes ?? ""}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
