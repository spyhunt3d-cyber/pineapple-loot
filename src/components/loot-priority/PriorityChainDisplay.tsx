"use client";

import { CLASS_COLORS, CLASS_ABBR } from "@/lib/wow-constants";

type PrioEntry = { class: string; spec: string };
type PrioChain = PrioEntry[][];

export function PriorityChainDisplay({ chain }: { chain: PrioChain | null }) {
  try {
    if (!chain || !Array.isArray(chain) || chain.length === 0) return <span className="text-[--color-text-muted]">—</span>;
    return (
      <span className="font-mono text-xs leading-relaxed">
        {chain.map((tier, ti) => (
          <span key={ti}>
            {ti > 0 && <span className="text-[--color-text-muted] mx-0.5">&gt;</span>}
            {Array.isArray(tier) && tier.map((e, ei) => {
              const abbr  = e?.class === "*" ? "All" : (CLASS_ABBR[e?.class ?? ""] ?? e?.class ?? "?");
              const color = e?.class === "*" ? undefined : (CLASS_COLORS[e?.class ?? ""] ?? "#e2e0d8");
              return (
                <span key={ei}>
                  {ei > 0 && <span className="text-[--color-text-muted] mx-0.5">=</span>}
                  <span style={{ color }} className="font-semibold">{abbr}</span>
                  <span className="text-[--color-text-muted]"> {e?.spec ?? "?"}</span>
                </span>
              );
            })}
          </span>
        ))}
      </span>
    );
  } catch {
    return <span className="text-[--color-text-muted]">—</span>;
  }
}
