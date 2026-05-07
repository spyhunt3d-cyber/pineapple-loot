import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { requireString, ValidationError } from "@/lib/validate";

export async function GET() {
  try {
    const weeks = await prisma.raidWeek.findMany({
      include: { raids: { orderBy: { night: "asc" } } },
      orderBy: { weekStart: "desc" },
    });
    return NextResponse.json({ weeks });
  } catch (err) {
    console.error("[GET /api/raid-weeks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body       = await req.json() as Record<string, unknown>;
    const weekStr    = requireString(body.weekStart, "weekStart", 32);
    const weekStart  = new Date(weekStr);
    weekStart.setUTCHours(0, 0, 0, 0);

    if (isNaN(weekStart.getTime())) throw new ValidationError("weekStart is not a valid date");
    if (weekStart.getUTCDay() !== 1) throw new ValidationError("weekStart must be a Monday");

    try {
      const week = await prisma.raidWeek.create({ data: { weekStart } });
      return NextResponse.json({ week }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "A week starting on that date already exists" }, { status: 409 });
    }
  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[POST /api/raid-weeks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
