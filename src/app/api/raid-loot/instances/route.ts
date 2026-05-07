import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.raidLoot.findMany({
      select: { instance: true },
      distinct: ["instance"],
      orderBy: { instance: "asc" },
    });
    return NextResponse.json({ instances: rows.map(r => r.instance) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
