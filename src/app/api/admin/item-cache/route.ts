import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { clearSoftresCache } from "@/lib/softres";

/** DELETE /api/admin/item-cache — clears stale/placeholder item names so they re-fetch from Wowhead */
export async function DELETE(_req: NextRequest) {
  try {
    await requireAdmin();

    // Delete entries that look like placeholder names
    const { count } = await prisma.itemCache.deleteMany({
      where: { itemName: { startsWith: "Item " } },
    });

    // Also clear in-memory Softres cache so item names refresh
    clearSoftresCache();

    return NextResponse.json({ ok: true, cleared: count });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET /api/admin/item-cache — shows cache stats */
export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();
    const total       = await prisma.itemCache.count();
    const placeholders = await prisma.itemCache.count({ where: { itemName: { startsWith: "Item " } } });
    return NextResponse.json({ total, placeholders });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
