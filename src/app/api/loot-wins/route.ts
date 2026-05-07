import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { requireString, validateWinType, ValidationError, parseIdParam } from "@/lib/validate";

const VALID_WIN_TYPES = ["MS", "SR", "PRIO", "OS"] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const playerIdRaw = searchParams.get("playerId");
    const raidIdRaw   = searchParams.get("raidId");
    const winTypeRaw  = searchParams.get("winType");

    const playerId = playerIdRaw ? parseIdParam(playerIdRaw) : undefined;
    const raidId   = raidIdRaw   ? parseIdParam(raidIdRaw)   : undefined;
    const winType  = winTypeRaw
      ? (VALID_WIN_TYPES.includes(winTypeRaw as never) ? winTypeRaw : undefined)
      : undefined;

    const wins = await prisma.lootWin.findMany({
      where: {
        ...(playerId ? { playerId } : {}),
        ...(raidId   ? { raidId }   : {}),
        ...(winType  ? { winType: winType as "MS" | "SR" | "PRIO" | "OS" } : {}),
      },
      include: { player: true, raid: { include: { week: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Enrich unknown boss names from RaidLoot table for real item IDs
    const unknownItemIds = [...new Set(
      wins.filter(w => w.bossName === "Unknown" && w.itemId !== "gargul-import").map(w => w.itemId)
    )];
    const raidLootMap = new Map<string, { bossName: string; itemName: string }>();
    if (unknownItemIds.length > 0) {
      const rl = await prisma.raidLoot.findMany({
        where: { itemId: { in: unknownItemIds } },
        select: { itemId: true, bossName: true, itemName: true },
      });
      for (const r of rl) raidLootMap.set(r.itemId, { bossName: r.bossName, itemName: r.itemName });
    }

    const enriched = wins.map(w => {
      const lookup = w.itemId !== "gargul-import" ? raidLootMap.get(w.itemId) : undefined;
      return {
        ...w,
        bossName: (w.bossName === "Unknown" && lookup) ? lookup.bossName : w.bossName,
        itemName: (w.itemName.startsWith("Imported from") && lookup) ? lookup.itemName : w.itemName,
      };
    });

    return NextResponse.json({ wins: enriched });
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[GET /api/loot-wins]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body     = await req.json() as Record<string, unknown>;
    const playerId = parseIdParam(String(body.playerId ?? ""));
    const raidId   = parseIdParam(String(body.raidId ?? ""));
    const itemId   = requireString(body.itemId,   "itemId",   32);
    const itemName = requireString(body.itemName, "itemName", 256);
    const bossName = (typeof body.bossName === "string" && body.bossName.trim()) ? body.bossName.trim().slice(0, 128) : "Unknown";
    const winType  = validateWinType(body.winType ?? "MS");

    // Verify FK references exist
    const [player, raid] = await Promise.all([
      prisma.player.findUnique({ where: { id: playerId }, select: { id: true } }),
      prisma.raid.findUnique({ where: { id: raidId },     select: { id: true } }),
    ]);
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    if (!raid)   return NextResponse.json({ error: "Raid not found" },   { status: 404 });

    const win = await prisma.lootWin.create({
      data: { playerId, raidId, itemId, itemName, bossName, winType: winType as "MS" | "SR" | "PRIO" | "OS" },
      include: { player: true, raid: true },
    });
    return NextResponse.json({ win }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[POST /api/loot-wins]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
