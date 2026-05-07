import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { serializeGargulPriority, type GargulPriorityEntry } from "@/lib/gargul";
import { ALL_CLASSES } from "@/lib/wow-constants";

type PrioEntry = { class: string; spec: string };
type PrioChain = PrioEntry[][];

/**
 * GET /api/export/gargul
 * Exports loot priority from RaidLoot.priorityChain as a Gargul JSON file.
 * Each tier in the chain maps to priorityTier 1, 2, 3 (capped at 3).
 * class:"*" expands to all classes.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = req.nextUrl;
    const instanceFilter  = searchParams.get("instance")  ?? undefined;
    const instancesFilter = searchParams.get("instances") ?? undefined;
    const asDownload      = searchParams.get("download") !== "false";

    const where = instancesFilter
      ? { instance: { in: instancesFilter.split(",").map(s => s.trim()) } }
      : instanceFilter ? { instance: instanceFilter } : undefined;

    const raidLootItems = await prisma.raidLoot.findMany({
      where,
      orderBy: [{ bossOrder: "asc" }, { itemName: "asc" }],
    });

    const entries: GargulPriorityEntry[] = [];

    for (const item of raidLootItems) {
      if (!item.priorityChain) continue;
      const chain = item.priorityChain as PrioChain;

      chain.forEach((tier, tierIdx) => {
        const priorityTier = Math.min(tierIdx + 1, 3);
        for (const entry of tier) {
          const classes = entry.class === "*" ? ALL_CLASSES : [entry.class];
          for (const cls of classes) {
            entries.push({
              itemName:     item.itemName,
              class:        cls,
              spec:         entry.spec === "*" ? "*" : entry.spec,
              priorityTier,
            });
          }
        }
      });
    }

    const guildName = process.env.NEXT_PUBLIC_GUILD_NAME ?? "Pineapple Express";
    const json      = serializeGargulPriority(guildName, entries);
    const body      = JSON.stringify(json, null, 2);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (asDownload) {
      const filename = `gargul-priority-${new Date().toISOString().slice(0, 10)}.json`;
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return new NextResponse(body, { headers });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("[GET /api/export/gargul]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
