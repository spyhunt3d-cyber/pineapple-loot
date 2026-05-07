import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** GET /api/raid-weeks — Public, all weeks ordered newest first */
export async function GET() {
  const weeks = await prisma.raidWeek.findMany({
    include: {
      raids: { orderBy: { night: "asc" } },
    },
    orderBy: { weekStart: "desc" },
  });
  return NextResponse.json({ weeks });
}

/** POST /api/raid-weeks — Admin only, creates a new raid week */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { weekStart: string };

  if (!body.weekStart) {
    return NextResponse.json({ error: "weekStart (ISO date string for Monday) is required" }, { status: 400 });
  }

  const weekStart = new Date(body.weekStart);
  weekStart.setUTCHours(0, 0, 0, 0);

  // Validate it's a Monday (day 1)
  if (weekStart.getUTCDay() !== 1) {
    return NextResponse.json({ error: "weekStart must be a Monday" }, { status: 400 });
  }

  try {
    const week = await prisma.raidWeek.create({
      data: { weekStart },
    });
    return NextResponse.json({ week }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A week starting on that date already exists" }, { status: 409 });
  }
}
