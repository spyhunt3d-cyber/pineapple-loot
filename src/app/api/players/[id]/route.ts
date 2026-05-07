import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Params = Promise<{ id: string }>;

/** GET /api/players/[id] — Public, returns player with full loot history */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      lootWins: {
        include: { raid: true },
        orderBy: { createdAt: "desc" },
      },
      softReserves: {
        include: { week: true, raid: true },
        orderBy: { week: { weekStart: "desc" } },
        take: 20, // last 10 weeks of reserves
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({ player });
}

/** PUT /api/players/[id] — Admin only, updates player details */
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    class?: string;
    spec?: string;
    role?: string;
    active?: boolean;
  };

  try {
    const player = await prisma.player.update({
      where: { id: parseInt(id, 10) },
      data: {
        class: body.class,
        spec: body.spec,
        role: body.role,
        active: body.active,
      },
    });
    return NextResponse.json({ player });
  } catch {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
}

/** DELETE /api/players/[id] — Admin only, deactivates (soft delete) */
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Soft delete — set active = false rather than destroying records
  const player = await prisma.player.update({
    where: { id: parseInt(id, 10) },
    data: { active: false },
  });

  return NextResponse.json({ player });
}
