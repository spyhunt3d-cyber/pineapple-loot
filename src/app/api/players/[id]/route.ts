import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { parseIdParam, optionalString, ValidationError } from "@/lib/validate";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const id = parseIdParam((await params).id);
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        lootWins: { include: { raid: true }, orderBy: { createdAt: "desc" } },
        softReserves: {
          include: { week: true, raid: true },
          orderBy: { week: { weekStart: "desc" } },
          take: 40,
        },
      },
    });
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    return NextResponse.json({ player });
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[GET /api/players/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    await requireAdmin();
    const id   = parseIdParam((await params).id);
    const body = await req.json() as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if ("class"  in body) data.class  = optionalString(body.class,  "class",  64);
    if ("spec"   in body) data.spec   = optionalString(body.spec,   "spec",   64);
    if ("role"   in body) data.role   = optionalString(body.role,   "role",   32);
    if ("team"   in body) data.team   = optionalString(body.team,   "team",   64);
    if ("notes"  in body) data.notes  = optionalString(body.notes,  "notes",  500);
    if ("active" in body) {
      if (typeof body.active !== "boolean") throw new ValidationError("active must be boolean");
      data.active = body.active;
    }

    const existing = await prisma.player.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    const player = await prisma.player.update({ where: { id }, data });
    return NextResponse.json({ player });
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[PUT /api/players/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    await requireAdmin();
    const id = parseIdParam((await params).id);
    const existing = await prisma.player.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    await prisma.$transaction([
      prisma.softReserve.deleteMany({ where: { playerId: id } }),
      prisma.lootWin.deleteMany({ where: { playerId: id } }),
      prisma.player.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[DELETE /api/players/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
