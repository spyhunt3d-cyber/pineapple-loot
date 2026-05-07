import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slotToType, getTierTokenClasses } from "@/lib/wow-constants";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getZoneData } from "@/lib/raid-zones";
import { parseWowheadTooltip } from "@/lib/wowhead-parser";

const WOWHEAD_HOST = process.env.WOWHEAD_HOST ?? "nether.wowhead.com";

async function fetchWowheadStats(itemId: number) {
  try {
    const res = await fetch(
      `https://${WOWHEAD_HOST}/tooltip/item/${itemId}?dataEnv=15&locale=0`,
      { headers: { "User-Agent": "PineappleLootXpress/1.0" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    const tooltip = typeof data.tooltip === "string" ? data.tooltip : "";
    return parseWowheadTooltip(tooltip);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const instance = req.nextUrl.searchParams.get("instance") ?? "";
  const zone = getZoneData(instance);
  if (!zone) return NextResponse.json({ hasData: false }, { status: 404 });
  return NextResponse.json({
    hasData: true,
    instance: zone.instance,
    itemCount: zone.items.length,
    bosses: [...new Set(zone.items.map(i => i.boss))].length,
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { instance, softresId } = await req.json() as { instance: string; softresId?: string };

    type ItemEntry = { itemId: number; itemName: string; bossName: string; bossOrder: number; ilvl: number | null; itemSlot: string | null };
    let entries: ItemEntry[] = [];

    if (softresId?.trim()) {
      const res = await fetch(`https://softres.it/api/raid/${softresId.trim()}`, { cache: "no-store" });
      if (!res.ok) return NextResponse.json({ error: "Softres raid not found" }, { status: 404 });
      const data = await res.json() as Record<string, unknown>;
      const reserved = Array.isArray(data.reserved) ? data.reserved : [];
      const edition = typeof data.edition === "string" ? data.edition : "";
      const zone = getZoneData(edition) ?? getZoneData(instance);
      const itemMap = new Map(zone?.items.map(i => [i.id, i]) ?? []);

      const seen = new Set<number>();
      for (const entry of reserved) {
        const e = entry as Record<string, unknown>;
        if (!Array.isArray(e.items)) continue;
        for (const id of e.items) {
          const n = Number(id);
          if (n <= 0 || seen.has(n)) continue;
          seen.add(n);
          const info = itemMap.get(n);
          entries.push({ itemId: n, itemName: info?.name ?? `Item ${n}`, bossName: info?.boss ?? "Unknown Boss", bossOrder: info?.bossOrder ?? 0, ilvl: info?.ilvl ?? null, itemSlot: info?.slot ?? null });
        }
      }
      if (entries.length === 0) return NextResponse.json({ error: "No items found in this Softres raid" }, { status: 400 });
    } else {
      const zone = getZoneData(instance);
      if (!zone) return NextResponse.json({ error: "No data for this raid" }, { status: 404 });
      entries = zone.items.map(item => ({ itemId: item.id, itemName: item.name, bossName: item.boss, bossOrder: item.bossOrder, ilvl: item.ilvl, itemSlot: item.slot }));
    }

    // ── Upsert rows then fetch stats from Wowhead in parallel ────────────
    const BATCH = 10;
    let created = 0, skipped = 0;

    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      await Promise.all(batch.map(async e => {
        if (e.itemName.startsWith("Item ")) { skipped++; return; }
        try {
          // Fetch Wowhead stats alongside the upsert
          const wh = await fetchWowheadStats(e.itemId);
          const isToken = getTierTokenClasses(e.itemName, instance) !== null;
          const resolvedType = isToken ? "Token" : (wh?.itemType ?? slotToType(e.itemSlot) ?? undefined);
          await prisma.raidLoot.upsert({
            where:  { itemId_instance: { itemId: String(e.itemId), instance } },
            create: {
              itemId: String(e.itemId), itemName: e.itemName, instance,
              bossName: e.bossName, bossOrder: e.bossOrder,
              ilvl: wh?.ilvl ?? e.ilvl,
              itemSlot: e.itemSlot,
              itemType: resolvedType,
              stats: wh?.stats && Object.keys(wh.stats).length > 0 ? (wh.stats as never) : undefined,
            },
            update: {
              itemName: e.itemName, bossName: e.bossName, bossOrder: e.bossOrder,
              ilvl: wh?.ilvl ?? e.ilvl,
              itemSlot: e.itemSlot,
              itemType: resolvedType,
              stats: wh?.stats && Object.keys(wh.stats).length > 0 ? (wh.stats as never) : undefined,
            },
          });
          created++;
        } catch { skipped++; }
      }));
    }

    return NextResponse.json({ ok: true, created, skipped, total: entries.length });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("[POST /api/raid-loot/populate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
