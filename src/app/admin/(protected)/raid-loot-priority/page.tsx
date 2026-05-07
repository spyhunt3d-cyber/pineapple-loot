"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RAID_INSTANCE_GROUPS, RAID_TIER_GROUPS, ALL_CLASSES, CLASS_PRIMARY_STATS, CLASS_ABBR, CLASS_COLORS, CLASS_ARMOR_TYPE, classCanUseItemType, slotToType, getWowheadItemUrl, getWowheadDataAttr, getTierTokenClasses } from "@/lib/wow-constants";
import { DriveSheetPicker } from "@/components/drive/DriveSheetPicker";

// ─── Types ────────────────────────────────────────────────────

const STAT_KEYS = ["str","agi","sta","crit","hit","mastery","haste","exp","sockets"] as const;
const STAT_LABELS: Record<string, string> = {
  str:"STR", agi:"AGI", sta:"STA", crit:"CRT", hit:"HIT",
  mastery:"MST", haste:"HST", exp:"EXP", sockets:"⬡",
};
const STAT_TITLES: Record<string, string> = {
  str:"Strength", agi:"Agility", sta:"Stamina", crit:"Critical Strike",
  hit:"Hit", mastery:"Mastery", haste:"Haste", exp:"Expertise", sockets:"Sockets",
};
type StatKey = typeof STAT_KEYS[number];
type Stats = Partial<Record<StatKey, boolean>>;
type PrioEntry = { class: string; spec: "MS" | "OS" | "*" };
type PrioChain = PrioEntry[][];

const ITEM_SLOTS = ["Head","Neck","Shoulder","Back","Chest","Wrist","Hands","Waist","Legs","Feet","Finger","Trinket","One-Hand","Main Hand","Off Hand","Two-Hand","Shield","Ranged","Held In Off-hand","Thrown","Relic","Mount","Pet","Other"];
const ITEM_TYPES = ["Plate","Mail","Leather","Cloth","Trinket","Ring","Neck","Cloak","Weapon","Shield","Token","Mount","Pet","Other"];

interface RaidLootRow {
  id: number;
  itemId: string;
  itemName: string;
  instance: string;
  bossName: string;
  bossOrder: number;
  ilvl: number | null;
  itemSlot: string | null;
  itemType: string | null;
  stats: Stats | null;
  priorityChain: PrioChain | null;
  notes: string | null;
}

// ─── Priority helpers ─────────────────────────────────────────

function chainToString(chain: PrioChain | null): string {
  if (!chain || chain.length === 0) return "";
  return chain.map((tier) =>
    tier.map((e) => `${e.class === "*" ? "All" : (CLASS_ABBR[e.class] ?? e.class)} ${e.spec}`).join(" = ")
  ).join(" > ");
}

function ChainDisplay({ chain }: { chain: PrioChain | null }) {
  if (!chain || chain.length === 0) return <span className="text-[--color-text-muted]/50 italic text-xs">click to set…</span>;
  return (
    <span className="font-mono text-[10px] leading-relaxed">
      {chain.map((tier, ti) => (
        <span key={ti}>
          {ti > 0 && <span className="text-[--color-text-muted] mx-0.5">&gt;</span>}
          {tier.map((e, ei) => {
            const abbr  = e.class === "*" ? "All" : (CLASS_ABBR[e.class] ?? e.class);
            const color = e.class === "*" ? undefined : (CLASS_COLORS[e.class] ?? "#e2e0d8");
            return (
              <span key={ei}>
                {ei > 0 && <span className="text-[--color-text-muted] mx-0.5">=</span>}
                <span style={{ color }} className="font-semibold">{abbr}</span>
                <span className="text-[--color-text-muted]"> {e.spec}</span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

// ─── Priority builder modal ───────────────────────────────────

const PRIMARY_STATS_LIST = ["str", "agi", "int"] as const;

function suggestChain(itemStats: Stats | null, itemType?: string | null, itemName?: string, instance?: string): PrioChain {
  // Tier token: suggest eligible classes only
  if (itemName) {
    const tokenClasses = getTierTokenClasses(itemName, instance);
    if (tokenClasses) {
      return [
        tokenClasses.map(cls => ({ class: cls, spec: "MS" as const })),
        [{ class: "*", spec: "OS" }],
      ];
    }
  }
  if (!itemStats) return [];
  const itemPrimaries = PRIMARY_STATS_LIST.filter(s => itemStats[s as StatKey]);
  if (itemPrimaries.length === 0) {
    return [[{ class: "*", spec: "MS" }], [{ class: "*", spec: "OS" }]];
  }
  const msClasses = Object.entries(CLASS_PRIMARY_STATS)
    .filter(([cls, stats]) =>
      stats.some(s => itemPrimaries.includes(s as "str" | "agi" | "int")) &&
      classCanUseItemType(cls, itemType)
    )
    .map(([cls]) => ({ class: cls, spec: "MS" as const }));
  return [
    msClasses,
    [{ class: "*", spec: "OS" }],
  ];
}

function PriorityBuilder({ chain, onChange, onClose, itemStats, itemType, itemName, instance }: {
  chain: PrioChain;
  onChange: (c: PrioChain) => void;
  onClose: () => void;
  itemStats?: Stats | null;
  itemType?: string | null;
  itemName?: string;
  instance?: string;
}) {
  const [local, setLocal] = useState<PrioChain>(chain.length ? chain : [[]]);

  const addTier    = () => setLocal(c => [...c, []]);
  const removeTier = (ti: number) => setLocal(c => c.filter((_, i) => i !== ti));
  const addEntry   = (ti: number) => setLocal(c => c.map((t, i) => i === ti ? [...t, { class: "*", spec: "MS" as const }] : t));
  const removeEntry = (ti: number, ei: number) => setLocal(c => c.map((t, i) => i === ti ? t.filter((_, j) => j !== ei) : t));
  const updateEntry = (ti: number, ei: number, patch: Partial<PrioEntry>) =>
    setLocal(c => c.map((t, i) => i === ti ? t.map((e, j) => j === ei ? { ...e, ...patch } : e) : t));

  const suggestion = (itemStats || itemName) ? suggestChain(itemStats ?? null, itemType, itemName, instance) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-[--color-border] p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#16171f" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[--color-gold]">Priority Chain</h3>
          <span className="text-xs text-[--color-text-muted]">= tied priority &nbsp;·&nbsp; &gt; lower priority</span>
        </div>

        {/* Suggestion banner */}
        {suggestion && suggestion.length > 0 && (
          <div className="rounded bg-[--color-gold]/10 border border-[--color-gold]/30 px-3 py-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[--color-gold] font-semibold">Suggested based on item stats</p>
              <p className="text-[10px] text-[--color-text-muted] mt-0.5 font-mono">{chainToString(suggestion)}</p>
            </div>
            <button type="button" onClick={() => setLocal(suggestion)} className="text-xs text-[--color-gold] border border-[--color-gold]/40 rounded px-2 py-1 hover:bg-[--color-gold]/10 whitespace-nowrap">
              Use
            </button>
          </div>
        )}

        <div className="rounded bg-[--color-surface-2] border border-[--color-border] px-3 py-2 text-sm font-mono min-h-[2rem]">
          {chainToString(local) || <span className="text-[--color-text-muted] italic">empty</span>}
        </div>

        <div className="space-y-2">
          {local.map((tier, ti) => (
            <div key={ti} className="rounded border border-[--color-border] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[--color-text-muted] uppercase">
                  {ti === 0 ? "Highest Priority" : `Priority ${ti + 1}`}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => addEntry(ti)}
                    className="text-xs text-[--color-gold] hover:underline"
                    title="Add a class at the same priority level (tied with =)"
                  >
                    + Add tied (=)
                  </button>
                  {local.length > 1 && (
                    <button type="button" onClick={() => removeTier(ti)} className="text-xs text-red-400 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              {tier.length === 0 && <p className="text-xs text-[--color-text-muted] italic">Empty — add a class/spec</p>}
              {tier.map((entry, ei) => (
                <div key={ei} className="flex items-center gap-2 flex-wrap">
                  {ei > 0 && (
                    <span className="text-[--color-gold] text-xs font-bold px-1 bg-[--color-gold]/10 rounded">=</span>
                  )}
                  <select value={entry.class} onChange={e => updateEntry(ti, ei, { class: e.target.value })} className="field w-auto text-xs py-1">
                    <option value="*">All Classes</option>
                    {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={entry.spec} onChange={e => updateEntry(ti, ei, { spec: e.target.value as "MS"|"OS"|"*" })} className="field w-auto text-xs py-1">
                    <option value="MS">MS</option>
                    <option value="OS">OS</option>
                    <option value="*">Any</option>
                  </select>
                  <button type="button" onClick={() => removeEntry(ti, ei)} className="text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addTier}
          className="btn-secondary w-full text-xs"
          title="Add a lower priority tier (separated by >)"
        >
          + Add lower tier (&gt;)
        </button>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={() => { onChange(local.filter(t => t.length > 0)); onClose(); }}
            className="btn-gold-solid"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Import panel ────────────────────────────────────────

interface BossGroup { name: string; order: number; itemIds: string; }

function BulkImport({ instance, onImported }: { instance: string; onImported: () => void }) {
  const [loading, setLoading]           = useState(false);
  const [progress, setProgress]         = useState("");
  const [hasStaticData, setHasStaticData] = useState<boolean | null>(null);
  const [softresId, setSoftresId]       = useState("");
  const [mode, setMode]                 = useState<"auto" | "softres" | "manual">("auto");

  // Check for static data and auto-trigger if found
  useEffect(() => {
    if (!instance) return;
    fetch(`/api/raid-loot/populate?instance=${encodeURIComponent(instance)}`)
      .then(r => {
        setHasStaticData(r.ok);
        if (r.ok) setMode("auto");
        else setMode("softres");
      })
      .catch(() => { setHasStaticData(false); setMode("softres"); });
  }, [instance]);

  async function runPopulate(opts: { softresId?: string } = {}) {
    setLoading(true);
    setProgress(opts.softresId ? `Fetching items from Softres ${opts.softresId}…` : `Fetching all loot for ${instance}…`);
    try {
      const res = await fetch("/api/raid-loot/populate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instance, softresId: opts.softresId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to populate"); return; }
      toast.success(`Added ${data.created} items to ${instance}${data.skipped ? ` (${data.skipped} skipped)` : ""}`);
      onImported();
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-[--color-gold]/30 bg-[--color-surface] p-8 text-center space-y-3">
        <p className="text-[--color-gold] animate-pulse font-medium">{progress}</p>
        <p className="text-xs text-[--color-text-muted]">Fetching item names from Wowhead… this may take a minute.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Option 1 — Static data (auto) */}
      {hasStaticData && (
        <div className="rounded-lg border border-[--color-gold]/40 bg-[--color-gold]/5 p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-[--color-gold]">Built-in loot data found for {instance}</p>
            <p className="text-xs text-[--color-text-muted] mt-1">All bosses and items will be populated automatically from the built-in database, names fetched from Wowhead.</p>
          </div>
          <button type="button" onClick={() => runPopulate()} className="btn-gold-solid">
            ⚡ Auto-populate {instance}
          </button>
        </div>
      )}

      {/* Option 2 — Softres import (primary for raids without static data) */}
      <div className={`rounded-lg border p-5 space-y-3 ${!hasStaticData ? "border-[--color-gold]/40 bg-[--color-gold]/5" : "border-[--color-border] bg-[--color-surface]"}`}>
        <div>
          <p className="text-sm font-semibold text-[--color-gold]">
            {!hasStaticData ? "Import from Softres" : "Or import from a Softres raid ID"}
          </p>
          <p className="text-xs text-[--color-text-muted] mt-1">
            Paste a Softres.it raid ID — all reserved items will be fetched and added with names from Wowhead.
            {!hasStaticData && " This is the fastest way to populate loot for any raid."}
          </p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-[--color-text-muted] mb-1">Softres.it Raid ID</label>
            <input
              className="field"
              placeholder="e.g. tu8jdg"
              value={softresId}
              onChange={e => setSoftresId(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => runPopulate({ softresId: softresId.trim() })}
            disabled={!softresId.trim()}
            className="btn-gold-solid disabled:opacity-40"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Spreadsheet table ────────────────────────────────────────

function LootSheet({ items, instance, onUpdate, onDelete, onAddRow }: {
  items: RaidLootRow[];
  instance: string;
  onUpdate: (id: number, patch: Partial<RaidLootRow>) => Promise<void>;
  onDelete: (id: number) => void;
  onAddRow: (bossName: string, bossOrder: number) => void;
}) {
  const [editPrio, setEditPrio]   = useState<number | null>(null);
  const [editNote, setEditNote]   = useState<{ id: number; val: string } | null>(null);

  const editingPrioItem = editPrio !== null ? items.find(r => r.id === editPrio) : null;
  const multiInstance = new Set(items.map(i => i.instance)).size > 1;

  // Group by instance+boss so same boss name in different raids stays separate
  const byBoss = items.reduce<Record<string, RaidLootRow[]>>((acc, item) => {
    const instPrefix = multiInstance ? `${item.instance}||` : "";
    const k = `${instPrefix}${String(item.bossOrder).padStart(4,"0")}__${item.bossName || "Unknown Boss"}`;
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});

  return (
    <>
      <div className="overflow-auto rounded-lg border border-[--color-border]" style={{ maxHeight: "75vh" }}>
        <table className="text-xs w-full" style={{ borderCollapse: "collapse", minWidth: "1200px" }}>
          <thead className="sticky top-0 z-10" style={{ backgroundColor: "#1e1f2a" }}>
            <tr className="border-b-2 border-[--color-border]" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>
              <th className="px-2 py-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide w-12 sticky left-0" style={{ backgroundColor: "#1e1f2a" }}>iLvl</th>
              <th className="px-2 py-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide min-w-[140px]">Boss</th>
              <th className="px-2 py-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide min-w-[200px]">Item</th>
              <th className="px-2 py-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide w-24">Slot</th>
              <th className="px-2 py-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide w-24">Type</th>
              {STAT_KEYS.map(k => (
                <th key={k} className="px-1 py-2 text-center text-[--color-text-muted] font-semibold uppercase w-8 cursor-help" title={STAT_TITLES[k]}>
                  {STAT_LABELS[k]}
                </th>
              ))}
              <th className="px-2 py-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide min-w-[220px]">Priority</th>
              <th className="px-2 py-2 text-left text-[--color-text-muted] font-semibold uppercase tracking-wide min-w-[200px]">Notes</th>
              <th className="w-8 px-1 border-r border-[--color-border]"></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byBoss).map(([key, bossItems], idx) => {
              const parts     = key.includes("||") ? key.split("||") : ["", key];
              const instName  = parts[0];
              const bossKey   = parts[parts.length - 1];
              const bossName  = bossKey.split("__").slice(1).join("__");
              const bossOrder = bossItems[0].bossOrder;
              // Show instance header row when instance changes in multi-instance view
              const prevKey   = Object.keys(byBoss)[idx - 1] ?? "";
              const prevInst  = prevKey.includes("||") ? prevKey.split("||")[0] : "";
              const showInstHeader = multiInstance && instName && instName !== prevInst;
              return (
                <>
                  {showInstHeader && (
                    <tr key={`inst-${instName}`} className="border-t-4 border-[--color-gold]/40">
                      <td colSpan={5 + STAT_KEYS.length + 3} className="px-3 py-2 border-r border-[--color-border]"
                        style={{ backgroundColor: "#1a1b26" }}>
                        <span className="text-sm font-bold text-[--color-gold]">{instName}</span>
                      </td>
                    </tr>
                  )}
                  <tr key={`hdr-${key}`} className="bg-[--color-surface-2]/50 border-t-2 border-[--color-border]">
                    <td colSpan={5 + STAT_KEYS.length + 3} className="px-3 py-1.5 border-r border-[--color-border]">
                      <span className="text-xs font-bold text-[--color-gold]/80 uppercase tracking-wide">{bossName}</span>
                    </td>
                  </tr>
                  {bossItems.map(item => (
                    <tr key={item.id} className="border-b border-[--color-border] bg-[--color-surface] hover:bg-[--color-surface-2]/30 group">
                      {/* iLvl */}
                      <td className="px-1 py-1 sticky left-0 bg-inherit">
                        <input
                          type="number"
                          value={item.ilvl ?? ""}
                          onChange={e => { const v = parseInt(e.target.value); items.find(r => r.id === item.id)!.ilvl = isNaN(v) ? null : v; }}
                          onBlur={e => onUpdate(item.id, { ilvl: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-12 text-center bg-transparent focus:bg-[--color-surface-2] focus:outline-none focus:ring-1 focus:ring-[--color-gold] rounded px-1 text-[--color-text-muted]"
                          placeholder="—"
                        />
                      </td>

                      {/* Boss */}
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          defaultValue={item.bossName}
                          onBlur={e => onUpdate(item.id, { bossName: e.target.value })}
                          className="w-full min-w-[120px] bg-transparent focus:bg-[--color-surface-2] focus:outline-none focus:ring-1 focus:ring-[--color-gold] rounded px-1 text-[--color-text-muted]"
                        />
                      </td>

                      {/* Item name */}
                      <td className="px-2 py-1">
                        <a
                          href={getWowheadItemUrl(item.itemId, instance)}
                          data-wowhead={getWowheadDataAttr(item.itemId, instance)}
                          target="_blank" rel="noreferrer"
                          className="item-link font-medium"
                        >
                          {item.itemName}
                        </a>
                        <span className="ml-1 text-[--color-text-muted] opacity-40">#{item.itemId}</span>
                      </td>

                      {/* Slot */}
                      <td className="px-1 py-1">
                        <select
                          value={item.itemSlot ?? ""}
                          onChange={e => {
                            const slot = e.target.value || null;
                            const derived = slotToType(slot);
                            const patch: Partial<RaidLootRow> = { itemSlot: slot };
                            if (derived && !item.itemType) patch.itemType = derived;
                            onUpdate(item.id, patch);
                          }}
                          className="bg-transparent focus:bg-[--color-surface-2] focus:outline-none focus:ring-1 focus:ring-[--color-gold] rounded text-[--color-text-muted] text-xs w-full cursor-pointer"
                        >
                          <option value="">—</option>
                          {ITEM_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>

                      {/* Type */}
                      <td className="px-1 py-1">
                        <select
                          value={item.itemType ?? ""}
                          onChange={e => onUpdate(item.id, { itemType: e.target.value || null })}
                          className="bg-transparent focus:bg-[--color-surface-2] focus:outline-none focus:ring-1 focus:ring-[--color-gold] rounded text-[--color-text-muted] text-xs w-full cursor-pointer"
                        >
                          <option value="">—</option>
                          {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>

                      {/* Stats */}
                      {STAT_KEYS.map(k => (
                        <td key={k} className="px-0.5 py-1 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[9px] font-bold ${
                            (item.stats as Stats ?? {})[k]
                              ? "bg-[--color-gold]/20 border border-[--color-gold]/50 text-[--color-gold]"
                              : "text-[--color-border]"
                          }`}>
                            {(item.stats as Stats ?? {})[k] ? "✓" : "·"}
                          </span>
                        </td>
                      ))}

                      {/* Priority */}
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          onClick={() => setEditPrio(item.id)}
                          className="text-left w-full hover:text-[--color-gold] transition-colors"
                        >
                          <ChainDisplay chain={item.priorityChain as PrioChain | null} />
                        </button>
                      </td>

                                      {/* Notes */}
                      <td className="px-2 py-1">
                        {editNote?.id === item.id ? (
                          <div className="space-y-1">
                            <textarea
                              value={editNote.val}
                              onChange={e => setEditNote({ id: item.id, val: e.target.value })}
                              rows={3}
                              autoFocus
                              className="w-full bg-[--color-surface-2] border border-[--color-gold]/40 rounded px-1.5 py-1 text-xs text-[--color-text] focus:outline-none resize-none"
                            />
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => { onUpdate(item.id, { notes: editNote.val || null }); setEditNote(null); }}
                                className="text-[10px] bg-[--color-gold]/20 text-[--color-gold] border border-[--color-gold]/40 rounded px-2 py-0.5 hover:bg-[--color-gold]/30"
                              >
                                ✓ Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditNote(null)}
                                className="text-[10px] text-[--color-text-muted] hover:text-[--color-text] px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditNote({ id: item.id, val: item.notes ?? "" })}
                            className="text-left w-full min-h-[1.5rem]"
                          >
                            {item.notes
                              ? <span className="text-[--color-text-muted] whitespace-pre-wrap text-xs leading-relaxed">{item.notes}</span>
                              : <span className="text-[--color-text-muted]/30 italic text-xs">add note…</span>
                            }
                          </button>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="px-1 py-1 text-center border-r border-[--color-border] opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => onDelete(item.id)} className="text-[--color-text-muted] hover:text-red-400 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}

                  {/* Add row to this boss */}
                  <tr key={`add-${key}`} className="border-b border-[--color-border]">
                    <td colSpan={5 + STAT_KEYS.length + 3} className="px-3 py-1">
                      <button
                        type="button"
                        onClick={() => onAddRow(bossName, bossOrder)}
                        className="text-xs text-[--color-text-muted]/50 hover:text-[--color-gold] transition-colors"
                      >
                        + add item to {bossName}
                      </button>
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingPrioItem && (
        <PriorityBuilder
          chain={(editingPrioItem.priorityChain as PrioChain) ?? []}
          onChange={c => onUpdate(editingPrioItem.id, { priorityChain: c })}
          onClose={() => setEditPrio(null)}
          itemStats={editingPrioItem.stats}
          itemType={editingPrioItem.itemType}
          itemName={editingPrioItem.itemName}
          instance={instance}
        />
      )}
    </>
  );
}

// ─── Add single item dialog ───────────────────────────────────

function AddItemDialog({ instance, bossName, bossOrder, onAdd, onClose }: {
  instance: string; bossName: string; bossOrder: number;
  onAdd: (item: Partial<RaidLootRow>) => void; onClose: () => void;
}) {
  const [itemId,   setItemId]   = useState("");
  const [itemName, setItemName] = useState("");
  const [ilvl,     setIlvl]     = useState("");
  const [fetching, setFetching] = useState(false);

  async function fetchWowhead(id: string) {
    if (!id.trim()) return;
    setFetching(true);
    try {
      const r = await fetch(`/api/raid-loot/wowhead?itemId=${id.trim()}`);
      if (r.ok) { const d = await r.json(); if (d.name) setItemName(d.name); if (d.ilvl) setIlvl(String(d.ilvl)); }
    } finally { setFetching(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border border-[--color-border] p-5 space-y-4" style={{ backgroundColor: "#16171f" }} onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-[--color-gold] text-sm">Add Item to {bossName}</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-[--color-text-muted] mb-1">Item ID</label>
            <input autoFocus type="text" placeholder="e.g. 105609" value={itemId}
              onChange={e => setItemId(e.target.value)} onBlur={() => fetchWowhead(itemId)} className="field" />
          </div>
          <div className="w-20">
            <label className="block text-xs text-[--color-text-muted] mb-1">
              iLvl {fetching && <span className="text-[--color-gold] animate-pulse text-[10px]">…</span>}
            </label>
            <input type="number" value={ilvl} onChange={e => setIlvl(e.target.value)} className="field" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[--color-text-muted] mb-1">Item Name</label>
          <input type="text" placeholder="auto-filled from Wowhead" value={itemName} onChange={e => setItemName(e.target.value)} className="field" />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" disabled={!itemId || !itemName} className="btn-gold-solid"
            onClick={() => onAdd({ itemId: itemId.trim(), itemName: itemName.trim(), bossName, bossOrder, ilvl: ilvl ? parseInt(ilvl) : null })}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Prio Import dialog ───────────────────────────────────

function CsvPrioImport({ instances, onImported, onClose }: {
  instances: string[];
  onImported: () => void;
  onClose: () => void;
}) {
  const [tab,       setTab]      = useState<"paste" | "drive">("paste");
  const [csv,       setCsv]      = useState("");
  const [importing, setImporting] = useState(false);
  const [driveRows, setDriveRows] = useState<{ itemName: string; priority: string; boss?: string; notes?: string }[] | null>(null);

  type PreviewRow = { itemName: string; priority: string; boss?: string; notes?: string; matched: boolean };

  function parsePreview(raw: string): PreviewRow[] {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const start = /^(item|name|item name)/i.test(lines[0]?.split(/[,\t]/)[0] ?? "") ? 1 : 0;
    return lines.slice(start).map(line => {
      const cols = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").trim());
      const itemName = cols[0] ?? "";
      const priority = cols[1] ?? "";
      const boss     = cols[2] ?? "";
      const notes    = cols[3] ?? "";
      return { itemName, priority, boss: boss || undefined, notes: notes || undefined,
               matched: itemName.length > 0 && priority.length > 0 };
    }).filter(r => r.itemName);
  }

  const pastePreview = parsePreview(csv);
  const activeRows: PreviewRow[] = driveRows
    ? driveRows.map(r => ({ ...r, matched: !!r.itemName && !!r.priority }))
    : pastePreview;

  async function handleImport() {
    if (!instances.length) { toast.error("Select a raid tier first before importing"); return; }
    const rows = activeRows.filter(r => r.matched);
    if (!rows.length) { toast.error("No valid rows to import"); return; }
    setImporting(true);
    try {
      const res = await fetch("/api/raid-loot/import-prio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instances, rows }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "Import failed"); return; }
      toast.success(`Updated ${d.updated} items · ${d.unmatched} unmatched`);
      onImported();
      onClose();
    } finally { setImporting(false); }
  }

  const validRows = activeRows.filter(r => r.matched);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg border border-[--color-border] p-5 space-y-4 max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "#16171f" }} onClick={e => e.stopPropagation()}>
        {!instances.length && (
          <div className="rounded border border-amber-700/50 bg-amber-900/20 px-3 py-2 text-xs text-amber-400">
            ⚠ No raid tier selected — close this dialog and select a raid first, then Import Prios.
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[--color-gold]">Import Priorities</h3>
            {instances.length > 0 && (
              <p className="text-xs text-[--color-text-muted] mt-0.5">
                Matching against: <span className="text-[--color-text]">{instances.join(", ")}</span>
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {(["paste", "drive"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`btn-tab ${tab === t ? "active" : ""}`}>
                {t === "paste" ? "Paste CSV" : "Google Drive"}
              </button>
            ))}
          </div>
        </div>

        {tab === "drive" ? (
          <DriveSheetPicker
            onRowsSelected={rows => {
              setDriveRows(rows);
              setTab("paste");
            }}
            onClose={onClose}
          />
        ) : (
          <>
            {driveRows ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-[--color-gold]">{driveRows.length} rows loaded from Google Drive</p>
                <button onClick={() => setDriveRows(null)} className="text-xs text-[--color-text-muted] hover:text-[--color-text] underline">Clear</button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-[--color-text-muted]">
                  Paste columns (tab or comma separated): <span className="text-[--color-text]">Item Name · Priority · Boss (opt) · Notes (opt)</span>.
                  Priority format: <code className="text-[--color-gold] text-[11px]">Rogue &gt; Monk = Hunter &gt; Rest</code>
                </p>
              </div>
            )}

            {!driveRows && (
              <textarea
                className="field font-mono text-xs resize-none flex-1 min-h-[180px]"
                placeholder={"Item Name\tPriority\tBoss\tNotes\nGurthalak\tWarrior > DK = Paladin > Rest\tDeathwing\tBiS for warriors"}
                value={csv}
                onChange={e => setCsv(e.target.value)}
                spellCheck={false}
              />
            )}

            {activeRows.length > 0 && (
              <div className="overflow-auto max-h-48 rounded border border-[--color-border]">
                <table className="data-table text-xs w-full">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Priority</th>
                      <th>Boss</th>
                      <th className="w-14 text-center">Valid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.itemName}</td>
                        <td className="font-mono text-[11px] text-[--color-gold]/80">{r.priority}</td>
                        <td className="text-[--color-text-muted]">{r.boss ?? ""}</td>
                        <td className="text-center">{r.matched ? "✓" : <span className="text-red-400">✗</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[--color-text-muted]">{validRows.length} rows ready to import</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleImport}
                  disabled={importing || validRows.length === 0 || instances.length === 0}
                  className="btn-gold-solid disabled:opacity-40"
                >
                  {importing ? "Importing…" : `Import ${validRows.length} rows`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tier group bulk import ───────────────────────────────────

function TierGroupBulkImport({ instances, tierLabel, onImported }: {
  instances: string[];
  tierLabel: string;
  onImported: () => void;
}) {
  const [running,  setRunning]  = useState(false);
  const [progress, setProgress] = useState<{ inst: string; status: "pending" | "running" | "done" | "error"; msg: string }[]>(
    instances.map(inst => ({ inst, status: "pending", msg: "" }))
  );

  async function runAll() {
    setRunning(true);
    setProgress(instances.map(inst => ({ inst, status: "pending", msg: "" })));
    for (const inst of instances) {
      setProgress(prev => prev.map(p => p.inst === inst ? { ...p, status: "running", msg: "Fetching…" } : p));
      try {
        const res = await fetch("/api/raid-loot/populate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instance: inst }),
        });
        const data = await res.json();
        if (!res.ok) {
          setProgress(prev => prev.map(p => p.inst === inst ? { ...p, status: "error", msg: data.error ?? "Failed" } : p));
        } else {
          setProgress(prev => prev.map(p => p.inst === inst ? { ...p, status: "done", msg: `${data.created} items` } : p));
        }
      } catch {
        setProgress(prev => prev.map(p => p.inst === inst ? { ...p, status: "error", msg: "Network error" } : p));
      }
    }
    setRunning(false);
    onImported();
  }

  const allDone = progress.every(p => p.status === "done" || p.status === "error");

  return (
    <div className="rounded-lg border border-[--color-gold]/40 bg-[--color-gold]/5 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-[--color-gold]">{tierLabel}</p>
        <p className="text-xs text-[--color-text-muted] mt-1">
          Auto-populate all {instances.length} raids in this tier from built-in data + Wowhead.
        </p>
      </div>

      <div className="space-y-2">
        {progress.map(({ inst, status, msg }) => (
          <div key={inst} className="flex items-center gap-3 text-sm">
            <span className={`w-4 text-center ${
              status === "done"    ? "text-green-400" :
              status === "error"   ? "text-red-400" :
              status === "running" ? "text-[--color-gold] animate-pulse" :
              "text-[--color-text-muted]"
            }`}>
              {status === "done" ? "✓" : status === "error" ? "✗" : status === "running" ? "…" : "·"}
            </span>
            <span className="text-[--color-text]">{inst}</span>
            {msg && <span className="text-xs text-[--color-text-muted]">{msg}</span>}
          </div>
        ))}
      </div>

      {!allDone && (
        <button
          onClick={runAll}
          disabled={running}
          className="btn-gold-solid disabled:opacity-40"
        >
          {running ? "Populating…" : `⚡ Auto-populate all ${instances.length} raids`}
        </button>
      )}
      {allDone && (
        <p className="text-xs text-green-400">All raids populated. Refresh to see items.</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

// A "selection" is either a single instance name or a tier group label
// tierGroupInstances returns the instance list for a selection (or [selection] if single)
function tierGroupInstances(selection: string): string[] {
  const group = RAID_TIER_GROUPS.find(g => g.label === selection);
  return group ? group.instances : selection ? [selection] : [];
}

export default function RaidLootPage() {
  const [instance, setInstance]         = useState("");
  const [items,    setItems]            = useState<RaidLootRow[]>([]);
  const [loading,  setLoading]          = useState(false);
  const [addRow,       setAddRow]        = useState<{ bossName: string; bossOrder: number } | null>(null);
  const [populated,    setPopulated]    = useState<string[]>([]);
  const [deletingTier,   setDeletingTier]   = useState(false);
  const [fixingTypes,    setFixingTypes]    = useState(false);
  const [showCsvImport,  setShowCsvImport]  = useState(false);

  // Whether current selection is a tier group (multiple instances)
  const isTierGroup = !!RAID_TIER_GROUPS.find(g => g.label === instance);
  const activeInstances = tierGroupInstances(instance);
  // For single-instance actions (add item, bulk import), use first instance
  const primaryInstance = activeInstances[0] ?? "";

  // Load list of populated instances on mount + handle Google OAuth return
  useEffect(() => {
    fetch("/api/raid-loot/instances")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.instances)) setPopulated(d.instances); })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (google === "connected") { toast.success("Google Drive connected"); setShowCsvImport(true); }
    if (google === "denied")    toast.error("Google sign-in was cancelled");
    if (google === "error")     toast.error("Google sign-in failed — try again");
    if (google) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const loadItems = useCallback(async (sel: string) => {
    if (!sel) { setItems([]); return; }
    setLoading(true);
    try {
      const insts = tierGroupInstances(sel);
      const url = insts.length > 1
        ? `/api/raid-loot?instances=${encodeURIComponent(insts.join(","))}`
        : `/api/raid-loot?instance=${encodeURIComponent(insts[0] ?? "")}`;
      const { items: data } = await (await fetch(url)).json() as { items: RaidLootRow[] };
      // Sort by tier group instance order, then bossOrder, then bossName, then ilvl desc
      const instOrder = insts;
      const sorted = (data ?? []).slice().sort((a, b) => {
        const ai = instOrder.indexOf(a.instance);
        const bi = instOrder.indexOf(b.instance);
        if (ai !== bi) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
        if (a.bossOrder !== b.bossOrder) return a.bossOrder - b.bossOrder;
        if (a.bossName !== b.bossName) return a.bossName.localeCompare(b.bossName);
        return (b.ilvl ?? 0) - (a.ilvl ?? 0);
      });
      const needsFix = sorted.filter(i => !i.itemType && i.itemSlot);
      if (needsFix.length > 0) {
        fetch("/api/raid-loot/backfill-types", { method: "POST" }).catch(() => {});
        setItems(sorted.map(i => ({ ...i, itemType: i.itemType ?? slotToType(i.itemSlot) ?? null })));
      } else {
        setItems(sorted);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadItems(instance); }, [instance, loadItems]);

  async function handleUpdate(id: number, patch: Partial<RaidLootRow>) {
    const r = await fetch(`/api/raid-loot/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    if (!r.ok) { toast.error("Save failed"); return; }
    const { item } = await r.json();
    setItems(prev => prev.map(row => row.id === id ? { ...row, ...item } : row));
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this item?")) return;
    await fetch(`/api/raid-loot/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(r => r.id !== id));
    toast.success("Removed");
  }

  async function handleAddSingle(partial: Partial<RaidLootRow>) {
    if (!primaryInstance) return;
    const r = await fetch("/api/raid-loot", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...partial, instance: primaryInstance }),
    });
    if (!r.ok) { toast.error((await r.json()).error ?? "Failed"); return; }
    const { item } = await r.json();
    setItems(prev => [...prev, item]);
    setAddRow(null);
    toast.success("Item added");
  }

  const showBulkImport = instance && !loading && items.length === 0;
  const showSheet      = instance && !loading && items.length > 0;

  return (
    <div className="space-y-5 min-w-0">
      <div className="page-header">
        <h1 className="page-title">Raid Loot Priority</h1>
        <p className="page-subtitle">Full interactive loot spreadsheet per raid tier.</p>
      </div>

      {/* Populated raid tabs */}
      {populated.length > 0 && (
        <div className="border border-[--color-border] rounded-lg overflow-hidden divide-y divide-[--color-border]">
          {/* Tier groups with drawer sub-tabs */}
          {RAID_TIER_GROUPS.filter(g => g.instances.some(i => populated.includes(i))).map(g => {
            const isGroupActive = instance === g.label || g.instances.includes(instance);
            const groupInstances = g.instances.filter(i => populated.includes(i));
            return (
              <div key={g.label}>
                {/* Group header row */}
                <div className={`flex items-center gap-2 px-4 py-2.5 transition-colors cursor-pointer select-none ${
                  isGroupActive
                    ? "bg-[--color-gold]/10 border-l-2 border-l-[--color-gold]"
                    : "hover:bg-[--color-surface-2]/60 border-l-2 border-l-transparent"
                }`}
                  onClick={() => setInstance(instance === g.label ? "" : g.label)}
                >
                  <span className={`text-[10px] transition-transform duration-200 ${isGroupActive ? "rotate-90" : ""} ${
                    isGroupActive ? "text-[--color-gold]" : "text-[--color-text-muted]"
                  }`}>▶</span>
                  <span className={`flex-1 text-sm font-medium transition-colors ${
                    isGroupActive ? "text-[--color-gold]" : "text-[--color-text-muted]"
                  }`}>
                    {g.label}
                    <span className="ml-2 text-xs font-normal opacity-60">
                      {groupInstances.length} raid{groupInstances.length !== 1 ? "s" : ""}
                    </span>
                  </span>
                  {instance !== g.label && isGroupActive && (
                    <button
                      onClick={e => { e.stopPropagation(); setInstance(g.label); }}
                      className="btn-ghost text-[11px] py-0.5 px-2"
                    >
                      All Raids
                    </button>
                  )}
                </div>
                {/* Sub-tabs drawer */}
                {isGroupActive && (
                  <div className="flex flex-wrap gap-2 px-8 py-3 bg-[--color-surface-2]/30 border-t border-[--color-border]/40">
                    <button onClick={() => setInstance(g.label)} className={`btn-tab ${instance === g.label ? "active" : ""}`}>
                      All Raids
                    </button>
                    {groupInstances.map(inst => (
                      <button key={inst} onClick={() => setInstance(inst)} className={`btn-tab ${instance === inst ? "active" : ""}`}>
                        {inst}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Standalone instances (not part of any tier group) */}
          {(() => {
            const groupedInsts = new Set(RAID_TIER_GROUPS.flatMap(g => g.instances));
            const standalone = populated.filter(i => !groupedInsts.has(i));
            if (!standalone.length) return null;
            return (
              <div className="flex flex-wrap gap-2 px-4 py-2.5">
                {standalone.map(inst => (
                  <button key={inst} onClick={() => setInstance(inst)} className={`btn-tab ${instance === inst ? "active" : ""}`}>
                    {inst}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Add Raid */}
          <div className="px-4 py-2.5">
            <button onClick={() => setInstance("")} className="btn-add">
              + Add Raid
            </button>
          </div>
        </div>
      )}

      {/* Raid selector — shown when adding new or no raids exist yet */}
      {(instance === "" || (!populated.includes(instance) && !isTierGroup)) && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-96">
            <label className="block text-xs text-[--color-text-muted] mb-1.5">Select Raid Tier</label>
            <select value={instance} onChange={e => setInstance(e.target.value)} className="field">
              <option value="">— Select raid or tier group —</option>
              <optgroup label="── Tier Groups (multi-raid) ──">
                {RAID_TIER_GROUPS.map(g => <option key={g.label} value={g.label}>{g.label}</option>)}
              </optgroup>
              <optgroup label="── Individual Raids ──">
                {RAID_INSTANCE_GROUPS.map(({ label, raids }) => (
                  raids.map(r => <option key={r} value={r}>{r} ({label})</option>)
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      )}

      {showSheet && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-[--color-text-muted]">
            {items.length} items · {new Set(items.map(i => i.bossName)).size} bosses
          </span>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setFixingTypes(true);
                try {
                  const res = await fetch("/api/raid-loot/backfill-types", { method: "POST" });
                  const d = await res.json();
                  toast.success(`Fixed ${d.updated} item types`);
                  await loadItems(instance);
                } finally { setFixingTypes(false); }
              }}
              disabled={fixingTypes}
              className="btn-ghost"
            >
              {fixingTypes ? "Fixing…" : "Fix Slots & Types"}
            </button>
            <button onClick={() => setShowCsvImport(true)} className="btn-ghost">
              Import Prios
            </button>
          <button
            onClick={async () => {
              const label = isTierGroup ? `all ${activeInstances.length} raids in "${instance}"` : `"${instance}"`;
              if (!confirm(`Delete all ${items.length} items for ${label}? This cannot be undone.`)) return;
              setDeletingTier(true);
              try {
                await Promise.all(
                  activeInstances.map(inst =>
                    fetch(`/api/raid-loot?instance=${encodeURIComponent(inst)}`, { method: "DELETE" })
                  )
                );
                toast.success(`${isTierGroup ? instance : `"${instance}"`} removed`);
                setItems([]);
                setPopulated(prev => prev.filter(p => !activeInstances.includes(p)));
                setInstance("");
              } finally { setDeletingTier(false); }
            }}
            disabled={deletingTier}
            className="btn-danger"
          >
            {deletingTier ? "Removing…" : "Remove Tier"}
          </button>
          </div>
        </div>
      )}

      {/* Class abbreviation legend */}
      {instance && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono leading-none">
          {Object.entries(CLASS_ABBR).map(([cls, abbr]) => (
            <span key={cls} className="flex items-center gap-1">
              <span style={{ color: CLASS_COLORS[cls] ?? "#e2e0d8" }} className="font-bold">{abbr}</span>
              <span className="text-[--color-text-muted]">{cls}</span>
            </span>
          ))}
        </div>
      )}

      {/* States */}
      {!instance && <div className="empty-state">Select a raid tier above to get started.</div>}
      {loading   && <div className="empty-state animate-pulse">Loading…</div>}

      {/* Bulk import — shown when instance selected but empty */}
      {showBulkImport && (
        isTierGroup ? (
          <TierGroupBulkImport
            instances={activeInstances}
            tierLabel={instance}
            onImported={() => {
              loadItems(instance);
              setPopulated(prev => {
                let next = [...prev];
                activeInstances.forEach(i => { if (!next.includes(i)) next.push(i); });
                return next;
              });
            }}
          />
        ) : (
          <BulkImport instance={instance} onImported={() => {
            loadItems(instance);
            setPopulated(prev => prev.includes(instance) ? prev : [...prev, instance]);
          }} />
        )
      )}

      {/* Spreadsheet */}
      {showSheet && (
        <LootSheet
          items={items}
          instance={instance}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAddRow={(bossName, bossOrder) => setAddRow({ bossName, bossOrder })}
        />
      )}

      {addRow && (
        <AddItemDialog
          instance={instance}
          bossName={addRow.bossName}
          bossOrder={addRow.bossOrder}
          onAdd={handleAddSingle}
          onClose={() => setAddRow(null)}
        />
      )}

      {showCsvImport && (
        <CsvPrioImport
          instances={activeInstances}
          onImported={() => loadItems(instance)}
          onClose={() => setShowCsvImport(false)}
        />
      )}
    </div>
  );
}
