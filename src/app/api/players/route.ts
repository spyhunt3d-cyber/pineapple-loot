import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/players
 * Public — returns all active players with aggregate loot win counts.
 *
 * Query params:
 *   ?include=lootWins  — include per-player win counts by type
 *   ?class=Druid       — filter by class
 *   ?active=true|false — filter by active status (default: true)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const classFilter = searchParams.get("class") ?? undefined;
  const activeFilter = searchParams.get("active") !== "false"; // default true

  const players = await prisma.player.findMany({
    where: {
      active: activeFilter,
      ...(classFilter ? { class: classFilter } : {}),
    },
    include: {
      _count: { select: { lootWins: true } },
    },
    orderBy: { charName: "asc" },
  });

  return NextResponse.json({ players });
}

/**
 * POST /api/players
 * Admin only — creates a new player.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    charName: string;
    server: string;
    class?: string;
    spec?: string;
    role?: string;
  };

  if (!body.charName || !body.server) {
    return NextResponse.json(
      { error: "charName and server are required" },
      { status: 400 }
    );
  }

  try {
    const player = await prisma.player.create({
      data: {
        charName: body.charName.toLowerCase().trim(),
        server: body.server.toLowerCase().trim(),
        class: body.class ?? null,
        spec: body.spec ?? null,
        role: body.role ?? null,
      },
    });
    return NextResponse.json({ player }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Player already exists or invalid data" },
      { status: 409 }
    );
  }
}
