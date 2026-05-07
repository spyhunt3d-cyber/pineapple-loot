/**
 * Loot Table page — public.
 *
 * Allows selecting a raid by Softres.it ID and viewing all reserves
 * grouped by player, showing their reserved items and roll ranges.
 * Item links use Wowhead tooltips loaded in the root layout.
 */

import { prisma } from "@/lib/prisma";
import { LootTableClient } from "@/components/loot-table/LootTableClient";

// Force dynamic so Next.js doesn't try to prerender at build time (no DB during build)
export const dynamic = "force-dynamic";

export default async function LootTablePage() {
  // Load all known raids for the selector dropdown
  const raids = await prisma.raid.findMany({
    include: { week: true },
    orderBy: { raidDate: "desc" },
    take: 20, // last 20 raids
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[--color-gold]">Loot Table</h1>
        <p className="mt-2 text-[--color-text-muted]">
          Current soft reserves from Softres.it. Select a raid to view who has what reserved.
        </p>
      </div>

      <LootTableClient raids={raids} />
    </div>
  );
}
