import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { fetchSoftresRaid, resolveItemNames } from "@/lib/softres";
import { SPEC_ID_MAP, SPEC_ROLE } from "@/lib/wow-constants";
import { ValidationError } from "@/lib/validate";

const RH_BASE = process.env.RAID_HELPER_BASE_URL ?? "https://raid-helper.xyz";
const RH_KEY  = process.env.RAID_HELPER_API_KEY  ?? "";

const SOFTRES_CLASS_NORMALIZE: Record<string, string> = {
  deathknight: "Death Knight",
  demonhunter: "Demon Hunter",
};

// Raid-Helper roleName → our role
const RH_ROLE_MAP: Record<string, string> = {
  Tank:    "Tank",
  Healer:  "Healer",
  Ranged:  "DPS",
  Melee:   "DPS",
  Support: "DPS",
};

interface RHSignup {
  name: string;
  userId: string;
  className:  string;
  specName:   string;
  roleName:   string;
  cClassName: string;
  cSpecName:  string;
  cRoleName:  string;
  status:     string;
}

interface RHEvent {
  id:         string;
  title:      string;
  startTime:  number;
  softresId?: string;
  signUps?:   RHSignup[];
}

async function fetchRHEvent(eventId: string): Promise<RHEvent> {
  const res = await fetch(`${RH_BASE}/api/v4/events/${eventId}`, {
    headers: { Authorization: RH_KEY },
  });
  if (!res.ok) throw new Error(`Raid-Helper API error ${res.status}`);
  return res.json() as Promise<RHEvent>;
}

const GUILD_TZ = process.env.NEXT_PUBLIC_RAID_TIMEZONE ?? "America/New_York";

/** Get YYYY-MM-DD date in the guild's local timezone from a Unix timestamp */
function localDateFromTimestamp(ts: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: GUILD_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(ts * 1000)); // en-CA gives YYYY-MM-DD
}

/** Monday of the week containing a given Unix timestamp, in guild timezone */
function weekStartFromTimestamp(ts: number): string {
  const localDate = localDateFromTimestamp(ts);          // YYYY-MM-DD in guild TZ
  const d   = new Date(localDate + "T00:00:00Z");        // treat as UTC anchor
  const dow = d.getUTCDay();                             // 0=Sun
  const toMonday = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + toMonday);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body     = await req.json() as Record<string, unknown>;
    const eventId  = typeof body.eventId === "string" ? body.eventId.trim() : "";
    const nightRaw = Number(body.night);
    if (!eventId)                              throw new ValidationError("eventId required");
    if (nightRaw !== 1 && nightRaw !== 2)      throw new ValidationError("night must be 1 or 2");

    // Fetch the Raid-Helper event (includes signups + softresId)
    const event = await fetchRHEvent(eventId);
    if (!event.softresId) throw new ValidationError("This Raid-Helper event has no Softres ID linked");

    const weekStart  = weekStartFromTimestamp(event.startTime);
    const raidDate   = localDateFromTimestamp(event.startTime); // use guild TZ, not UTC
    const defaultServer = process.env.NEXT_PUBLIC_GUILD_REALM?.toLowerCase() ?? "galakrond";

    // Pre-validate Softres before creating anything
    const raidData = await fetchSoftresRaid(event.softresId);

    // Resolve instance name from Softres edition
    const { resolveInstanceName } = await import("@/lib/wow-constants");
    const instance = resolveInstanceName(raidData.edition) || event.title;

    // 1. Create or find RaidWeek
    const week = await prisma.raidWeek.upsert({
      where:  { weekStart: new Date(weekStart) },
      create: { weekStart: new Date(weekStart) },
      update: {},
    });

    // 2. Create Raid night (upsert on softresId)
    const existingRaid = await prisma.raid.findFirst({ where: { softresId: event.softresId } });
    const raid = existingRaid ?? await prisma.raid.create({
      data: {
        softresId: event.softresId,
        instance,
        raidDate:  new Date(raidDate),
        night:     nightRaw,
        weekId:    week.id,
      },
    });

    // 3. Sync Softres reserves
    let syncWarning: string | null = null;
    try {
      await syncSoftresReserves(raid.id, raidData, week.id, defaultServer);
    } catch (err) {
      syncWarning = err instanceof Error ? err.message : "Sync error";
    }

    // 4. Update players from Raid-Helper signups
    const signups = event.signUps ?? [];
    let playersUpdated = 0;
    for (const signup of signups) {
      if (signup.status !== "primary") continue;
      const charName = signup.name.toLowerCase();
      const rawClass = signup.cClassName || signup.className;
      const normalizedClass = SOFTRES_CLASS_NORMALIZE[rawClass.toLowerCase().replace(/\s/g, "")] ?? rawClass;
      const specName  = signup.cSpecName  || signup.specName  || null;
      const rhRole    = signup.cRoleName  || signup.roleName  || "";
      const role      = RH_ROLE_MAP[rhRole] ?? (specName ? SPEC_ROLE[specName] : null) ?? null;

      // Match by charName (any server) — update class/spec/role
      const updated = await prisma.player.updateMany({
        where: { charName },
        data:  {
          class:  normalizedClass || undefined,
          spec:   specName        || undefined,
          role:   role            || undefined,
          active: true,
        },
      });

      // If no player found, create one
      if (updated.count === 0) {
        await prisma.player.create({
          data: { charName, server: defaultServer, class: normalizedClass, spec: specName, role, active: true },
        });
      }
      playersUpdated++;
    }

    const raidWithWeek = await prisma.raid.findUnique({
      where:   { id: raid.id },
      include: { week: true },
    });

    return NextResponse.json({
      raid:           raidWithWeek,
      week,
      playersUpdated,
      reservesSynced: raidData.entries.length,
      ...(syncWarning ? { warning: syncWarning } : {}),
    }, { status: existingRaid ? 200 : 201 });

  } catch (err) {
    if (err instanceof AuthError)       return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof Error && err.message.startsWith("Raid-Helper API error"))
      return NextResponse.json({ error: err.message }, { status: 502 });
    if (err instanceof Error && err.message.startsWith("Softres API error"))
      return NextResponse.json({ error: err.message }, { status: 502 });
    console.error("[POST /api/raids/setup-from-event]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Softres reserve sync (mirrors raids/route.ts) ────────────

async function syncSoftresReserves(
  raidId: number,
  raidData: Awaited<ReturnType<typeof fetchSoftresRaid>>,
  weekId: number,
  defaultServer: string,
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
      const specName       = SPEC_ID_MAP[entry.spec]?.spec ?? null;
      const rawClass       = entry.class ?? "";
      const normalizedClass = SOFTRES_CLASS_NORMALIZE[rawClass.toLowerCase().replace(/\s/g, "")] ?? rawClass;

      const player = await tx.player.upsert({
        where:  { charName_server: { charName, server: defaultServer } },
        create: { charName, server: defaultServer, class: normalizedClass || null, spec: specName, active: true },
        update: { class: normalizedClass || undefined, spec: specName || undefined },
      });

      if (normalizedClass) {
        await tx.player.updateMany({
          where: { charName, class: null, id: { not: player.id } },
          data:  { class: normalizedClass, spec: specName ?? undefined },
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
