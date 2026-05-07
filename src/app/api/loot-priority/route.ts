import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/loot-priority — Public
 * Query params: ?class=Druid, ?spec=Balance, ?instance=Siege+of+Orgrimmar
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const classFilter = searchParams.get("class") ?? undefined;
  const specFilter = searchParams.get("spec") ?? undefined;
  const instanceFilter = searchParams.get("instance") ?? undefined;

  const priorities = await prisma.lootPriority.findMany({
    where: {
      ...(classFilter ? { class: classFilter } : {}),
      ...(specFilter ? { spec: specFilter } : {}),
      ...(instanceFilter ? { instance: instanceFilter } : {}),
    },
    orderBy: [
      { priorityTier: "asc" },
      { itemName: "asc" },
      { class: "asc" },
    ],
  });

  return NextResponse.json({ priorities });
}

/** POST /api/loot-priority — Admin only, creates a single priority entry */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    itemId: string;
    itemName: string;
    instance: string;
    bossName: string;
    class: string;
    spec: string;
    priorityTier: number;
  };

  if (!body.itemId || !body.itemName || !body.class || !body.priorityTier) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const priority = await prisma.lootPriority.upsert({
    where: { itemId_class_spec: { itemId: body.itemId, class: body.class, spec: body.spec ?? "*" } },
    create: {
      itemId: body.itemId,
      itemName: body.itemName,
      instance: body.instance ?? "",
      bossName: body.bossName ?? "",
      class: body.class,
      spec: body.spec ?? "*",
      priorityTier: body.priorityTier,
    },
    update: {
      itemName: body.itemName,
      priorityTier: body.priorityTier,
      bossName: body.bossName ?? undefined,
    },
  });

  return NextResponse.json({ priority }, { status: 201 });
}
