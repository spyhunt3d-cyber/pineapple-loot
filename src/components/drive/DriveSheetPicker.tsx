"use client";

import { useState, useEffect, useRef } from "react";

interface DriveFile  { id: string; name: string; modifiedTime: string }
interface ColMap     { item: number; prio: number; boss: number; notes: number }
interface TabConfig  { tab: string; enabled: boolean; colMap: ColMap; headerRow: number }

interface Props {
  onRowsSelected: (rows: { itemName: string; priority: string; boss?: string; notes?: string }[]) => void;
  onClose: () => void;
}

// Auto-detect column index from header row
function detectCols(headers: string[]): ColMap {
  const h = headers.map(c => c.toLowerCase().trim());
  const find = (...terms: string[]) => {
    for (const t of terms) {
      const i = h.findIndex(c => c === t || c.includes(t));
      if (i >= 0) return i;
    }
    return -1;
  };
  return {
    item:  find("item", "item name", "name"),
    prio:  find("prio", "priority", "perceived prio") !== -1 ? (() => {
             // prefer exact "prio" over "pe prio"
             const exact = h.findIndex(c => c === "prio");
             return exact >= 0 ? exact : h.findIndex(c => c.includes("prio") && !c.includes("pe"));
           })() : -1,
    boss:  find("boss"),
    notes: find("notes", "note"),
  };
}

// Find the header row index (first row containing "item" and "prio")
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const lower = rows[i].map(c => c.toLowerCase());
    if (lower.some(c => c === "item" || c === "item name") &&
        lower.some(c => c === "prio" || (c.includes("prio") && !c.includes("pe")))) {
      return i;
    }
  }
  return 0;
}

function extractRows(rows: string[][], headerRow: number, colMap: ColMap) {
  const data = rows.slice(headerRow + 1);
  let lastBoss = "";
  const result: { itemName: string; priority: string; boss?: string; notes?: string }[] = [];

  for (const row of data) {
    const item  = colMap.item  >= 0 ? (row[colMap.item]  ?? "").trim() : "";
    const prio  = colMap.prio  >= 0 ? (row[colMap.prio]  ?? "").trim() : "";
    const boss  = colMap.boss  >= 0 ? (row[colMap.boss]  ?? "").trim() : "";
    const notes = colMap.notes >= 0 ? (row[colMap.notes] ?? "").trim() : "";

    if (boss) lastBoss = boss;
    if (!item || !prio) continue;
    // Skip section header rows (item cell contains raid name or long description)
    if (item.length > 60 || item.toLowerCase().includes("vault") || item.toLowerCase().includes("terrace")) continue;

    result.push({ itemName: item, priority: prio, boss: lastBoss || undefined, notes: notes || undefined });
  }
  return result;
}

export function DriveSheetPicker({ onRowsSelected, onClose }: Props) {
  const [connected,    setConnected]    = useState<boolean | null>(null);
  const [search,       setSearch]       = useState("");
  const [files,        setFiles]        = useState<DriveFile[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [allTabs,      setAllTabs]      = useState<string[]>([]);
  const [tabConfigs,   setTabConfigs]   = useState<TabConfig[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [previewing,   setPreviewing]   = useState<string | null>(null); // which tab to preview
  const [previewRows,  setPreviewRows]  = useState<string[][]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch("/api/drive?status=1").then(r => r.json()).then(d => setConnected(d.connected));
  }, []);

  useEffect(() => {
    if (!connected) return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/drive?q=${encodeURIComponent(search)}`);
        const d = await r.json();
        setFiles(d.files ?? []);
      } finally { setSearching(false); }
    }, 400);
  }, [search, connected]);

  async function selectFile(file: DriveFile) {
    setSelectedFile(file);
    setLoading(true);
    try {
      const r = await fetch(`/api/drive/sheet?id=${file.id}`);
      const d = await r.json() as { tabs: string[]; preview: string[][] };
      const tabs = d.tabs ?? [];
      setAllTabs(tabs);
      const lootTabs = tabs.filter(t =>
        t.toLowerCase().includes("loot") || t.toLowerCase().includes("physical") ||
        t.toLowerCase().includes("caster") || t.toLowerCase().includes("magic") ||
        t.toLowerCase().includes("tank") || t.toLowerCase().includes("heal")
      );
      const toEnable = lootTabs.length > 0 ? lootTabs : tabs;
      // Init all configs with empty rows — they load on click
      setTabConfigs(tabs.map(tab => ({
        tab, enabled: toEnable.includes(tab),
        colMap: { item: -1, prio: -1, boss: -1, notes: -1 },
        headerRow: 0,
      })));
      // Auto-load the first enabled tab
      const firstEnabled = toEnable[0];
      if (firstEnabled) {
        setPreviewing(firstEnabled);
        await loadTabData(file.id, firstEnabled);
      }
    } finally { setLoading(false); }
  }

  async function loadTabData(fileId: string, tab: string) {
    const r = await fetch(`/api/drive/sheet?id=${fileId}&tabs=${encodeURIComponent(tab)}`);
    const d = await r.json() as { sheets: { tab: string; rows: string[][] }[] };
    const rows = d.sheets?.[0]?.rows ?? [];
    const hRow = findHeaderRow(rows);
    const cols = detectCols(rows[hRow] ?? []);
    setTabConfigs(prev => prev.map(tc => tc.tab === tab ? { ...tc, colMap: cols, headerRow: hRow } : tc));
    return rows;
  }

  async function switchTab(tab: string) {
    if (!selectedFile) return;
    setPreviewing(tab);
    setLoading(true);
    try {
      const rows = await loadTabData(selectedFile.id, tab);
      setPreviewRows(rows);
    } finally { setLoading(false); }
  }

  async function handleImport() {
    if (!selectedFile) return;
    const enabledTabs = tabConfigs.filter(tc => tc.enabled);
    if (!enabledTabs.length) return;

    setLoading(true);
    try {
      const r = await fetch(
        `/api/drive/sheet?id=${selectedFile.id}&tabs=${encodeURIComponent(enabledTabs.map(tc => tc.tab).join(","))}`
      );
      const d = await r.json() as { sheets: { tab: string; rows: string[][] }[] };

      const allRows: { itemName: string; priority: string; boss?: string; notes?: string }[] = [];
      for (const { tab, rows } of (d.sheets ?? [])) {
        const tc = tabConfigs.find(c => c.tab === tab);
        if (!tc) continue;
        const hRow = findHeaderRow(rows);
        const cols = detectCols(rows[hRow] ?? []);
        allRows.push(...extractRows(rows, hRow, cols));
      }
      onRowsSelected(allRows);
    } finally { setLoading(false); }
  }

  const currentConfig = tabConfigs.find(tc => tc.tab === previewing);
  const previewExtracted = currentConfig ? extractRows(previewRows, currentConfig.headerRow, currentConfig.colMap).slice(0, 6) : [];
  const enabledCount = tabConfigs.filter(tc => tc.enabled).length;
  const headers = currentConfig ? (previewRows[currentConfig.headerRow] ?? []) : [];

  if (connected === null) {
    return <div className="flex items-center justify-center p-8 text-[--color-text-muted] text-sm">Checking Google connection…</div>;
  }

  if (!connected) {
    return (
      <div className="space-y-4 text-center py-6">
        <p className="text-sm text-[--color-text-muted]">Connect your Google account to browse Drive sheets.</p>
        <a href="/api/auth/google" className="inline-block btn-gold-solid">Connect Google Drive</a>
        <p className="text-xs text-[--color-text-muted]">Only Drive read access is requested.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div className="space-y-3">
          <input type="text" placeholder="Search your Drive for spreadsheets…" value={search}
            onChange={e => setSearch(e.target.value)} className="field" autoFocus />
          {searching && <p className="text-xs text-[--color-text-muted] animate-pulse">Searching…</p>}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {files.map(f => (
              <button key={f.id} onClick={() => selectFile(f)}
                className="w-full text-left px-3 py-2 rounded border border-[--color-border] hover:border-[--color-gold]/50 hover:bg-[--color-gold]/5 transition-colors">
                <div className="text-sm font-medium text-[--color-text]">{f.name}</div>
                <div className="text-xs text-[--color-text-muted]">Modified {new Date(f.modifiedTime).toLocaleDateString()}</div>
              </button>
            ))}
            {!searching && files.length === 0 && (
              <p className="text-xs text-[--color-text-muted] py-2">{search ? "No sheets found." : "Type to search, or leave blank to see recent sheets."}</p>
            )}
          </div>
          <div className="flex justify-between items-center">
            <button onClick={async () => { await fetch("/api/drive", { method: "DELETE" }); setConnected(false); }}
              className="text-xs text-[--color-text-muted] hover:text-red-400 underline">Disconnect Google</button>
            <button onClick={onClose} className="btn-secondary text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={() => { setSelectedFile(null); setTabConfigs([]); setAllTabs([]); }}
            className="text-xs text-[--color-gold] hover:underline">← {selectedFile.name}</button>

          {loading && <p className="text-xs text-[--color-text-muted] animate-pulse">Loading…</p>}

          {/* Tab checkboxes */}
          {allTabs.length > 0 && (
            <div>
              <p className="text-xs text-[--color-text-muted] mb-2">Click a tab to preview · check to include in import:</p>
              <div className="flex flex-wrap gap-2">
                {allTabs.map(tab => {
                  const tc = tabConfigs.find(c => c.tab === tab);
                  const isActive = previewing === tab;
                  return (
                    <div key={tab} className={`flex items-center gap-0 rounded border overflow-hidden text-xs transition-colors ${
                      isActive ? "border-[--color-gold]" : "border-[--color-border]"
                    }`}>
                      <button
                        onClick={() => switchTab(tab)}
                        className={`px-2.5 py-1.5 transition-colors ${
                          isActive ? "bg-[--color-gold]/10 text-[--color-gold]" : "text-[--color-text-muted] hover:text-[--color-text]"
                        }`}
                      >
                        {tab}
                      </button>
                      <label className={`flex items-center px-2 py-1.5 border-l cursor-pointer transition-colors ${
                        isActive ? "border-[--color-gold]/30" : "border-[--color-border]"
                      } ${tc?.enabled ? "bg-[--color-gold]/10" : "hover:bg-white/5"}`}>
                        <input
                          type="checkbox"
                          checked={tc?.enabled ?? false}
                          className="accent-amber-400 cursor-pointer"
                          onChange={e => setTabConfigs(prev => prev.map(c => c.tab === tab ? { ...c, enabled: e.target.checked } : c))}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Column mapping for previewed tab */}
          {currentConfig && headers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[--color-text-muted]">
                Column mapping for <span className="text-[--color-text]">{previewing}</span>
                {" "}(auto-detected, adjust if wrong):
              </p>
              <div className="flex flex-wrap gap-3">
                {(["item", "prio", "boss", "notes"] as const).map(field => (
                  <div key={field}>
                    <label className="block text-[10px] text-[--color-text-muted] mb-0.5 uppercase">{field}</label>
                    <select
                      value={currentConfig.colMap[field]}
                      onChange={e => setTabConfigs(prev => prev.map(tc =>
                        tc.tab === previewing ? { ...tc, colMap: { ...tc.colMap, [field]: Number(e.target.value) } } : tc
                      ))}
                      className="field text-xs w-36 py-1"
                    >
                      <option value={-1}>— skip —</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview rows */}
          {previewExtracted.length > 0 && (
            <div className="overflow-auto max-h-40 rounded border border-[--color-border]">
              <table className="data-table text-xs w-full">
                <thead>
                  <tr><th>Item</th><th>Priority</th><th>Boss</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {previewExtracted.map((r, i) => (
                    <tr key={i}>
                      <td>{r.itemName}</td>
                      <td className="font-mono text-[11px] text-[--color-gold]/80">{r.priority}</td>
                      <td className="text-[--color-text-muted]">{r.boss ?? ""}</td>
                      <td className="text-[--color-text-muted] text-[10px]">{r.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleImport} disabled={loading || enabledCount === 0}
              className="btn-gold-solid disabled:opacity-40">
              {loading ? "Loading…" : `Import ${enabledCount} tab${enabledCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
