/**
 * Soft Reserves page — public.
 * Shows all reserves for a selected week with roll ranges.
 * Night 1 and Night 2 are shown in separate tabs.
 */

import { prisma } from "@/lib/prisma";
import { SoftReservesClient } from "@/components/soft-reserves/SoftReservesClient";

export const dynamic = "force-dynamic";

export default async function SoftReservesPage() {
  const weeks = await prisma.raidWeek.findMany({
    include: {
      raids: { orderBy: { night: "asc" } },
    },
    orderBy: { weekStart: "desc" },
    take: 12,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[--color-gold]">Soft Reserves</h1>
        <p className="mt-2 text-[--color-text-muted]">
          Player reserves by week with weighted roll ranges. Higher weeks = stronger roll bonus.
        </p>

        {/* Roll range legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((week) => {
            const ranges = ["1–100", "20–120", "50–150", "90–190", "140–240", "200–300"];
            const colors = [
              "bg-emerald-900/50 text-emerald-300 border-emerald-700",
              "bg-green-900/50 text-green-300 border-green-700",
              "bg-yellow-900/50 text-yellow-300 border-yellow-700",
              "bg-orange-900/50 text-orange-300 border-orange-700",
              "bg-red-900/50 text-red-300 border-red-700",
              "bg-amber-900/50 text-amber-300 border-amber-600 font-bold",
            ];
            return (
              <span
                key={week}
                className={`rounded border px-2 py-0.5 text-xs ${colors[week - 1]}`}
              >
                Week {week}: {ranges[week - 1]}
              </span>
            );
          })}
        </div>
      </div>

      <SoftReservesClient weeks={weeks} />
    </div>
  );
}
