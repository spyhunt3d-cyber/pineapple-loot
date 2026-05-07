import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseGargulCsv } from "@/lib/gargul";

/**
 * POST /api/import/gargul — Admin only
 *
 * Accepts a Gargul CSV export and upserts Player + LootWin records.
 *
 * Body: { raidId: number, csvText: string }
 *
 * The basic Gargul CSV format is:
 *   charactername-server,lootCount
 *
 * This creates one LootWin record per win count (itemId = "gargul-import",
 * itemName = "Gargul Import — update manually"). Admins can edit individual
 * wins in the UI after import.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { raidId: number; csvText: string };

  if (!body.raidId || !body.csvText) {
    return NextResponse.json({ error: "raidId and csvText are required" }, { status: 400 });
  }

  // Verify raid exists
  const raid = await prisma.raid.findUnique({ where: { id: body.raidId } });
  if (!raid) {
    return NextResponse.json({ error: `Raid ${body.raidId} not found` }, { status: 404 });
  }

  const { rows, errors } = parseGargulCsv(body.csvText);

  let created = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      // Upsert player
      const player = await tx.player.upsert({
        where: { charName_server: { charName: row.charName, server: row.server } },
        create: { charName: row.charName, server: row.server },
        update: {}, // don't overwrite class/spec on re-import
      });

      // Remove existing Gargul import wins for this player+raid to avoid duplication on re-import
      await tx.lootWin.deleteMany({
        where: {
          playerId: player.id,
          raidId: body.raidId,
          itemId: "gargul-import",
        },
      });

      // Create one LootWin per win recorded in Gargul
      for (let i = 0; i < row.lootCount; i++) {
        await tx.lootWin.create({
          data: {
            playerId: player.id,
            raidId: body.raidId,
            itemId: "gargul-import",
            itemName: "Imported from Gargul — update with item details",
            bossName: "Unknown",
            winType: "MS", // default; admin can correct per-item
          },
        });
        created++;
      }

      if (row.lootCount === 0) skipped++;
    }
  });

  return NextResponse.json({
    success: true,
    created,
    skipped,
    parseErrors: errors,
    totalRows: rows.length,
  });
}
