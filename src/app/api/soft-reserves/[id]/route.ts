import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { parseIdParam, ValidationError } from "@/lib/validate";

type Params = Promise<{ id: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    await requireAdmin();
    const id = parseIdParam((await params).id);
    const existing = await prisma.softReserve.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.softReserve.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[DELETE /api/soft-reserves/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
