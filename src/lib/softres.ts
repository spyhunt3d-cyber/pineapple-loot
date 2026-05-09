/**
 * Softres.it API client.
 *
 * The Softres API returns a raid object with a `reserved` array.
 * Actual shape: { _id, raidId, edition, instance, discord, reserved: [...] }
 * Each reserve entry: { name, class, spec (numeric), items: [itemId, ...], note, created, updated }
 *
 * Item IDs come as numbers — we store them as strings in the DB.
 * Item names are resolved via the ItemCache table (backed by Wowhead).
 */

import { prisma } from "./prisma";
import { SPEC_ID_MAP } from "./wow-constants";
import { BRANDING } from "./branding";

// Wowhead subdomain — override via env for Classic realms
// e.g. WOWHEAD_HOST=wotlk.wowhead.com  or  classic.wowhead.com
const WOWHEAD_HOST = process.env.WOWHEAD_HOST ?? "www.wowhead.com";

export interface SoftresEntry {
  name: string;
  class: string;
  spec: number;
  specName: string;
  items: number[];
  note: string;
  created: string;
  updated: string;
  dId?: string;
  dU?: string;
}

export interface SoftresRaidData {
  raidId: string;
  edition: string;
  entries: SoftresEntry[];
  itemIds: number[];
}

// ─── In-memory cache ─────────────────────────────────────────
const responseCache = new Map<string, { data: SoftresRaidData; fetchedAt: number }>();
const CACHE_TTL_MS  = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

/** Runtime validation of a single reserve entry from Softres. */
function validateEntry(raw: unknown): raw is { name: string; class: string; spec: number; items: unknown[]; note?: string; created?: string; updated?: string; dId?: string; dU?: string } {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return typeof r.name === "string" && typeof r.class === "string" && Array.isArray(r.items);
}

/** Parse and validate the top-level Softres API response. */
function parseSoftresResponse(raw: unknown): { entries: SoftresEntry[]; edition: string } {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Softres API returned a non-object response");
  }

  const obj = raw as Record<string, unknown>;

  // API returns { _id, raidId, edition, instance, reserved: [...] }
  if (!Array.isArray(obj.reserved)) {
    throw new Error(`Softres response missing 'reserved' array. Keys: ${Object.keys(obj).join(", ")}`);
  }

  const edition = typeof obj.edition === "string" ? obj.edition : "unknown";

  const entries: SoftresEntry[] = [];
  for (const item of obj.reserved) {
    if (!validateEntry(item)) {
      console.warn("[softres] Skipping malformed entry:", JSON.stringify(item).slice(0, 100));
      continue;
    }
    // Only accept numeric item IDs; skip malformed ones
    const validItems = item.items
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);

    entries.push({
      name:     item.name,
      class:    item.class,
      spec:     typeof item.spec === "number" ? item.spec : 0,
      specName: SPEC_ID_MAP[item.spec as number]?.spec ?? `Spec ${item.spec}`,
      items:    validItems,
      note:     typeof item.note === "string" ? item.note : "",
      created:  typeof item.created === "string" ? item.created : "",
      updated:  typeof item.updated === "string" ? item.updated : "",
      dId:      typeof item.dId === "string" ? item.dId : undefined,
      dU:       typeof item.dU === "string" ? item.dU : undefined,
    });
  }

  return { entries, edition };
}

/**
 * Fetches and parses a Softres.it raid's reserve list.
 * Results are cached in-memory for 5 minutes.
 */
export async function fetchSoftresRaid(raidId: string): Promise<SoftresRaidData> {
  const cached = responseCache.get(raidId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(`https://softres.it/api/raid/${raidId}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": BRANDING.userAgent,
    },
    // Don't use Next.js fetch cache on top of our own — one TTL is enough
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Softres API error ${res.status} for raid ${raidId}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
    throw new Error(`Softres API returned non-JSON content-type: ${contentType}`);
  }

  const rawJson: unknown = await res.json();
  const { entries, edition } = parseSoftresResponse(rawJson);

  const itemIdSet = new Set<number>();
  for (const entry of entries) {
    for (const id of entry.items) itemIdSet.add(id);
  }

  const data: SoftresRaidData = {
    raidId,
    edition,
    entries,
    itemIds: Array.from(itemIdSet),
  };

  // Evict oldest entries if cache is full
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = [...responseCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0];
    if (oldest) responseCache.delete(oldest[0]);
  }

  responseCache.set(raidId, { data, fetchedAt: Date.now() });
  return data;
}

/** Clears the in-memory cache for a specific raid (or all). */
export function clearSoftresCache(raidId?: string) {
  if (raidId) responseCache.delete(raidId);
  else responseCache.clear();
}

// ─── Concurrency-limited fetch helper ────────────────────────
/** Run `tasks` with at most `limit` in flight at once. */
async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

/** Fetch one item name from Wowhead with one retry on 429. Returns null on failure. */
async function fetchItemName(id: string): Promise<{ id: string; name: string; icon: string | null } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://${WOWHEAD_HOST}/tooltip/item/${id}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": BRANDING.userAgent,
        },
      });

      if (res.status === 429) {
        // Back off 2 seconds before retry
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (!res.ok) return null;

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json") && !ct.includes("text/json")) return null;

      const data = await res.json() as Record<string, unknown>;
      const name = typeof data.name === "string" ? data.name : null;
      const icon = typeof data.icon === "string" ? data.icon : null;

      if (!name) return null;
      return { id, name, icon };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Resolves item IDs → names using DB ItemCache.
 * Fetches missing IDs from Wowhead (max 8 concurrent, retry on 429).
 * Never caches failure/placeholder names.
 */
export async function resolveItemNames(
  itemIds: number[]
): Promise<Record<string, string>> {
  if (itemIds.length === 0) return {};

  const idStrings = itemIds.map(String);

  // Load what's in DB — skip entries where name looks like a placeholder
  const cached = await prisma.itemCache.findMany({
    where: {
      itemId: { in: idStrings },
      NOT: { itemName: { startsWith: "Item " } },
    },
  });

  const result: Record<string, string> = {};
  const cachedIds = new Set<string>();

  for (const item of cached) {
    result[item.itemId] = item.itemName;
    cachedIds.add(item.itemId);
  }

  const missing = idStrings.filter((id) => !cachedIds.has(id));

  if (missing.length > 0) {
    const tasks = missing.map((id) => () => fetchItemName(id));
    const resolved = await pLimit(tasks, 8);

    for (const r of resolved) {
      if (!r) continue; // don't cache failures
      result[r.id] = r.name;
      await prisma.itemCache.upsert({
        where:  { itemId: r.id },
        create: { itemId: r.id, itemName: r.name, iconName: r.icon },
        update: { itemName: r.name, iconName: r.icon, cachedAt: new Date() },
      });
    }
  }

  return result;
}
