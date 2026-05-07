import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [playerCount, weekCount, totalWins, latestWeek] = await Promise.all([
    prisma.player.count({ where: { active: true } }),
    prisma.raidWeek.count(),
    prisma.lootWin.count(),
    prisma.raidWeek.findFirst({
      orderBy: { weekStart: "desc" },
      include: { raids: true },
    }),
  ]);

  const stats = [
    { label: "Active Players", value: playerCount, href: "/admin/players" },
    { label: "Raid Weeks", value: weekCount, href: "/admin/raids" },
    { label: "Loot Wins Recorded", value: totalWins, href: "/players" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[--color-gold]">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Pineapple Loot Xpress — manage raids, imports, and loot priority.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg border border-[--color-border] bg-[--color-surface] p-5 hover:border-[--color-gold]/40 transition-colors"
          >
            <p className="text-sm text-[--color-text-muted]">{label}</p>
            <p className="mt-1 text-3xl font-bold text-[--color-gold]">{value}</p>
          </Link>
        ))}
      </div>

      {/* Latest week info */}
      {latestWeek && (
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-5">
          <h2 className="mb-3 text-sm font-semibold text-[--color-text-muted] uppercase tracking-wide">
            Latest Raid Week
          </h2>
          <p className="text-[--color-text]">
            Week of{" "}
            <span className="text-[--color-gold]">
              {new Date(latestWeek.weekStart).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
          <p className="mt-1 text-sm text-[--color-text-muted]">
            {latestWeek.raids.length} raid night{latestWeek.raids.length !== 1 ? "s" : ""} configured
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[--color-text-muted] uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/admin/raids",         label: "Add Raid Week",         desc: "Set up this week's Night 1 & Night 2" },
            { href: "/admin/import",        label: "Import Gargul CSV",     desc: "Paste loot win data from Gargul" },
            { href: "/admin/loot-priority", label: "Manage Priority",       desc: "Add/edit item priority entries" },
            { href: "/admin/export",        label: "Export for Gargul",     desc: "Download priority JSON for the addon" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-[--color-border] bg-[--color-surface-2] p-4 hover:border-[--color-gold]/40 transition-colors"
            >
              <p className="font-medium text-[--color-text]">{label}</p>
              <p className="mt-0.5 text-xs text-[--color-text-muted]">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
