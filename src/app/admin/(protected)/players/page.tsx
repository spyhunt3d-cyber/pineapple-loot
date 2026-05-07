"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CLASS_COLORS, CLASS_SPECS, ALL_CLASSES, SPEC_ROLE } from "@/lib/wow-constants";
import { LootWinDrawer, type LootWinRow } from "@/components/players/LootWinDrawer";

interface Player {
  id: number;
  charName: string;
  server: string;
  class: string | null;
  spec: string | null;
  role: string | null;
  team: string | null;
  notes: string | null;
  active: boolean;
  _count: { lootWins: number };
}

const ROLES = ["Tank", "Healer", "DPS"] as const;
const TEAMS = ["Main", "Alt", "Bench", "Trial"];

const BLANK_FORM = {
  charName: "",
  server: "galakrond",
  class: "",
  spec: "",
  role: "",
  team: "",
  notes: "",
};

export default function AdminPlayersPage() {
  const [players, setPlayers]   = useState<Player[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "active" | "inactive">("all");
  const [showForm, setShowForm]         = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [importText, setImportText]     = useState("");
  const [importing, setImporting]       = useState(false);
  const [form, setForm]         = useState(BLANK_FORM);
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);
  const [toggling,   setToggling]   = useState<number | null>(null);
  const [deleting,   setDeleting]   = useState<number | null>(null);
  const [bulkDelAll, setBulkDelAll] = useState(false);
  const [selected,   setSelected]   = useState<Set<number>>(new Set());
  const [showSync,   setShowSync]   = useState(false);
  const [syncId,     setSyncId]     = useState("");
  const [syncing,    setSyncing]    = useState(false);
  const [openWins,   setOpenWins]   = useState<Set<number>>(new Set());
  const [winsCache,  setWinsCache]  = useState<Record<number, LootWinRow[]>>({});

  async function loadPlayers() {
    const res = await fetch("/api/players?active=all");
    const { players: data } = await res.json();
    setPlayers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadPlayers(); }, []);

  const specs = form.class ? (CLASS_SPECS[form.class] ?? []) : [];

  function startEdit(player: Player) {
    setForm({
      charName: player.charName,
      server:   player.server,
      class:    player.class  ?? "",
      spec:     player.spec   ?? "",
      role:     player.role   ?? "",
      team:     player.team   ?? "",
      notes:    player.notes  ?? "",
    });
    setEditId(player.id);
    setShowForm(true);
  }

  async function handleImport() {
    const lines = importText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("Nothing to import"); return; }
    setImporting(true);
    let created = 0, skipped = 0;
    for (const line of lines) {
      // Support: CSV (name,server,class,spec,role,team,notes) or just name or name-server
      const cols = line.split(/,|\t/).map(c => c.trim());
      const charName = cols[0]?.toLowerCase().replace(/\s+/g, "");
      if (!charName) { skipped++; continue; }
      const server  = (cols[1] || "galakrond").toLowerCase();
      const cls     = cols[2] || null;
      const spec    = cols[3] || null;
      const role    = cols[4]?.toLowerCase() || null;
      const team    = cols[5] || null;
      const notes   = cols[6] || null;
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charName, server, class: cls, spec, role, team, notes }),
      });
      if (res.ok) created++; else skipped++;
    }
    toast.success(`Imported ${created} players${skipped ? `, ${skipped} skipped (duplicates or errors)` : ""}`);
    setImporting(false);
    setImportText("");
    setShowImport(false);
    await loadPlayers();
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(BLANK_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.charName.trim()) { toast.error("Character name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        charName: form.charName.trim().toLowerCase(),
        server:   form.server.trim().toLowerCase(),
        class:    form.class  || null,
        spec:     form.spec   || null,
        role:     form.role   ? form.role.toLowerCase() : null,
        team:     form.team   || null,
        notes:    form.notes  || null,
      };

      let res: Response;
      if (editId !== null) {
        res = await fetch(`/api/players/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/players", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "Failed to save player");
        return;
      }

      toast.success(editId ? `${form.charName} updated` : `${form.charName} added`);
      cancelForm();
      await loadPlayers();
    } finally {
      setSaving(false);
    }
  }

  async function deletePlayer(id: number, name: string) {
    if (!confirm(`Permanently delete ${name}? This removes all their loot history.`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/players/${id}`, { method: "DELETE" });
      toast.success(`${name} deleted`);
      setPlayers(prev => prev.filter(p => p.id !== id));
    } finally { setDeleting(null); }
  }

  async function deleteAll() {
    if (!confirm(`Permanently delete ALL ${players.length} players? This cannot be undone.`)) return;
    setBulkDelAll(true);
    try {
      await fetch("/api/players", { method: "DELETE" });
      toast.success("All players deleted");
      setPlayers([]);
      setSelected(new Set());
    } finally { setBulkDelAll(false); }
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} selected player${selected.size !== 1 ? "s" : ""}?`)) return;
    setBulkDelAll(true);
    try {
      await fetch(`/api/players?ids=${[...selected].join(",")}`, { method: "DELETE" });
      toast.success(`${selected.size} players deleted`);
      setPlayers(prev => prev.filter(p => !selected.has(p.id)));
      setSelected(new Set());
    } finally { setBulkDelAll(false); }
  }

  async function toggleWins(playerId: number) {
    setOpenWins(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) { next.delete(playerId); return next; }
      next.add(playerId);
      return next;
    });
    if (winsCache[playerId]) return; // already loaded
    const res = await fetch(`/api/loot-wins?playerId=${playerId}`);
    const data = await res.json();
    const wins: LootWinRow[] = (data.wins ?? []).map((w: {
      id: number; itemId: string; itemName: string; bossName: string; winType: string;
      raid: { raidDate: string; instance: string; night: number };
    }) => ({
      id: w.id, itemId: w.itemId, itemName: w.itemName, bossName: w.bossName,
      winType: w.winType, raidDate: w.raid.raidDate, instance: w.raid.instance, night: w.raid.night,
    }));
    setWinsCache(c => ({ ...c, [playerId]: wins }));
  }

  async function syncClasses() {
    if (!syncId.trim()) { toast.error("Enter a Softres raid ID"); return; }
    setSyncing(true);
    try {
      const res = await fetch("/api/players/sync-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ softresId: syncId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Sync failed"); return; }
      toast.success(`Updated ${data.updated} players with class/spec from Softres`);
      setSyncId("");
      setShowSync(false);
      await loadPlayers();
    } finally {
      setSyncing(false);
    }
  }

  async function toggleActive(player: Player) {
    setToggling(player.id);
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !player.active }),
      });
      if (!res.ok) { toast.error("Failed to update player"); return; }
      toast.success(`${player.charName} marked ${player.active ? "inactive" : "active"}`);
      setPlayers((prev) =>
        prev.map((p) => p.id === player.id ? { ...p, active: !p.active } : p)
      );
    } finally {
      setToggling(null);
    }
  }

  const visible = players.filter((p) =>
    filter === "all" ? true : filter === "active" ? p.active : !p.active
  );

  const activeCount   = players.filter((p) => p.active).length;
  const inactiveCount = players.filter((p) => !p.active).length;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Players</h1>
          <p className="page-subtitle">{activeCount} active · {inactiveCount} inactive</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {selected.size > 0 && (
            <button onClick={deleteSelected} disabled={bulkDelAll}
              className="text-xs font-medium text-red-400 hover:text-red-300 border border-red-800 rounded px-3 py-1.5 transition-colors disabled:opacity-40">
              Delete {selected.size} selected
            </button>
          )}
          {players.length > 0 && (
            <button onClick={deleteAll} disabled={bulkDelAll}
              className="text-xs text-red-400/60 hover:text-red-400 border border-red-900/40 hover:border-red-700 rounded px-3 py-1.5 transition-colors disabled:opacity-40">
              {bulkDelAll ? "Deleting…" : "Delete All"}
            </button>
          )}
          <button
            onClick={() => { setShowSync(v => !v); setShowImport(false); setShowForm(false); }}
            className="btn-secondary"
            title="Pull class/spec from a Softres raid ID"
          >
            Sync Classes
          </button>
          <button
            onClick={() => { setShowImport(v => !v); setShowForm(false); setShowSync(false); }}
            className="btn-secondary"
          >
            Import CSV
          </button>
          <button
            onClick={() => { cancelForm(); setShowForm(true); setShowImport(false); }}
            className="btn-gold-solid"
          >
            + Add Player
          </button>
        </div>
      </div>

      {/* Sync Classes from Softres panel */}
      {showSync && (
        <div className="bg-[--color-surface] border border-[--color-gold]/30 rounded-lg p-5 space-y-3">
          <div>
            <h2 className="section-label">Sync Class &amp; Spec from Softres</h2>
            <p className="text-xs text-[--color-text-muted] mt-1">
              Paste a Softres.it raid ID to pull class and spec for all matching players.
              This updates <strong>all</strong> players with the same character name, including those imported from Gargul.
            </p>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-[--color-text-muted] mb-1">Softres Raid ID</label>
              <input
                type="text"
                placeholder="e.g. 88quaw"
                value={syncId}
                onChange={e => setSyncId(e.target.value)}
                className="field"
              />
            </div>
            <button
              onClick={syncClasses}
              disabled={syncing || !syncId.trim()}
              className="btn-gold-solid disabled:opacity-40"
            >
              {syncing ? "Syncing…" : "Sync Classes"}
            </button>
            <button onClick={() => setShowSync(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* CSV / bulk import panel */}
      {showImport && (
        <div className="bg-[--color-surface] border border-[--color-border] rounded-lg p-5 space-y-3">
          <div>
            <h2 className="section-label">Bulk Import Players</h2>
            <p className="text-xs text-[--color-text-muted] mt-1">
              One player per line. Formats accepted:
            </p>
            <ul className="text-xs text-[--color-text-muted] mt-1 space-y-0.5 list-disc ml-4">
              <li><code className="text-[--color-gold]">feckful</code> — name only (server defaults to galakrond)</li>
              <li><code className="text-[--color-gold]">feckful, galakrond</code> — name + server</li>
              <li><code className="text-[--color-gold]">feckful, galakrond, Warrior, Arms, DPS, Main</code> — full CSV</li>
              <li>CSV columns: <span className="opacity-70">Name, Server, Class, Spec, Role, Team, Notes</span></li>
            </ul>
          </div>
          <textarea
            className="field font-mono text-xs resize-y w-full"
            rows={8}
            placeholder={"feckful\nzanrian, galakrond, Hunter, Survival, DPS, Main\nspyhunt3d, galakrond, Warrior, Arms, DPS, Main"}
            value={importText}
            onChange={e => setImportText(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowImport(false)} className="btn-secondary">Cancel</button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !importText.trim()}
              className="btn-gold-solid disabled:opacity-50"
            >
              {importing ? "Importing…" : `Import ${importText.split("\n").filter(l => l.trim()).length} players`}
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[--color-surface] border border-[--color-border] rounded-lg p-5 space-y-4"
        >
          <h2 className="section-label">{editId ? "Edit Player" : "New Player"}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--color-text-muted]">Character Name *</label>
              <input
                className="field"
                placeholder="feckful"
                value={form.charName}
                onChange={(e) => setForm({ ...form, charName: e.target.value })}
                disabled={editId !== null}
              />
            </div>

            {/* Server */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--color-text-muted]">Server</label>
              <input
                className="field"
                placeholder="galakrond"
                value={form.server}
                onChange={(e) => setForm({ ...form, server: e.target.value })}
              />
            </div>

            {/* Class */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--color-text-muted]">Class</label>
              <select
                className="field"
                value={form.class}
                onChange={(e) => setForm({ ...form, class: e.target.value, spec: "" })}
              >
                <option value="">— Class —</option>
                {ALL_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Spec */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--color-text-muted]">Spec</label>
              <select
                className="field"
                value={form.spec}
                onChange={(e) => {
                  const spec = e.target.value;
                  const autoRole = spec ? (SPEC_ROLE[spec] ?? "") : "";
                  setForm({ ...form, spec, role: autoRole || form.role });
                }}
                disabled={!form.class}
              >
                <option value="">— Spec —</option>
                {specs.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--color-text-muted]">Role</label>
              <select
                className="field"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="">— Role —</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[--color-text-muted]">Notes</label>
            <textarea
              className="field resize-none"
              rows={2}
              placeholder="e.g. Officer, raid leader, backup healer…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={cancelForm} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-gold-solid disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Save Changes" : "Add Player"}
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="tab-underline-bar">
        {(["all", "active", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`tab-underline capitalize ${filter === f ? "active" : ""}`}
          >
            {f} {f === "all" ? `(${players.length})` : f === "active" ? `(${activeCount})` : `(${inactiveCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[--color-text-muted] animate-pulse text-sm">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="empty-state">No players yet. Use the form above to add one.</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8">
                  <input type="checkbox" className="accent-[--color-gold]"
                    checked={selected.size === visible.length && visible.length > 0}
                    onChange={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map(p => p.id)))} />
                </th>
                <th>Name</th>
                <th>Class / Spec</th>
                <th>Role</th>
                <th>Notes</th>
                <th className="text-right">Wins</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            {visible.map((player) => {
                const classColor = CLASS_COLORS[player.class ?? ""] ?? "#e2e0d8";
                const isOpen = openWins.has(player.id);
                return (
                  <tbody key={player.id}>
                    <tr className={`${player.active ? "" : "opacity-50"} ${selected.has(player.id) ? "bg-red-950/20" : ""}`}>
                      <td>
                        <input type="checkbox" className="accent-[--color-gold]"
                          checked={selected.has(player.id)}
                          onChange={() => setSelected(prev => { const n = new Set(prev); n.has(player.id) ? n.delete(player.id) : n.add(player.id); return n; })} />
                      </td>
                      <td className="font-medium" style={{ color: classColor }}>
                        {player.charName}
                        <span className="ml-1 text-xs text-[--color-text-muted]">-{player.server}</span>
                      </td>
                      <td style={{ color: classColor }}>
                        {player.class ?? "—"}
                        {player.spec && <span className="text-[--color-text-muted]"> / {player.spec}</span>}
                      </td>
                      <td className="muted capitalize">{player.role ?? "—"}</td>
                      <td className="muted text-xs whitespace-pre-wrap max-w-[200px]">{player.notes ?? ""}</td>
                      <td className="text-right">
                        <button
                          onClick={() => toggleWins(player.id)}
                          className={`text-xs font-medium transition-colors ${isOpen ? "text-[--color-gold]" : "text-[--color-text] hover:text-[--color-gold]"}`}
                          title="Show loot won"
                        >
                          {player._count.lootWins} {isOpen ? "▲" : "▼"}
                        </button>
                      </td>
                      <td>
                        <span className={`text-xs rounded px-1.5 py-0.5 border ${
                          player.active
                            ? "bg-emerald-900/40 text-emerald-400 border-emerald-800"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}>
                          {player.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => startEdit(player)} className="text-xs text-[--color-text-muted] hover:text-[--color-gold] transition-colors">Edit</button>
                          <button onClick={() => toggleActive(player)} disabled={toggling === player.id}
                            className="text-xs text-[--color-text-muted] hover:text-[--color-gold] transition-colors disabled:opacity-40">
                            {toggling === player.id ? "…" : player.active ? "Deactivate" : "Activate"}
                          </button>
                          <button onClick={() => deletePlayer(player.id, player.charName)} disabled={deleting === player.id}
                            className="text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40">
                            {deleting === player.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="bg-[--color-surface-2]/50 border-b border-[--color-border] px-4 py-3">
                          {winsCache[player.id] ? (
                            <LootWinDrawer
                              wins={winsCache[player.id]}
                              allowDelete
                              onDeleted={(id) => {
                                setWinsCache(c => ({ ...c, [player.id]: c[player.id].filter(w => w.id !== id) }));
                                setPlayers(prev => prev.map(p => p.id === player.id
                                  ? { ...p, _count: { ...p._count, lootWins: p._count.lootWins - 1 } }
                                  : p
                                ));
                              }}
                            />
                          ) : (
                            <p className="text-xs text-[--color-text-muted] animate-pulse">Loading…</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
          </table>
        </div>
      )}
    </div>
  );
}
