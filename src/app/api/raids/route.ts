import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { fetchSoftresRaid, resolveItemNames } from "@/lib/softres";
import { requireString, parseIdParam, ValidationError } from "@/lib/validate";
import { SPEC_ID_MAP } from "@/lib/wow-constants";

// Softres returns non-standard class names — normalize to our display names
const SOFTRES_CLASS_NORMALIZE: Record<string, string> = {
  "deathknight": "Death Knight",
  "demonhunter": "Demon Hunter",
};

export async function GET() {
  try {
    const raids = await prisma.raid.findMany({
      include: { week: true },
      orderBy: { raidDate: "desc" },
      take: 200,
    });
    return NextResponse.json({ raids });
  } catch (err) {
    console.error("[GET /api/raids]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json() as Record<string, unknown>;
    const softresId = requireString(body.softresId, "softresId", 32);
    const instance  = requireString(body.instance,  "instance",  128);
    const raidDate  = requireString(body.raidDate,  "raidDate",  32);
    const weekId    = parseIdParam(String(body.weekId ?? ""));
    const nightRaw  = Number(body.night);
    if (nightRaw !== 1 && nightRaw !== 2) throw new ValidationError("night must be 1 or 2");

    // Validate softresId format (allow placeholder IDs starting with "n2-" for Night 2 without Softres)
    const isPlaceholder = softresId.startsWith("n2-");
    if (!isPlaceholder && !/^[a-z0-9]{1,32}$/i.test(softresId)) {
      throw new ValidationError("softresId must be alphanumeric, max 32 chars");
    }

    const week = await prisma.raidWeek.findUnique({ where: { id: weekId } });
    if (!week) return NextResponse.json({ error: `Week ${weekId} not found` }, { status: 404 });

    // Skip Softres fetch for placeholder IDs (Night 2 without reserves)
    const raidData = isPlaceholder ? null : await fetchSoftresRaid(softresId);

    const raid = await prisma.raid.create({
      data: {
        softresId,
        instance,
        raidDate: new Date(raidDate),
        night:    nightRaw,
        weekId,
      },
    });

    // Sync reserves only if we have real Softres data
    let syncWarning: string | null = null;
    if (raidData) {
      try {
        await syncSoftresReserves(raid.id, raidData, weekId);
      } catch (err) {
        syncWarning = err instanceof Error ? err.message : "Unknown sync error";
        console.error(`Reserve sync failed for raid ${raid.id}:`, err);
      }
    }

    const raidWithWeek = await prisma.raid.findUnique({
      where: { id: raid.id },
      include: { week: true },
    });

    return NextResponse.json({
      raid: raidWithWeek,
      ...(syncWarning ? { warning: `Raid created but reserve sync failed: ${syncWarning}` } : {}),
    }, { status: 201 });

  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof Error && err.message.startsWith("Softres API error")) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[POST /api/raids]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function syncSoftresReserves(
  raidId:   number,
  raidData: Awaited<ReturnType<typeof fetchSoftresRaid>>,
  weekId:   number,
) {
  const currentWeek = await prisma.raidWeek.findUnique({ where: { id: weekId } });
  if (!currentWeek) throw new Error(`Week ${weekId} not found`);

  const prevWeek = await prisma.raidWeek.findFirst({
    where:   { weekStart: { lt: currentWeek.weekStart } },
    orderBy: { weekStart: "desc" },
  });

  const prevReserveMap = new Map<string, number>();
  if (prevWeek) {
    const prevReserves = await prisma.softReserve.findMany({
      where:   { weekId: prevWeek.id },
      include: { player: { select: { charName: true } } },
    });
    for (const r of prevReserves) {
      prevReserveMap.set(`${r.player.charName}|${r.itemId}`, r.weeksConsecutive);
    }
  }

  const itemNames = await resolveItemNames(raidData.itemIds);

  for (const entry of raidData.entries) {
    const charName = entry.name.toLowerCase();

    await prisma.$transaction(async (tx) => {
      const defaultServer = process.env.NEXT_PUBLIC_GUILD_REALM?.toLowerCase() ?? "galakrond";
      const normalizedClass = SOFTRES_CLASS_NORMALIZE[entry.class?.toLowerCase().replace(/\s/g, "") ?? ""] ?? entry.class;
      const specName = SPEC_ID_MAP[entry.spec]?.spec ?? null;

      const player = await tx.player.upsert({
        where:  { charName_server: { charName, server: defaultServer } },
        create: { charName, server: defaultServer, class: normalizedClass ?? null, spec: specName, active: true },
        update: {
          class: normalizedClass || undefined,
          spec:  specName        || undefined,
        },
      });

      // Backfill class/spec on any same-name player created by Gargul with a different server
      if (entry.class) {
        await tx.player.updateMany({
          where: { charName, class: null, id: { not: player.id } },
          data:  { class: entry.class, spec: specName ?? undefined },
        });
      }

      for (const itemId of entry.items) {
        const idStr            = String(itemId);
        const itemName         = itemNames[idStr] ?? `Item ${itemId}`;
        const key              = `${player.charName}|${idStr}`;
        const prevWeeks        = prevReserveMap.get(key) ?? 0;
        const weeksConsecutive = Math.min(prevWeeks + 1, 6);

        await tx.softReserve.upsert({
          where:  { playerId_weekId_itemId: { playerId: player.id, weekId, itemId: idStr } },
          create: { playerId: player.id, raidId, weekId, itemId: idStr, itemName, bossName: "Unknown", weeksConsecutive },
          update: { itemName, weeksConsecutive },
        });
      }
    });
  }
}
