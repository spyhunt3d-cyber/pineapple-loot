import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { requireString, optionalString, ValidationError } from "@/lib/validate";

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const instance = req.nextUrl.searchParams.get("instance");
    if (!instance) return NextResponse.json({ error: "instance required" }, { status: 400 });
    const { count } = await prisma.raidLoot.deleteMany({ where: { instance } });
    return NextResponse.json({ ok: true, deleted: count });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("[DELETE /api/raid-loot]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const instance  = req.nextUrl.searchParams.get("instance");
    const instances = req.nextUrl.searchParams.get("instances"); // comma-separated

    const where = instances
      ? { instance: { in: instances.split(",").map(s => s.trim()) } }
      : instance ? { instance } : undefined;

    const items = await prisma.raidLoot.findMany({
      where,
      orderBy: [{ instance: "asc" }, { bossOrder: "asc" }, { bossName: "asc" }, { ilvl: "desc" }],
      take: 5000,
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/raid-loot]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json() as Record<string, unknown>;

    const itemId   = requireString(body.itemId,   "itemId",   32);
    const itemName = requireString(body.itemName, "itemName", 256);
    const instance = requireString(body.instance, "instance", 128);
    const bossName = optionalString(body.bossName, "bossName", 128) ?? "";

    const item = await prisma.raidLoot.upsert({
      where:  { itemId_instance: { itemId, instance } },
      create: {
        itemId, itemName, instance, bossName,
        bossOrder:     typeof body.bossOrder     === "number" ? body.bossOrder : 0,
        ilvl:          typeof body.ilvl          === "number" ? body.ilvl      : null,
        itemSlot:      optionalString(body.itemSlot, "itemSlot", 64) ?? null,
        itemType:      optionalString(body.itemType, "itemType", 64) ?? null,
        stats:         (body.stats         ?? null) as never,
        priorityChain: (body.priorityChain ?? null) as never,
        notes:         optionalString(body.notes, "notes", 2000) ?? null,
      },
      update: {
        itemName,
        bossName,
        bossOrder:     typeof body.bossOrder     === "number" ? body.bossOrder     : undefined,
        ilvl:          typeof body.ilvl          === "number" ? body.ilvl          : undefined,
        itemSlot:      optionalString(body.itemSlot, "itemSlot", 64) ?? undefined,
        itemType:      optionalString(body.itemType, "itemType", 64) ?? undefined,
        stats:         body.stats         !== undefined ? body.stats         as never : undefined,
        priorityChain: body.priorityChain !== undefined ? body.priorityChain as never : undefined,
        notes:         optionalString(body.notes, "notes", 2000) ?? undefined,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[POST /api/raid-loot]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
