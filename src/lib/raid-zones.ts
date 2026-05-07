/**
 * Zone loot data sourced from Softres.it's item database.
 * Covers all 83 raid instances across Classic, TBC, WotLK, Cata, MoP.
 * Items include name, ilvl, boss, and slot — no Wowhead calls needed.
 */

import zoneDataRaw from "./softres-zone-data.json";

export interface SoftresItem {
  id: number;
  name: string;
  ilvl: number | null;
  boss: string;
  bossOrder: number;
  slot: string | null;
}

export interface ZoneData {
  instance: string;
  slug: string;
  items: SoftresItem[];
}

const { slugToName, zones } = zoneDataRaw as {
  slugToName: Record<string, string>;
  zones: Record<string, SoftresItem[]>;
};

/** Map instance display name → Softres slug (case-insensitive fuzzy match) */
function findSlug(instance: string): string | null {
  const q = instance.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Direct slug match
  if (zones[q]) return q;

  // Match via display name
  for (const [slug, name] of Object.entries(slugToName)) {
    const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (n === q || n.includes(q) || q.includes(n)) return slug;
  }

  // Partial slug match
  for (const slug of Object.keys(zones)) {
    if (slug.includes(q) || q.includes(slug)) return slug;
  }

  return null;
}

export function getZoneData(instance: string): ZoneData | null {
  const slug = findSlug(instance);
  if (!slug || !zones[slug]) return null;
  const displayName = slugToName[slug] ?? instance;
  return { instance: displayName, slug, items: zones[slug] };
}

export function getAllSlugs(): { slug: string; name: string; itemCount: number }[] {
  return Object.entries(slugToName).map(([slug, name]) => ({
    slug,
    name,
    itemCount: zones[slug]?.length ?? 0,
  })).filter(x => x.itemCount > 0);
}
