"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { CLASS_COLORS, classCanUseItemType } from "@/lib/wow-constants";

interface Player { id: number; charName: string; server: string; class: string | null; spec: string | null }
interface Raid   { id: number; softresId: string; instance: string; night: number; raidDate: string }
interface RaidLootItem {
  id: number;
  itemId: string;
  itemName: string;
  instance: string;
  bossName: string;
  itemSlot: string | null;
  itemType: string | null;
  ilvl: number | null;
  stats: Record<string, boolean> | null;
}

const WIN_TYPES = ["PRIO", "MS", "SR", "OS", "DE", "TMOG"] as const;
const BLANK = { playerId: "", raidId: "", itemId: "", itemName: "", bossName: "", winType: "MS" as string };

const CLASS_STATS: Record<string, string[]> = {
  "warrior":      ["str"],
  "death knight": ["str"],
  "paladin":      ["str", "int"],
  "rogue":        ["agi"],
  "hunter":       ["agi"],
  "monk":         ["agi", "int"],
  "shaman":       ["agi", "int"],
  "druid":        ["str", "agi", "int"],
  "mage":         ["int"],
  "warlock":      ["int"],
  "priest":       ["int"],
  "evoker":       ["int"],
};
const PRIMARY_STATS = ["str", "agi", "int"];

function isItemRelevantForClass(stats: Record<string, boolean> | null, playerClass: string | null): boolean {
  if (!playerClass) return true;
  if (!stats) return true;
  const classStats = CLASS_STATS[playerClass.toLowerCase()];
  if (!classStats) return true;
  const itemPrimaries = PRIMARY_STATS.filter(s => stats[s]);
  if (itemPrimaries.length === 0) return true; // ring/neck/trinket — show to all
  return itemPrimaries.some(s => classStats.includes(s));
}

export default function LootWinsPage() {
  const [players, setPlayers]     = useState<Player[]>([]);
  const [raids, setRaids]         = useState<Raid[]>([]);
  const [allItems, setAllItems]   = useState<RaidLootItem[]>([]);
  const [form, setForm]           = useState(BLANK);
  const [saving, setSaving]       = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [itemSearch, setItemSearch]     = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/players?active=all").then(r => r.json()),
      fetch("/api/raids").then(r => r.json()),
    ]).then(([p, r]) => {
      setPlayers(p.players ?? []);
      setRaids(r.raids ?? []);
    });
  }, []);

  // Load all loot items once (all instances) for class filtering
  useEffect(() => {
    fetch("/api/raid-loot").then(r => r.json()).then(d => setAllItems(d.items ?? []));
  }, []);

  // Clear item selection when player or raid changes
  const prevPlayerRaid = useMemo(() => `${form.playerId}|${form.raidId}`, [form.playerId, form.raidId]);
  useEffect(() => {
    setForm(f => ({ ...f, itemId: "", itemName: "", bossName: "" }));
    setItemSearch("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevPlayerRaid]);

  const selectedPlayer = useMemo(
    () => players.find(p => String(p.id) === form.playerId) ?? null,
    [players, form.playerId]
  );

  const selectedRaid = useMemo(
    () => raids.find(r => String(r.id) === form.raidId) ?? null,
    [raids, form.raidId]
  );

  const filteredPlayers = players.filter(p =>
    !playerSearch || p.charName.toLowerCase().includes(playerSearch.toLowerCase())
  );

  // Items filtered by: class relevance + armor type + optionally by selected raid's instance
  const classFilteredItems = useMemo(() => {
    let items = allItems;
    if (selectedRaid) items = items.filter(i => i.instance === selectedRaid.instance);
    const playerClass = selectedPlayer?.class ?? null;
    return items.filter(i =>
      isItemRelevantForClass(i.stats as Record<string, boolean> | null, playerClass) &&
      classCanUseItemType(playerClass ?? "", i.itemType)
    );
  }, [allItems, selectedPlayer, selectedRaid]);

  const visibleItems = useMemo(() => {
    if (!itemSearch) return classFilteredItems;
    const q = itemSearch.toLowerCase();
    return classFilteredItems.filter(
      i => i.itemName.toLowerCase().includes(q) || i.bossName.toLowerCase().includes(q) || i.instance.toLowerCase().includes(q)
    );
  }, [classFilteredItems, itemSearch]);

  function handleItemSelect(itemId: string) {
    const item = allItems.find(i => i.itemId === itemId);
    if (!item) { setForm(f => ({ ...f, itemId: "", itemName: "", bossName: "" })); return; }
    setForm(f => ({ ...f, itemId: item.itemId, itemName: item.itemName, bossName: item.bossName }));
  }

  async function handleSave() {
    if (!form.playerId || !form.raidId || !form.itemId || !form.itemName) {
      toast.error("Player, raid, and item are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/loot-wins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: parseInt(form.playerId, 10),
          raidId:   parseInt(form.raidId, 10),
          itemId:   form.itemId.trim(),
          itemName: form.itemName.trim(),
          bossName: form.bossName.trim() || "Unknown",
          winType:  form.winType,
        }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "Failed to save"); return; }
      toast.success("Loot win recorded");
      setForm(BLANK);
      setPlayerSearch("");
      setItemSearch("");
    } finally {
      setSaving(false);
    }
  }

  const hasLootData = allItems.length > 0;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="page-header">
        <h1 className="page-title">Record Loot Win</h1>
        <p className="page-subtitle">Manually record a loot win for a player. Gargul CSV import is faster for bulk entries.</p>
      </div>

      <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-6 space-y-5">
        {/* Player */}
        <div>
          <label className="block text-xs text-[--color-text-muted] mb-1.5">Player <span className="text-red-400">*</span></label>
          <input
            type="text"
            placeholder="Search players…"
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            className="field mb-2"
          />
          <select
            value={form.playerId}
            onChange={e => setForm(f => ({ ...f, playerId: e.target.value }))}
            className="field"
            size={5}
          >
            <option value="">— Select player —</option>
            {filteredPlayers.map(p => (
              <option key={p.id} value={String(p.id)}>
                {p.charName} ({p.class ?? "?"}) — {p.server}
              </option>
            ))}
          </select>
          {selectedPlayer && (
            <div className="mt-1.5 flex items-center gap-2 text-sm">
              <span className="font-semibold" style={{ color: CLASS_COLORS[selectedPlayer.class ?? ""] ?? "#e2e0d8" }}>
                {selectedPlayer.charName}
              </span>
              {selectedPlayer.class && (
                <span className="text-xs px-1.5 py-0.5 rounded border border-[--color-border]"
                  style={{ color: CLASS_COLORS[selectedPlayer.class] ?? "#e2e0d8" }}>
                  {selectedPlayer.class}{selectedPlayer.spec ? ` · ${selectedPlayer.spec}` : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Raid */}
        <div>
          <label className="block text-xs text-[--color-text-muted] mb-1.5">Raid Night <span className="text-red-400">*</span></label>
          <select
            value={form.raidId}
            onChange={e => setForm(f => ({ ...f, raidId: e.target.value }))}
            className="field"
          >
            <option value="">— Select raid —</option>
            {raids.map(r => (
              <option key={r.id} value={String(r.id)}>
                Night {r.night} — {r.instance} ({new Date(r.raidDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {/* Item */}
        <div>
          <label className="block text-xs text-[--color-text-muted] mb-1.5">
            Item <span className="text-red-400">*</span>
            {hasLootData && selectedPlayer?.class && (
              <span className="ml-2 text-[--color-gold]">
                — {selectedPlayer.class} ({visibleItems.length} item{visibleItems.length !== 1 ? "s" : ""}
                {selectedRaid ? ` · ${selectedRaid.instance}` : ""})
              </span>
            )}
            {hasLootData && selectedPlayer && !selectedPlayer.class && (
              <span className="ml-2 text-amber-400">— class unknown, showing all ({visibleItems.length})</span>
            )}
            {hasLootData && !selectedPlayer && (
              <span className="ml-2 text-[--color-text-muted]">— select a player to filter by class</span>
            )}
          </label>

          {hasLootData ? (
            <>
              <input
                type="text"
                placeholder={`Search items${!selectedPlayer ? " (select a player first)" : ""}…`}
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                className="field mb-2"
              />
              <select
                value={form.itemId}
                onChange={e => handleItemSelect(e.target.value)}
                className="field"
                size={7}
              >
                <option value="">— Select item —</option>
                {visibleItems.map(item => (
                  <option key={`${item.itemId}-${item.instance}`} value={item.itemId}>
                    [{item.ilvl ?? "?"}] {item.itemName} — {item.bossName}{!selectedRaid ? ` (${item.instance})` : ""}
                  </option>
                ))}
              </select>
              {form.itemId && (
                <div className="mt-2 text-xs text-[--color-text-muted] space-y-0.5">
                  <div>ID: <span className="text-[--color-text]">{form.itemId}</span></div>
                  <div>Boss: <span className="text-[--color-text]">{form.bossName}</span></div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[--color-text-muted] mb-1.5">Item ID</label>
                <input type="text" placeholder="e.g. 75274" value={form.itemId}
                  onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} className="field" />
              </div>
              <div>
                <label className="block text-xs text-[--color-text-muted] mb-1.5">Item Name</label>
                <input type="text" placeholder="e.g. Gurthalak" value={form.itemName}
                  onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} className="field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-[--color-text-muted] mb-1.5">Boss</label>
                <input type="text" placeholder="e.g. Deathwing" value={form.bossName}
                  onChange={e => setForm(f => ({ ...f, bossName: e.target.value }))} className="field" />
              </div>
            </div>
          )}
        </div>

        {/* Win Type */}
        <div>
          <label className="block text-xs text-[--color-text-muted] mb-1.5">Win Type</label>
          <select value={form.winType} onChange={e => setForm(f => ({ ...f, winType: e.target.value }))} className="field">
            {WIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !form.playerId || !form.raidId || !form.itemId || !form.itemName}
          className="btn-gold-solid"
        >
          {saving ? "Saving…" : "Record Win"}
        </button>
      </div>
    </div>
  );
}
