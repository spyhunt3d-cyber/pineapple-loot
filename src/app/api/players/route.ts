import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { requireString, optionalString, ValidationError } from "@/lib/validate";

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;
    const ids = searchParams.get("ids");
    if (ids) {
      const idList = ids.split(",").map(Number).filter(n => n > 0);
      await prisma.$transaction([
        prisma.softReserve.deleteMany({ where: { playerId: { in: idList } } }),
        prisma.lootWin.deleteMany({ where: { playerId: { in: idList } } }),
        prisma.player.deleteMany({ where: { id: { in: idList } } }),
      ]);
      return NextResponse.json({ ok: true, deleted: idList.length });
    }
    // Delete all
    await prisma.$transaction([
      prisma.softReserve.deleteMany({}),
      prisma.lootWin.deleteMany({}),
      prisma.player.deleteMany({}),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("[DELETE /api/players]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const classFilter  = searchParams.get("class") ?? undefined;
    const activeParam  = searchParams.get("active");
    const activeFilter = activeParam === "all" ? undefined : activeParam !== "false";

    const players = await prisma.player.findMany({
      where: {
        ...(activeFilter === undefined ? {} : { active: activeFilter }),
        ...(classFilter ? { class: classFilter } : {}),
      },
      include: { _count: { select: { lootWins: true } } },
      orderBy: { charName: "asc" },
    });

    return NextResponse.json({ players });
  } catch (err) {
    console.error("[GET /api/players]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body     = await req.json() as Record<string, unknown>;
    const charName = requireString(body.charName, "charName", 64).toLowerCase();
    const server   = requireString(body.server,   "server",   64).toLowerCase();
    const classVal = optionalString(body.class,  "class",  64);
    const specVal  = optionalString(body.spec,   "spec",   64);
    const roleVal  = optionalString(body.role,   "role",   32);
    const teamVal  = optionalString(body.team,   "team",   64);
    const notesVal = optionalString(body.notes,  "notes",  500);

    try {
      const player = await prisma.player.create({
        data: { charName, server, class: classVal ?? null, spec: specVal ?? null, role: roleVal ?? null, team: teamVal ?? null, notes: notesVal ?? null },
      });
      return NextResponse.json({ player }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Player already exists" }, { status: 409 });
    }
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[POST /api/players]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
