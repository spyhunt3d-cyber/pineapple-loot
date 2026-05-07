import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { serializeGargulPriority, type GargulPriorityEntry } from "@/lib/gargul";

/**
 * GET /api/export/gargul — Admin only
 *
 * Exports the current loot priority list as a Gargul-compatible JSON file.
 * Triggers a file download in the browser.
 *
 * Query params:
 *   ?instance=Siege+of+Orgrimmar — filter by raid instance (optional)
 *   ?download=true               — set Content-Disposition for download
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const instanceFilter = searchParams.get("instance") ?? undefined;
  const asDownload = searchParams.get("download") !== "false";

  const priorities = await prisma.lootPriority.findMany({
    where: instanceFilter ? { instance: instanceFilter } : undefined,
    orderBy: [{ itemName: "asc" }, { class: "asc" }],
  });

  const entries: GargulPriorityEntry[] = priorities.map((p) => ({
    itemName: p.itemName,
    class: p.class,
    spec: p.spec,
    priorityTier: p.priorityTier,
  }));

  const guildName = process.env.NEXT_PUBLIC_GUILD_NAME ?? "Pineapple Express";
  const json = serializeGargulPriority(guildName, entries);
  const body = JSON.stringify(json, null, 2);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (asDownload) {
    const filename = `gargul-priority-${new Date().toISOString().slice(0, 10)}.json`;
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }

  return new NextResponse(body, { headers });
}
