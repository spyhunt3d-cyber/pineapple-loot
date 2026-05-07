import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { parseIdParam, ValidationError } from "@/lib/validate";

type Params = Promise<{ id: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    await requireAdmin();
    const raidId = parseIdParam((await params).id);

    const raids = await prisma.raid.findUnique({ where: { id: raidId }, select: { id: true } });
    if (!raids) return NextResponse.json({ error: "Raid not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.softReserve.deleteMany({ where: { raidId } }),
      prisma.lootWin.deleteMany({ where: { raidId } }),
      prisma.raid.delete({ where: { id: raidId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[DELETE /api/raids/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
