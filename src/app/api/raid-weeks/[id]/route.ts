import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { parseIdParam, ValidationError } from "@/lib/validate";

type Params = Promise<{ id: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    await requireAdmin();
    const weekId = parseIdParam((await params).id);

    const week = await prisma.raidWeek.findUnique({ where: { id: weekId }, select: { id: true } });
    if (!week) return NextResponse.json({ error: "Week not found" }, { status: 404 });

    const raids = await prisma.raid.findMany({ where: { weekId }, select: { id: true } });
    const raidIds = raids.map((r) => r.id);

    await prisma.$transaction([
      prisma.softReserve.deleteMany({ where: { weekId } }),
      prisma.lootWin.deleteMany({ where: { raidId: { in: raidIds } } }),
      prisma.raid.deleteMany({ where: { weekId } }),
      prisma.raidWeek.delete({ where: { id: weekId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[DELETE /api/raid-weeks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
