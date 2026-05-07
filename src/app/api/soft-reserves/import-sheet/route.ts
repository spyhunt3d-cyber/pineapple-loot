/**
 * POST /api/soft-reserves/import-sheet
 * Import soft reserves + stacking data from the THI Google Sheet format.
 * Expects rows from Item 1 or Item 2 tab:
 *   Name | Class | (Item 1 ID or Item 2 ID) | Item Name | From (instance) | Stack 1 | Stack 2 | Total Active SR's | ...
 * Updates weeksConsecutive on matching SoftReserve records for the given weekId.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

interface SheetRow {
  playerName:  string;
  itemId:      string;
  itemName:    string;
  instance:    string;
  totalStacks: number;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { weekId, rows } = await req.json() as { weekId: number; rows: SheetRow[] };

    if (!weekId || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "weekId and rows required" }, { status: 400 });
    }

    // Load all players keyed by lowercase name
    const players = await prisma.player.findMany({ select: { id: true, charName: true } });
    const playerMap = new Map(players.map(p => [p.charName.toLowerCase(), p.id]));

    // Load existing soft reserves for this week
    const existing = await prisma.softReserve.findMany({
      where: { weekId },
      select: { id: true, playerId: true, itemId: true, weeksConsecutive: true },
    });
    const srMap = new Map(existing.map(sr => [`${sr.playerId}:${sr.itemId}`, sr]));

    let updated = 0, created = 0, unmatched = 0;

    // Load raids for this week for raidId
    const raids = await prisma.raid.findMany({ where: { weekId }, orderBy: { night: "asc" } });
    const raidId = raids[0]?.id;
    if (!raidId) return NextResponse.json({ error: "No raid found for this week" }, { status: 400 });

    for (const row of rows) {
      if (!row.playerName?.trim() || !row.itemId?.trim()) continue;

      const playerId = playerMap.get(row.playerName.toLowerCase().trim());
      if (!playerId) { unmatched++; continue; }

      const itemId = String(row.itemId).trim();
      const key    = `${playerId}:${itemId}`;
      const sr     = srMap.get(key);

      if (sr) {
        // Update stacking weeks on existing reserve
        await prisma.softReserve.update({
          where: { id: sr.id },
          data:  { weeksConsecutive: row.totalStacks || 1 },
        });
        updated++;
      } else {
        // Create new reserve record
        await prisma.softReserve.upsert({
          where:  { playerId_weekId_itemId: { playerId, weekId, itemId } },
          create: {
            playerId, weekId, raidId, itemId,
            itemName: row.itemName?.trim() || `Item ${itemId}`,
            bossName: "Unknown",
            weeksConsecutive: row.totalStacks || 1,
          },
          update: { weeksConsecutive: row.totalStacks || 1 },
        });
        created++;
      }
    }

    return NextResponse.json({ updated, created, unmatched, total: rows.length });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("[POST /api/soft-reserves/import-sheet]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
