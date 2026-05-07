"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { RAID_TIER_GROUPS, RAID_INSTANCE_GROUPS } from "@/lib/wow-constants";

export default function ExportPage() {
  const [preview,   setPreview]   = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [populated, setPopulated] = useState<string[]>([]);
  const [selection, setSelection] = useState("all"); // "all" | tier group label | instance name

  useEffect(() => {
    fetch("/api/raid-loot/instances")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.instances)) setPopulated(d.instances); });
  }, []);

  function buildUrl(download: boolean) {
    const base = `/api/export/gargul?download=${download}`;
    if (selection === "all") return base;
    const group = RAID_TIER_GROUPS.find(g => g.label === selection);
    if (group) return `${base}&instances=${encodeURIComponent(group.instances.join(","))}`;
    return `${base}&instance=${encodeURIComponent(selection)}`;
  }

  async function loadPreview() {
    setLoading(true);
    try {
      const res = await fetch(buildUrl(false));
      if (!res.ok) { toast.error("Failed to generate export"); return; }
      setPreview(JSON.stringify(await res.json(), null, 2));
    } finally { setLoading(false); }
  }

  function downloadExport() {
    window.open(buildUrl(true), "_blank");
  }

  const visibleTierGroups = RAID_TIER_GROUPS.filter(g => g.instances.some(i => populated.includes(i)));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="page-header">
        <h1 className="page-title">Export for Gargul</h1>
        <p className="page-subtitle">Download loot priority as a Gargul-compatible JSON file.</p>
      </div>

      {/* Scope selector */}
      <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-5 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
          Export scope
        </label>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelection("all")} className={`btn-tab ${selection === "all" ? "active" : ""}`}>
            All Raids
          </button>
          {visibleTierGroups.map(g => (
            <button key={g.label} onClick={() => setSelection(g.label)} className={`btn-tab ${selection === g.label ? "active" : ""}`}>
              {g.label}
            </button>
          ))}
          {populated.filter(i => !RAID_TIER_GROUPS.flatMap(g => g.instances).includes(i)).map(i => (
            <button key={i} onClick={() => setSelection(i)} className={`btn-tab ${selection === i ? "active" : ""}`}>
              {i}
            </button>
          ))}
        </div>
        {selection !== "all" && (
          <p className="text-xs text-[--color-text-muted]">
            Exporting: <span className="text-[--color-gold]">{selection}</span>
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={loadPreview} disabled={loading} className="btn-secondary">
          {loading ? "Loading…" : "Preview JSON"}
        </button>
        <button onClick={downloadExport} className="btn-gold-solid">
          ↓ Download gargul-priority.json
        </button>
      </div>

      {preview && (
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[--color-border] px-4 py-2">
            <span className="text-xs text-[--color-text-muted]">gargul-priority.json</span>
            <button onClick={() => { navigator.clipboard.writeText(preview); toast.success("Copied!"); }}
              className="text-xs text-[--color-gold] hover:underline">Copy</button>
          </div>
          <pre className="p-4 text-xs text-[--color-text] overflow-auto max-h-96 font-mono">{preview}</pre>
        </div>
      )}

      <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-5">
        <h2 className="text-sm font-semibold text-[--color-text-muted] mb-2">How to use in Gargul</h2>
        <ol className="space-y-1 text-sm text-[--color-text-muted] list-decimal list-inside">
          <li>Download the JSON file above</li>
          <li>In-game, open Gargul (<code className="text-[--color-gold-light]">/gargul</code>)</li>
          <li>Go to <strong>Loot Priority → Import</strong></li>
          <li>Paste the JSON content and confirm</li>
        </ol>
      </div>
    </div>
  );
}
