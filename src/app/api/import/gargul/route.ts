import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { parseIdParam, ValidationError } from "@/lib/validate";
import { parseGargulCsv } from "@/lib/gargul";

const MAX_CSV_BYTES = 512 * 1024;
const MAX_ROWS      = 5_000;

// ─── Loot Distribution format parser ─────────────────────────
// dateTime,character,itemID,offspec,id

interface LootDistRow {
  charName:  string;
  itemId:    string;
  winType:   "MS" | "OS";
  gargulId:  string; // unique per award from Gargul — used for deduplication
}

function parseLootDistribution(csv: string): LootDistRow[] {
  const rows: LootDistRow[] = [];
  const lines = csv.trim().split("\n");
  for (let i = 1; i < lines.length; i++) {  // skip header
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",");
    if (cols.length < 4) continue;
    const charName  = cols[1]?.trim().toLowerCase();
    const itemId    = cols[2]?.trim();
    const offspec   = cols[3]?.trim() === "1";
    const gargulId  = cols[4]?.trim() ?? "";
    if (!charName || !itemId || isNaN(Number(itemId))) continue;
    rows.push({ charName, itemId, winType: offspec ? "OS" : "MS", gargulId });
  }
  return rows;
}

// ─── Route ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json() as Record<string, unknown>;
    const raidId  = parseIdParam(String(body.raidId ?? ""));
    const csvText = typeof body.csvText === "string" ? body.csvText : "";
    const format  = typeof body.format  === "string" ? body.format  : "award-session";

    if (!csvText.trim()) return NextResponse.json({ error: "csvText is required" }, { status: 400 });
    if (csvText.length > MAX_CSV_BYTES) return NextResponse.json({ error: "CSV too large (max 512 KB)" }, { status: 413 });

    const raid = await prisma.raid.findUnique({ where: { id: raidId } });
    if (!raid) return NextResponse.json({ error: `Raid ${raidId} not found` }, { status: 404 });

    const defaultServer = process.env.NEXT_PUBLIC_GUILD_REALM?.toLowerCase() ?? "galakrond";

    // ── Loot Distribution format ──────────────────────────────
    if (format === "loot-distribution") {
      const rows = parseLootDistribution(csvText);
      if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Too many rows (${rows.length}); max ${MAX_ROWS}` }, { status: 400 });

      // Resolve all item IDs from RaidLoot table in one query
      const itemIds = [...new Set(rows.map(r => r.itemId))];
      const raidLootItems = await prisma.raidLoot.findMany({
        where: { itemId: { in: itemIds } },
        select: { itemId: true, itemName: true, bossName: true },
      });
      const itemMap = new Map(raidLootItems.map(i => [i.itemId, i]));

      // Pre-load existing gargulIds for this raid to skip already-imported awards
      const existingWins = await prisma.lootWin.findMany({
        where:  { raidId },
        select: { gargulId: true },
      });
      const importedIds = new Set(existingWins.map(w => w.gargulId).filter(Boolean) as string[]);

      let created = 0, skipped = 0, unresolved = 0;
      const unresolvedIds = new Set<string>();

      const BATCH = 50;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        await prisma.$transaction(async (tx) => {
          for (const row of batch) {
            // Skip already-imported awards (idempotent re-import)
            if (row.gargulId && importedIds.has(row.gargulId)) {
              skipped++;
              continue;
            }

            const lootInfo = itemMap.get(row.itemId);
            if (!lootInfo) {
              unresolvedIds.add(row.itemId);
              unresolved++;
            }

            // Find or create player by charName (match any server, create with default)
            let player = await tx.player.findFirst({ where: { charName: row.charName } });
            if (!player) {
              player = await tx.player.create({
                data: { charName: row.charName, server: defaultServer, active: true },
              });
            }

            await tx.lootWin.create({
              data: {
                playerId: player.id,
                raidId,
                itemId:   row.itemId,
                itemName: lootInfo?.itemName ?? `Item ${row.itemId}`,
                bossName: lootInfo?.bossName ?? "Unknown",
                winType:  row.winType,
                gargulId: row.gargulId || null,
              },
            });
            created++;
            if (row.gargulId) importedIds.add(row.gargulId);
          }
        });
      }

      return NextResponse.json({ created, skipped, unresolved: unresolvedIds.size });
    }

    // ── Award Session format (legacy: name-server,count) ─────
    const { rows, errors } = parseGargulCsv(csvText);
    if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Too many rows (${rows.length}); max ${MAX_ROWS}` }, { status: 400 });

    let created = 0, skipped = 0;

    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await prisma.$transaction(async (tx) => {
        for (const row of batch) {
          const player = await tx.player.upsert({
            where:  { charName_server: { charName: row.charName, server: row.server } },
            create: { charName: row.charName, server: row.server },
            update: {},
          });

          await tx.lootWin.deleteMany({
            where: { playerId: player.id, raidId, itemId: "gargul-import" },
          });

          for (let j = 0; j < row.lootCount; j++) {
            await tx.lootWin.create({
              data: {
                playerId: player.id,
                raidId,
                itemId:   "gargul-import",
                itemName: "Imported from Gargul — update with item details",
                bossName: "Unknown",
                winType:  "MS",
              },
            });
            created++;
          }

          if (row.lootCount === 0) skipped++;
        }
      });
    }

    return NextResponse.json({ created, skipped, parseErrors: errors, totalRows: rows.length });
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[POST /api/import/gargul]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
