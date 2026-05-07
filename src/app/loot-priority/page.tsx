import { prisma } from "@/lib/prisma";
import { LootPriorityClient } from "@/components/loot-priority/LootPriorityClient";
import { PRIORITY_TIERS } from "@/lib/wow-constants";

export const dynamic = "force-dynamic";

export default async function LootPriorityPage() {
  const priorities = await prisma.lootPriority.findMany({
    orderBy: [{ priorityTier: "asc" }, { itemName: "asc" }, { class: "asc" }],
  });

  // Get distinct instances for the filter
  const instances = [...new Set(priorities.map((p) => p.instance).filter(Boolean))];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[--color-gold]">Loot Priority</h1>
        <p className="mt-2 text-[--color-text-muted]">
          Class and spec priority for all items. Priority order: Loot Prio &rsaquo; Soft Reserve &rsaquo; MS &rsaquo; OS
        </p>

        {/* Tier legend */}
        <div className="mt-4 flex gap-3">
          {Object.entries(PRIORITY_TIERS).map(([tier, info]) => (
            <div key={tier} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: info.color }}
              />
              <span className="text-sm text-[--color-text-muted]">
                {info.label} — {info.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      {priorities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[--color-border] py-16 text-center">
          <p className="text-[--color-text-muted]">
            No loot priority data yet. Admins can add priority entries in the{" "}
            <a href="/admin/loot-priority" className="text-[--color-gold] hover:underline">
              admin panel
            </a>
            .
          </p>
        </div>
      ) : (
        <LootPriorityClient priorities={priorities} instances={instances} />
      )}
    </div>
  );
}
