"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface Raid {
  id: number;
  softresId: string;
  instance: string;
  night: number;
  raidDate: string;
  week: { id: number };
}

// ─── Format detection & parsers ───────────────────────────────

type CsvFormat = "loot-distribution" | "award-session" | "unknown";

interface LootRow {
  charName: string;
  itemId: string;
  offspec: boolean;
}

interface SessionRow {
  charName: string;
  server: string;
  lootCount: number;
}

interface ParseError { line: number; raw: string; reason: string }

function detectFormat(text: string): CsvFormat {
  const firstLine = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
  if (firstLine.startsWith("datetime,character,itemid")) return "loot-distribution";
  if (firstLine.includes(",") && !firstLine.startsWith("date")) {
    // award-session: name-server,count
    const second = text.trim().split("\n")[1]?.trim() ?? "";
    if (/^[a-z]+-[a-z]/i.test(second)) return "award-session";
  }
  return "unknown";
}

function parseLootDistribution(text: string): { rows: LootRow[]; errors: ParseError[] } {
  const rows: LootRow[] = [];
  const errors: ParseError[] = [];
  const lines = text.trim().split("\n");
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line || idx === 0) return; // skip header
    const cols = line.split(",");
    if (cols.length < 4) { errors.push({ line: idx + 1, raw: line, reason: "Expected 4+ columns" }); return; }
    const charName = cols[1]?.trim().toLowerCase();
    const itemId   = cols[2]?.trim();
    const offspec  = cols[3]?.trim() === "1";
    if (!charName) { errors.push({ line: idx + 1, raw: line, reason: "Missing character name" }); return; }
    if (!itemId || isNaN(Number(itemId))) { errors.push({ line: idx + 1, raw: line, reason: "Invalid itemID" }); return; }
    rows.push({ charName, itemId, offspec });
  });
  return { rows, errors };
}

function parseAwardSession(text: string): { rows: SessionRow[]; errors: ParseError[] } {
  const rows: SessionRow[] = [];
  const errors: ParseError[] = [];
  text.split("\n").forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const lastComma = line.lastIndexOf(",");
    if (lastComma === -1) { errors.push({ line: idx + 1, raw: line, reason: "Missing comma" }); return; }
    const nameServer = line.slice(0, lastComma).trim();
    const count = parseInt(line.slice(lastComma + 1).trim(), 10);
    if (isNaN(count)) { errors.push({ line: idx + 1, raw: line, reason: "Invalid count" }); return; }
    const firstHyphen = nameServer.indexOf("-");
    if (firstHyphen === -1) { errors.push({ line: idx + 1, raw: line, reason: "No hyphen in name-server" }); return; }
    rows.push({
      charName:  nameServer.slice(0, firstHyphen).toLowerCase(),
      server:    nameServer.slice(firstHyphen + 1).toLowerCase(),
      lootCount: count,
    });
  });
  return { rows, errors };
}

// ─── Component ────────────────────────────────────────────────

export default function GargulImportPage() {
  const [raids, setRaids]           = useState<Raid[]>([]);
  const [selectedRaidId, setSelectedRaidId] = useState<string>("");
  const [csvText, setCsvText]       = useState("");
  const [format, setFormat]         = useState<CsvFormat>("unknown");
  const [lootPreview, setLootPreview]   = useState<LootRow[] | null>(null);
  const [sessionPreview, setSessionPreview] = useState<SessionRow[] | null>(null);
  const [parseErrors, setParseErrors]   = useState<ParseError[]>([]);
  const [importing, setImporting]   = useState(false);
  const [dragging, setDragging]     = useState(false);

  useEffect(() => {
    fetch("/api/raids").then(r => r.json()).then(d => setRaids(d.raids ?? []));
  }, []);

  function handleTextChange(text: string) {
    setCsvText(text);
    setLootPreview(null);
    setSessionPreview(null);
    setParseErrors([]);
    setFormat(detectFormat(text));
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => handleTextChange(ev.target?.result as string);
    reader.readAsText(file);
  }, []);

  function handlePreview() {
    if (format === "loot-distribution") {
      const { rows, errors } = parseLootDistribution(csvText);
      setLootPreview(rows);
      setParseErrors(errors);
    } else {
      const { rows, errors } = parseAwardSession(csvText);
      setSessionPreview(rows);
      setParseErrors(errors);
    }
  }

  async function handleImport() {
    if (!selectedRaidId) { toast.error("Select a raid night first"); return; }
    const hasPreview = (lootPreview && lootPreview.length > 0) || (sessionPreview && sessionPreview.length > 0);
    if (!hasPreview) { toast.error("No rows to import"); return; }

    setImporting(true);
    try {
      const res = await fetch("/api/import/gargul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raidId: parseInt(selectedRaidId, 10), csvText, format }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Import failed"); return; }
      if (format === "loot-distribution") {
        toast.success(`Imported ${data.created} loot wins${data.skipped ? ` · ${data.skipped} skipped` : ""}${data.unresolved ? ` · ${data.unresolved} item IDs not in Loot Priority sheet` : ""}`);
      } else {
        toast.success(`Imported ${data.created} wins · ${data.skipped} players with 0 wins skipped`);
      }
      setLootPreview(null);
      setSessionPreview(null);
      setParseErrors([]);
      setCsvText("");
      setFormat("unknown");
    } catch {
      toast.error("Network error during import");
    } finally {
      setImporting(false);
    }
  }

  const previewCount = lootPreview?.length ?? sessionPreview?.length ?? 0;
  const hasPreview = previewCount > 0;

  const uniquePlayers = lootPreview ? [...new Set(lootPreview.map(r => r.charName))].length : 0;
  const msCount = lootPreview?.filter(r => !r.offspec).length ?? 0;
  const osCount = lootPreview?.filter(r => r.offspec).length ?? 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="page-header">
        <h1 className="page-title">Import from Gargul</h1>
        <p className="page-subtitle">
          Supports Gargul&apos;s <strong>Loot Distribution CSV</strong> (itemIDs with boss/item auto-resolved) and the older award session format.
        </p>
      </div>

      {/* Raid selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted] mb-1.5">
          Attach wins to which raid night?
        </label>
        <select value={selectedRaidId} onChange={e => setSelectedRaidId(e.target.value)} className="field">
          <option value="">— Select a raid night —</option>
          {raids.map(r => (
            <option key={r.id} value={String(r.id)}>
              Night {r.night} — {r.instance} ({new Date(r.raidDate).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
            Gargul CSV
          </label>
          {csvText.trim() && (
            <span className={`text-xs px-2 py-0.5 rounded border ${
              format === "loot-distribution"
                ? "bg-emerald-900/30 text-emerald-400 border-emerald-800"
                : format === "award-session"
                ? "bg-blue-900/30 text-blue-400 border-blue-800"
                : "bg-zinc-800 text-zinc-400 border-zinc-700"
            }`}>
              {format === "loot-distribution" ? "✓ Loot Distribution" :
               format === "award-session"     ? "✓ Award Session" :
               "? Unrecognised format"}
            </span>
          )}
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative rounded-md border transition-colors ${dragging ? "border-[--color-gold] bg-[--color-gold]/5" : "border-[--color-border]"}`}
        >
          <textarea
            value={csvText}
            onChange={e => handleTextChange(e.target.value)}
            rows={10}
            placeholder={
              "Loot Distribution format (preferred):\ndateTime,character,itemID,offspec,id\n2026-01-22,Feckful,96625,0,37321337972370065367\n\n— or Award Session format —\nfeckful-galakrond,1\n\n— or drag & drop a .csv file here —"
            }
            className="w-full rounded-md bg-[--color-surface-2] px-3 py-2 font-mono text-xs text-[--color-text] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-gold] border-none resize-y"
            style={{ minHeight: "12rem" }}
          />
          {dragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-[--color-surface]/80 pointer-events-none">
              <p className="text-[--color-gold] font-medium">Drop CSV file here</p>
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-[--color-text-muted]">
          In Gargul: <span className="text-[--color-text]">Session History → Export → Loot Distribution CSV</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handlePreview} disabled={!csvText.trim() || format === "unknown"} className="btn-secondary">
          Preview
        </button>
        {hasPreview && (
          <button onClick={handleImport} disabled={importing || !selectedRaidId} className="btn-gold-solid">
            {importing ? "Importing…" : `Confirm Import (${previewCount} rows)`}
          </button>
        )}
      </div>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="rounded-md border border-amber-800 bg-amber-900/20 p-4 space-y-1">
          <p className="text-sm font-medium text-amber-300">{parseErrors.length} line{parseErrors.length !== 1 ? "s" : ""} skipped:</p>
          {parseErrors.slice(0, 10).map((e, i) => (
            <p key={i} className="text-xs text-amber-400">
              Line {e.line}: <code className="opacity-70">{e.raw.slice(0, 60)}</code> — {e.reason}
            </p>
          ))}
          {parseErrors.length > 10 && <p className="text-xs text-amber-400">…and {parseErrors.length - 10} more</p>}
        </div>
      )}

      {/* Loot distribution preview */}
      {lootPreview && lootPreview.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm text-[--color-text-muted]">
            <span><span className="font-medium text-[--color-text]">{previewCount}</span> items</span>
            <span><span className="font-medium text-[--color-text]">{uniquePlayers}</span> players</span>
            <span><span className="font-medium text-emerald-400">{msCount}</span> MS · <span className="font-medium text-zinc-400">{osCount}</span> OS</span>
          </div>
          <div className="data-table-wrap max-h-72 overflow-y-auto">
            <table className="data-table">
              <thead className="sticky top-0">
                <tr>
                  <th>Character</th>
                  <th>Item ID</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {lootPreview.map((row, i) => (
                  <tr key={i}>
                    <td className="font-medium capitalize">{row.charName}</td>
                    <td className="muted font-mono">{row.itemId}</td>
                    <td>
                      <span className={`text-xs rounded border px-1.5 py-0.5 ${row.offspec ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-emerald-900/40 text-emerald-400 border-emerald-800"}`}>
                        {row.offspec ? "OS" : "MS"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!selectedRaidId && <p className="text-xs text-amber-400">⚠ Select a raid night above before importing</p>}
        </div>
      )}

      {/* SR Sheet Import — manual override only */}
      <details className="rounded-lg border border-[--color-border]">
        <summary className="px-5 py-3 text-sm text-[--color-text-muted] cursor-pointer hover:text-[--color-text] select-none">
          Manual Stacking Override
          <span className="ml-2 text-xs opacity-60">— stacking is automatic via Softres.it sync, use this only to correct counts</span>
        </summary>
        <div className="px-5 pb-5 pt-2">
          <SoftReservesSheetImport raids={raids} />
        </div>
      </details>

      {/* Award session preview */}
      {sessionPreview && sessionPreview.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[--color-text-muted]">
            <span className="font-medium text-[--color-text]">{previewCount}</span> players — {" "}
            <span className="font-medium text-[--color-text]">{sessionPreview.reduce((s, r) => s + r.lootCount, 0)}</span> total wins
          </p>
          <div className="data-table-wrap max-h-72 overflow-y-auto">
            <table className="data-table">
              <thead className="sticky top-0">
                <tr><th>Character</th><th>Server</th><th className="text-right">Wins</th></tr>
              </thead>
              <tbody>
                {sessionPreview.map((row, i) => (
                  <tr key={i}>
                    <td className="font-medium">{row.charName}</td>
                    <td className="muted">{row.server}</td>
                    <td className="text-right">{row.lootCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stacking Manual Override ─────────────────────────────────

interface SREntry { id: number; itemId: string; itemName: string; weeksConsecutive: number }
interface SRPlayer { id: number; charName: string; reserves: SREntry[] }

function SoftReservesSheetImport({ raids }: { raids: { id: number; softresId: string; instance: string; night: number; raidDate: string; week: { id: number } }[] }) {
  const weeks = [...new Map(raids.map(r => [r.week.id, r])).values()];

  const [weekId,    setWeekId]    = useState("");
  const [players,   setPlayers]   = useState<SRPlayer[]>([]);
  const [playerId,  setPlayerId]  = useState("");
  const [itemId,    setItemId]    = useState("");
  const [stacks,    setStacks]    = useState("1");
  const [saving,    setSaving]    = useState(false);
  const [loadingPl, setLoadingPl] = useState(false);

  // Load players + their reserves for the selected week
  useEffect(() => {
    if (!weekId) { setPlayers([]); setPlayerId(""); setItemId(""); return; }
    setLoadingPl(true);
    fetch(`/api/soft-reserves?weekId=${weekId}`)
      .then(r => r.json())
      .then(d => {
        // Group reserves by player
        const map = new Map<number, SRPlayer>();
        for (const sr of (d.reserves ?? [])) {
          if (!map.has(sr.playerId)) {
            map.set(sr.playerId, { id: sr.playerId, charName: sr.player.charName, reserves: [] });
          }
          map.get(sr.playerId)!.reserves.push({ id: sr.id, itemId: sr.itemId, itemName: sr.itemName, weeksConsecutive: sr.weeksConsecutive });
        }
        setPlayers([...map.values()].sort((a, b) => a.charName.localeCompare(b.charName)));
      })
      .finally(() => setLoadingPl(false));
  }, [weekId]);

  const selectedPlayer = players.find(p => String(p.id) === playerId) ?? null;
  const selectedReserve = selectedPlayer?.reserves.find(r => r.itemId === itemId) ?? null;

  // Pre-fill stacks when item is selected
  useEffect(() => {
    if (selectedReserve) setStacks(String(selectedReserve.weeksConsecutive));
  }, [selectedReserve]);

  async function handleSave() {
    if (!weekId || !playerId || !itemId || !stacks) return;
    setSaving(true);
    try {
      const res = await fetch("/api/soft-reserves/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekId: parseInt(weekId),
          rows: [{ playerName: selectedPlayer!.charName, itemId, itemName: selectedReserve?.itemName ?? "", instance: "", totalStacks: parseInt(stacks) }],
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "Save failed"); return; }
      toast.success(`Updated stacking for ${selectedPlayer!.charName} — ${selectedReserve?.itemName}`);
      // Refresh the player list
      setPlayers(prev => prev.map(p => p.id === parseInt(playerId)
        ? { ...p, reserves: p.reserves.map(r => r.itemId === itemId ? { ...r, weeksConsecutive: parseInt(stacks) } : r) }
        : p
      ));
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {/* Week */}
      <div>
        <label className="block text-xs text-[--color-text-muted] mb-1.5">Raid Week</label>
        <select value={weekId} onChange={e => { setWeekId(e.target.value); setPlayerId(""); setItemId(""); }} className="field">
          <option value="">— Select a week —</option>
          {weeks.map(r => (
            <option key={r.week.id} value={String(r.week.id)}>
              {new Date(r.raidDate).toLocaleDateString()} — {r.instance}
            </option>
          ))}
        </select>
      </div>

      {weekId && (
        <>
          {loadingPl && <p className="text-xs text-[--color-text-muted] animate-pulse">Loading players…</p>}

          {/* Player */}
          {players.length > 0 && (
            <div>
              <label className="block text-xs text-[--color-text-muted] mb-1.5">Player</label>
              <select value={playerId} onChange={e => { setPlayerId(e.target.value); setItemId(""); }} className="field">
                <option value="">— Select player —</option>
                {players.map(p => (
                  <option key={p.id} value={String(p.id)}>
                    {p.charName} ({p.reserves.length} reserve{p.reserves.length !== 1 ? "s" : ""})
                  </option>
                ))}
              </select>
            </div>
          )}

          {players.length === 0 && !loadingPl && (
            <p className="text-xs text-[--color-text-muted]">No soft reserves found for this week.</p>
          )}

          {/* Item */}
          {selectedPlayer && (
            <div>
              <label className="block text-xs text-[--color-text-muted] mb-1.5">Reserved Item</label>
              <select value={itemId} onChange={e => setItemId(e.target.value)} className="field">
                <option value="">— Select item —</option>
                {selectedPlayer.reserves.map(r => (
                  <option key={r.itemId} value={r.itemId}>
                    {r.itemName} (currently {r.weeksConsecutive} week{r.weeksConsecutive !== 1 ? "s" : ""})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stacks */}
          {itemId && (
            <div>
              <label className="block text-xs text-[--color-text-muted] mb-1.5">Weeks Consecutive</label>
              <select value={stacks} onChange={e => setStacks(e.target.value)} className="field">
                {[1,2,3,4,5,6].map(n => (
                  <option key={n} value={String(n)}>{n} week{n !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
          )}

          {itemId && (
            <button onClick={handleSave} disabled={saving} className="btn-gold-solid disabled:opacity-40">
              {saving ? "Saving…" : "Update Stacking"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

