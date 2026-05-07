"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function ExportPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPreview() {
    setLoading(true);
    try {
      const res = await fetch("/api/export/gargul?download=false");
      if (!res.ok) {
        toast.error("Failed to generate export");
        return;
      }
      const json = await res.json();
      setPreview(JSON.stringify(json, null, 2));
    } finally {
      setLoading(false);
    }
  }

  function downloadExport() {
    window.open("/api/export/gargul?download=true", "_blank");
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--color-gold]">Export for Gargul</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Download the loot priority list as a Gargul-compatible JSON file to import in-game.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={loadPreview}
          disabled={loading}
          className="rounded-md border border-[--color-border] bg-[--color-surface-2] px-4 py-2 text-sm text-[--color-text] hover:bg-[--color-surface] disabled:opacity-40 transition-colors"
        >
          {loading ? "Loading…" : "Preview JSON"}
        </button>

        <button
          onClick={downloadExport}
          className="rounded-md bg-[--color-gold] px-4 py-2 text-sm font-semibold text-black hover:bg-[--color-gold-light] transition-colors"
        >
          ↓ Download gargul-priority.json
        </button>
      </div>

      {preview && (
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[--color-border] px-4 py-2">
            <span className="text-xs text-[--color-text-muted]">gargul-priority.json</span>
            <button
              onClick={() => { navigator.clipboard.writeText(preview); toast.success("Copied!"); }}
              className="text-xs text-[--color-gold] hover:underline"
            >
              Copy
            </button>
          </div>
          <pre className="p-4 text-xs text-[--color-text] overflow-auto max-h-96 font-mono">
            {preview}
          </pre>
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
