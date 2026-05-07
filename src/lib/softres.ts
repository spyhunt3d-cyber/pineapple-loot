/**
 * Softres.it API client.
 *
 * The Softres API returns a flat array of player reserve entries.
 * Each entry has item IDs (not names) — we resolve names via the
 * ItemCache table (backed by Wowhead's tooltip API).
 *
 * API shape per player entry:
 *   { name, class, spec (numeric), items: [itemId, ...], note, created, updated, dId, dU }
 */

import { prisma } from "./prisma";
import { SPEC_ID_MAP } from "./wow-constants";

export interface SoftresEntry {
  name: string;
  class: string;
  spec: number;
  specName: string; // resolved from SPEC_ID_MAP
  items: number[];
  note: string;
  created: string;
  updated: string;
  dId?: string;
  dU?: string;
}

export interface SoftresRaidData {
  raidId: string;
  entries: SoftresEntry[];
  /** All unique item IDs referenced in this raid's reserves */
  itemIds: number[];
}

// Simple in-memory cache — keys are raidId strings, values expire after 5 min
const responseCache = new Map<string, { data: SoftresRaidData; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches and parses a Softres.it raid's reserve list.
 * Results are cached in-memory for 5 minutes.
 */
export async function fetchSoftresRaid(raidId: string): Promise<SoftresRaidData> {
  // Check in-memory cache first
  const cached = responseCache.get(raidId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(`https://softres.it/api/raid/${raidId}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 }, // also use Next.js fetch cache
  });

  if (!res.ok) {
    throw new Error(`Softres API error ${res.status} for raid ${raidId}`);
  }

  const raw: SoftresEntry[] = await res.json();

  // Normalize entries and collect all item IDs
  const itemIdSet = new Set<number>();
  const entries: SoftresEntry[] = raw.map((entry) => {
    entry.items.forEach((id) => itemIdSet.add(id));
    return {
      ...entry,
      specName: SPEC_ID_MAP[entry.spec]?.spec ?? `Spec ${entry.spec}`,
    };
  });

  const data: SoftresRaidData = {
    raidId,
    entries,
    itemIds: Array.from(itemIdSet),
  };

  responseCache.set(raidId, { data, fetchedAt: Date.now() });
  return data;
}

/** Clears the in-memory cache for a specific raid (or all raids) */
export function clearSoftresCache(raidId?: string) {
  if (raidId) {
    responseCache.delete(raidId);
  } else {
    responseCache.clear();
  }
}

/**
 * Resolves item IDs to names using the DB ItemCache.
 * For any IDs not in the cache, fetches from Wowhead tooltip API and stores them.
 * Returns a map of itemId → itemName.
 */
export async function resolveItemNames(
  itemIds: number[]
): Promise<Record<string, string>> {
  if (itemIds.length === 0) return {};

  const idStrings = itemIds.map(String);

  // Fetch from DB cache
  const cached = await prisma.itemCache.findMany({
    where: { itemId: { in: idStrings } },
  });

  const result: Record<string, string> = {};
  const cachedIds = new Set<string>();

  for (const item of cached) {
    result[item.itemId] = item.itemName;
    cachedIds.add(item.itemId);
  }

  // Find IDs not yet cached
  const missing = idStrings.filter((id) => !cachedIds.has(id));

  if (missing.length > 0) {
    // Fetch from Wowhead tooltip API in parallel (with a small concurrency limit)
    const resolved = await Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`https://www.wowhead.com/tooltip/item/${id}`, {
            headers: { Accept: "application/json" },
          });
          if (!res.ok) return { id, name: `Item ${id}` };
          const data = await res.json();
          return { id, name: data.name ?? `Item ${id}` };
        } catch {
          return { id, name: `Item ${id}` };
        }
      })
    );

    // Upsert into ItemCache and add to result
    for (const { id, name } of resolved) {
      result[id] = name;
      await prisma.itemCache.upsert({
        where: { itemId: id },
        create: { itemId: id, itemName: name },
        update: { itemName: name, cachedAt: new Date() },
      });
    }
  }

  return result;
}
