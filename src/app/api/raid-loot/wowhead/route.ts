import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWowheadTooltip } from "@/lib/wowhead-parser";
import { BRANDING } from "@/lib/branding";

const WOWHEAD_HOST = process.env.WOWHEAD_HOST ?? "nether.wowhead.com";

/** GET /api/raid-loot/wowhead?itemId=12345 — returns { name, ilvl, icon, stats, itemType } */
export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("itemId")?.trim();
  if (!itemId || !/^\d{1,10}$/.test(itemId)) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const cached = await prisma.itemCache.findUnique({ where: { itemId } });
  if (cached && !cached.itemName.startsWith("Item ")) {
    return NextResponse.json({ name: cached.itemName, icon: cached.iconName, ilvl: null });
  }

  try {
    const res = await fetch(
      `https://${WOWHEAD_HOST}/tooltip/item/${itemId}?dataEnv=15&locale=0`,
      { headers: { Accept: "application/json", "User-Agent": BRANDING.userAgent }, cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await res.json() as Record<string, unknown>;
    const name    = typeof data.name    === "string" ? data.name    : null;
    const icon    = typeof data.icon    === "string" ? data.icon    : null;
    const tooltip = typeof data.tooltip === "string" ? data.tooltip : "";
    const parsed  = parseWowheadTooltip(tooltip);

    if (name && !name.startsWith("Item ")) {
      await prisma.itemCache.upsert({
        where:  { itemId },
        create: { itemId, itemName: name, iconName: icon },
        update: { itemName: name, iconName: icon, cachedAt: new Date() },
      });
    }

    return NextResponse.json({ name, icon, ilvl: parsed.ilvl, stats: parsed.stats, itemType: parsed.itemType });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
