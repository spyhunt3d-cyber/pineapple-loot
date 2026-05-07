"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Raid {
  id: number;
  softresId: string;
  instance: string;
  night: number;
  raidDate: string;
}

interface PreviewRow {
  charName: string;
  server: string;
  lootCount: number;
  raw: string;
}

interface ParseError {
  line: number;
  raw: string;
  reason: string;
}

export default function GargulImportPage() {
  const [raids, setRaids] = useState<Raid[]>([]);
  const [raidsLoaded, setRaidsLoaded] = useState(false);
  const [selectedRaidId, setSelectedRaidId] = useState<string>("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [importing, setImporting] = useState(false);

  // Load raids on first focus of the dropdown
  async function loadRaids() {
    if (raidsLoaded) return;
    const res = await fetch("/api/raids");
    const { raids: data } = await res.json();
    setRaids(data ?? []);
    setRaidsLoaded(true);
  }

  // Client-side parse preview (mirrors the server parser)
  function handlePreview() {
    const lines = csvText.split("\n");
    const rows: PreviewRow[] = [];
    const errors: ParseError[] = [];

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) return;

      const lastComma = line.lastIndexOf(",");
      if (lastComma === -1) { errors.push({ line: idx + 1, raw: line, reason: "Missing comma" }); return; }

      const nameServer = line.slice(0, lastComma).trim();
      const count = parseInt(line.slice(lastComma + 1).trim(), 10);
      if (isNaN(count)) { errors.push({ line: idx + 1, raw: line, reason: "Invalid count" }); return; }

      const firstHyphen = nameServer.indexOf("-");
      if (firstHyphen === -1) { errors.push({ line: idx + 1, raw: line, reason: "No hyphen" }); return; }

      rows.push({
        charName: nameServer.slice(0, firstHyphen).toLowerCase(),
        server: nameServer.slice(firstHyphen + 1).toLowerCase(),
        lootCount: count,
        raw: line,
      });
    });

    setPreview(rows);
    setParseErrors(errors);
  }

  async function handleImport() {
    if (!selectedRaidId) { toast.error("Select a raid first"); return; }
    if (!preview || preview.length === 0) { toast.error("No rows to import"); return; }

    setImporting(true);
    try {
      const res = await fetch("/api/import/gargul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raidId: parseInt(selectedRaidId, 10), csvText }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }

      toast.success(`Imported! ${data.created} wins created. ${data.skipped} players with 0 wins skipped.`);
      setPreview(null);
      setCsvText("");
    } catch {
      toast.error("Network error during import");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--color-gold]">Import from Gargul</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Paste the Gargul loot export CSV below. Format: <code className="text-[--color-gold-light]">charactername-server,count</code>
        </p>
      </div>

      {/* Raid selector */}
      <div>
        <label className="block text-sm text-[--color-text-muted] mb-1">
          Attach wins to which raid night?
        </label>
        <select
          value={selectedRaidId}
          onChange={(e) => setSelectedRaidId(e.target.value)}
          onFocus={loadRaids}
          className="rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold] w-full"
        >
          <option value="">— Select a raid night —</option>
          {raids.map((r) => (
            <option key={r.id} value={String(r.id)}>
              Night {r.night} — {r.instance} ({new Date(r.raidDate).toLocaleDateString()}) [ID: {r.softresId}]
            </option>
          ))}
        </select>
      </div>

      {/* CSV textarea */}
      <div>
        <label className="block text-sm text-[--color-text-muted] mb-1">
          Gargul CSV
        </label>
        <textarea
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); setPreview(null); }}
          rows={12}
          placeholder={"feckful-galakrond,0\ninnomine-galakrond,1\nzipperz-galakrond,3"}
          className="w-full rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 font-mono text-sm text-[--color-text] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
        />
      </div>

      {/* Parse button */}
      <button
        onClick={handlePreview}
        disabled={!csvText.trim()}
        className="rounded-md border border-[--color-border] bg-[--color-surface-2] px-4 py-2 text-sm text-[--color-text] hover:bg-[--color-surface] disabled:opacity-40 transition-colors"
      >
        Preview Parse
      </button>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="rounded-md border border-amber-800 bg-amber-900/20 p-4">
          <p className="text-sm font-medium text-amber-300 mb-2">
            {parseErrors.length} line{parseErrors.length > 1 ? "s" : ""} could not be parsed (will be skipped):
          </p>
          {parseErrors.map((e, i) => (
            <p key={i} className="text-xs text-amber-400">
              Line {e.line}: <code>{e.raw}</code> — {e.reason}
            </p>
          ))}
        </div>
      )}

      {/* Preview table */}
      {preview && (
        <div className="space-y-3">
          <p className="text-sm text-[--color-text-muted]">
            {preview.length} player{preview.length !== 1 ? "s" : ""} parsed —
            {preview.reduce((sum, r) => sum + r.lootCount, 0)} total loot wins
          </p>

          <div className="overflow-hidden rounded-lg border border-[--color-border] max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[--color-surface-2]">
                <tr className="border-b border-[--color-border]">
                  <th className="px-4 py-2 text-left font-medium text-[--color-text-muted]">Character</th>
                  <th className="px-4 py-2 text-left font-medium text-[--color-text-muted]">Server</th>
                  <th className="px-4 py-2 text-right font-medium text-[--color-text-muted]">Wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-border]">
                {preview.map((row, i) => (
                  <tr key={i} className="bg-[--color-surface]">
                    <td className="px-4 py-2 font-medium text-[--color-text]">{row.charName}</td>
                    <td className="px-4 py-2 text-[--color-text-muted]">{row.server}</td>
                    <td className="px-4 py-2 text-right text-[--color-text]">{row.lootCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={importing || !selectedRaidId}
            className="rounded-md bg-[--color-gold] px-6 py-2 text-sm font-semibold text-black hover:bg-[--color-gold-light] disabled:opacity-50 transition-colors"
          >
            {importing ? "Importing…" : `Confirm Import (${preview.length} players)`}
          </button>
        </div>
      )}
    </div>
  );
}
