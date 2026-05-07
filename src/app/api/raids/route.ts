import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { fetchSoftresRaid, resolveItemNames } from "@/lib/softres";
import { SPEC_ID_MAP } from "@/lib/wow-constants";

/**
 * GET /api/raids — Public, returns all raids with their week
 */
export async function GET() {
  const raids = await prisma.raid.findMany({
    include: { week: true },
    orderBy: { raidDate: "desc" },
  });
  return NextResponse.json({ raids });
}

/**
 * POST /api/raids — Admin only.
 *
 * Creates a raid for a given week. After creation, automatically:
 * 1. Fetches reserves from Softres.it for this raidId
 * 2. Upserts Player records for any new characters
 * 3. Computes weeksConsecutive by comparing to the previous week's reserves
 * 4. Stores SoftReserve rows for this week
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    softresId: string;
    instance: string;
    raidDate: string;
    night: number;
    weekId: number;
  };

  if (!body.softresId || !body.instance || !body.raidDate || !body.weekId || !body.night) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (body.night !== 1 && body.night !== 2) {
    return NextResponse.json({ error: "night must be 1 or 2" }, { status: 400 });
  }

  // Create the raid record first
  const raid = await prisma.raid.create({
    data: {
      softresId: body.softresId.trim(),
      instance: body.instance.trim(),
      raidDate: new Date(body.raidDate),
      night: body.night,
      weekId: body.weekId,
    },
  });

  // Kick off background sync of Softres reserves for this raid
  // We do this in the same request but don't fail the raid creation if it errors
  try {
    await syncSoftresReserves(raid.id, body.softresId, body.weekId);
  } catch (err) {
    // Log but don't fail — raid is created, reserves can be re-synced
    console.error(`Reserve sync failed for raid ${raid.id}:`, err);
  }

  const raidWithWeek = await prisma.raid.findUnique({
    where: { id: raid.id },
    include: { week: true },
  });

  return NextResponse.json({ raid: raidWithWeek }, { status: 201 });
}

/**
 * Syncs Softres.it reserves into the DB for the given raid.
 * Automatically computes weeksConsecutive by comparing against the previous week.
 */
async function syncSoftresReserves(raidId: number, softresId: string, weekId: number) {
  // Find the previous week's reserves for streak comparison
  const currentWeek = await prisma.raidWeek.findUnique({ where: { id: weekId } });
  if (!currentWeek) throw new Error(`Week ${weekId} not found`);

  const prevWeek = await prisma.raidWeek.findFirst({
    where: { weekStart: { lt: currentWeek.weekStart } },
    orderBy: { weekStart: "desc" },
  });

  // Build a map of playerName+itemId → weeksConsecutive from the previous week
  const prevReserveMap = new Map<string, number>();
  if (prevWeek) {
    const prevReserves = await prisma.softReserve.findMany({
      where: { weekId: prevWeek.id },
      include: { player: true },
    });
    for (const r of prevReserves) {
      const key = `${r.player.charName}|${r.itemId}`;
      prevReserveMap.set(key, r.weeksConsecutive);
    }
  }

  // Fetch live reserves from Softres
  const raidData = await fetchSoftresRaid(softresId);
  const itemNames = await resolveItemNames(raidData.itemIds);

  // Upsert players and reserves in a transaction
  await prisma.$transaction(async (tx) => {
    for (const entry of raidData.entries) {
      // Upsert player — server defaults to "unknown" if not in Softres data
      const player = await tx.player.upsert({
        where: { charName_server: { charName: entry.name.toLowerCase(), server: "unknown" } },
        create: {
          charName: entry.name.toLowerCase(),
          server: "unknown",
          class: entry.class ?? null,
          spec: SPEC_ID_MAP[entry.spec]?.spec ?? null,
        },
        update: {
          // Update class/spec if Softres has newer data
          class: entry.class ?? undefined,
          spec: SPEC_ID_MAP[entry.spec]?.spec ?? undefined,
        },
      });

      // Upsert each of this player's reserves (up to 2)
      for (const itemId of entry.items) {
        const idStr = String(itemId);
        const itemName = itemNames[idStr] ?? `Item ${itemId}`;
        const key = `${player.charName}|${idStr}`;
        const prevWeeks = prevReserveMap.get(key) ?? 0;
        const weeksConsecutive = Math.min(prevWeeks + 1, 6); // cap at 6

        await tx.softReserve.upsert({
          where: { playerId_weekId_itemId: { playerId: player.id, weekId, itemId: idStr } },
          create: {
            playerId: player.id,
            raidId,
            weekId,
            itemId: idStr,
            itemName,
            bossName: "Unknown", // Softres API doesn't return boss per item — updated via priority sheet
            weeksConsecutive,
          },
          update: {
            itemName,
            weeksConsecutive,
          },
        });
      }
    }
  });
}
