import { NextRequest, NextResponse } from "next/server";
import { fetchSoftresRaid, resolveItemNames } from "@/lib/softres";

/**
 * GET /api/softres/[raidId]
 *
 * Proxies the Softres.it API for the given raid ID. Resolves item IDs
 * to human-readable names via ItemCache + Wowhead API fallback.
 * Results are in-memory cached for 5 minutes.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ raidId: string }> }
) {
  const { raidId } = await params;

  if (!raidId || !/^[a-z0-9]+$/i.test(raidId) || raidId.length > 32) {
    return NextResponse.json({ error: "Invalid raid ID" }, { status: 400 });
  }

  try {
    const raidData = await fetchSoftresRaid(raidId);

    // Resolve item IDs → names in bulk
    const itemNames = await resolveItemNames(raidData.itemIds);

    // Enrich entries with resolved item names
    const enrichedEntries = raidData.entries.map((entry) => ({
      ...entry,
      itemsResolved: entry.items.map((id) => ({
        id: String(id),
        name: itemNames[String(id)] ?? `Item ${id}`,
      })),
    }));

    return NextResponse.json({
      raidId,
      edition: raidData.edition,
      entries: enrichedEntries,
      itemNames,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Softres data";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
