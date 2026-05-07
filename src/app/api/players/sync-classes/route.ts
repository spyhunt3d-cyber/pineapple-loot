import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { fetchSoftresRaid } from "@/lib/softres";
import { SPEC_ID_MAP } from "@/lib/wow-constants";

/**
 * POST /api/players/sync-classes
 * Body: { softresId: string }
 *
 * Fetches a Softres raid and updates class/spec for all matching players,
 * including players created by Gargul that may have a different server name.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json() as Record<string, unknown>;
    const softresId = typeof body.softresId === "string" ? body.softresId.trim() : "";
    if (!softresId || !/^[a-z0-9]{1,32}$/i.test(softresId)) {
      return NextResponse.json({ error: "Invalid softresId" }, { status: 400 });
    }

    const raidData = await fetchSoftresRaid(softresId);
    let updated = 0;

    const NORMALIZE: Record<string, string> = { deathknight: "Death Knight", demonhunter: "Demon Hunter" };

    for (const entry of raidData.entries) {
      if (!entry.class) continue;
      const charName = entry.name.toLowerCase();
      const specName = SPEC_ID_MAP[entry.spec]?.spec ?? null;
      const normalizedClass = NORMALIZE[entry.class.toLowerCase().replace(/\s/g, "")] ?? entry.class;

      const result = await prisma.player.updateMany({
        where: { charName },
        data:  {
          class: normalizedClass,
          ...(specName ? { spec: specName } : {}),
        },
      });
      updated += result.count;
    }

    return NextResponse.json({ updated, total: raidData.entries.length });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
