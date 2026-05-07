import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LootPriorityTabs } from "@/components/loot-priority/LootPriorityTabs";

export const dynamic = "force-dynamic";

export default async function LootPriorityPage() {
  const items = await prisma.raidLoot.findMany({
    orderBy: [{ bossOrder: "asc" }, { bossName: "asc" }, { ilvl: "desc" }],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="page-header">
        <h1 className="page-title">Loot Priority</h1>
        <p className="page-subtitle">
          Priority order per item — Prio &rsaquo; Class MS &rsaquo; Class MS = Class MS &rsaquo; All OS &rsaquo; Disenchant = Transmog
        </p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          No loot priority data yet.{" "}
          <Link href="/admin/raid-loot-priority" className="text-[--color-gold] hover:underline">
            Admins can add it in the Raid Loot sheet.
          </Link>
        </div>
      ) : (
        <LootPriorityTabs items={items} />
      )}
    </div>
  );
}
