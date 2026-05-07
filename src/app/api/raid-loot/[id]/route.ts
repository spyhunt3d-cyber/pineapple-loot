import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { parseIdParam, optionalString, ValidationError } from "@/lib/validate";

type Params = Promise<{ id: string }>;

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    await requireAdmin();
    const id   = parseIdParam((await params).id);
    const body = await req.json() as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if ("itemName"      in body) data.itemName      = body.itemName;
    if ("bossName"      in body) data.bossName      = body.bossName;
    if ("bossOrder"     in body) data.bossOrder     = Number(body.bossOrder) || 0;
    if ("ilvl"          in body) data.ilvl          = body.ilvl !== null ? Number(body.ilvl) : null;
    if ("itemSlot"      in body) data.itemSlot      = optionalString(body.itemSlot,  "itemSlot",  64) ?? null;
    if ("itemType"      in body) data.itemType      = optionalString(body.itemType,  "itemType",  64) ?? null;
    if ("stats"         in body) data.stats         = body.stats as never;
    if ("priorityChain" in body) data.priorityChain = body.priorityChain as never;
    if ("notes"         in body) data.notes         = optionalString(body.notes, "notes", 2000) ?? null;

    const item = await prisma.raidLoot.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[PUT /api/raid-loot/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    await requireAdmin();
    const id = parseIdParam((await params).id);
    await prisma.raidLoot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("[DELETE /api/raid-loot/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
