import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRollRange } from "@/lib/roll-calculator";

/**
 * GET /api/soft-reserves — Public
 *
 * Returns soft reserves with computed roll ranges.
 * Query params:
 *   ?weekId=1           — filter by raid week (required for meaningful results)
 *   ?raidId=1           — filter by specific raid night
 *   ?playerId=1         — filter by player
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weekId = searchParams.get("weekId");
  const raidId = searchParams.get("raidId");
  const playerId = searchParams.get("playerId");

  const reserves = await prisma.softReserve.findMany({
    where: {
      ...(weekId ? { weekId: parseInt(weekId, 10) } : {}),
      ...(raidId ? { raidId: parseInt(raidId, 10) } : {}),
      ...(playerId ? { playerId: parseInt(playerId, 10) } : {}),
    },
    include: {
      player: true,
      raid: true,
      week: true,
    },
    orderBy: [
      { week: { weekStart: "desc" } },
      { player: { charName: "asc" } },
    ],
  });

  // Attach computed roll ranges to each reserve
  const enriched = reserves.map((r) => ({
    ...r,
    rollRange: getRollRange(r.weeksConsecutive),
  }));

  return NextResponse.json({ reserves: enriched });
}
