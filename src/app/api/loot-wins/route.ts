import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { WinType } from "@prisma/client";

/**
 * GET /api/loot-wins — Public
 * Query params: ?playerId=1, ?raidId=1, ?winType=MS|OS|SR|PRIO
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const playerId = searchParams.get("playerId");
  const raidId = searchParams.get("raidId");
  const winType = searchParams.get("winType") as WinType | null;

  const wins = await prisma.lootWin.findMany({
    where: {
      ...(playerId ? { playerId: parseInt(playerId, 10) } : {}),
      ...(raidId ? { raidId: parseInt(raidId, 10) } : {}),
      ...(winType ? { winType } : {}),
    },
    include: {
      player: true,
      raid: { include: { week: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ wins });
}

/** POST /api/loot-wins — Admin only, creates a manual loot win entry */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    playerId: number;
    raidId: number;
    itemId: string;
    itemName: string;
    bossName: string;
    winType: WinType;
  };

  if (!body.playerId || !body.raidId || !body.itemId || !body.itemName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const win = await prisma.lootWin.create({
    data: {
      playerId: body.playerId,
      raidId: body.raidId,
      itemId: body.itemId,
      itemName: body.itemName,
      bossName: body.bossName ?? "Unknown",
      winType: body.winType ?? "MS",
    },
    include: { player: true, raid: true },
  });

  return NextResponse.json({ win }, { status: 201 });
}
