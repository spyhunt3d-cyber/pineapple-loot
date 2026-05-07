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
    { label: "Active Players",       value: playerCount, href: "/admin/players" },
    { label: "Raid Weeks",           value: weekCount,   href: "/admin/raids"   },
    { label: "Loot Wins Recorded",   value: totalWins,   href: "/players"       },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage raids, imports, and loot priority.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, href }) => (
          <Link key={label} href={href} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value">{value}</p>
          </Link>
        ))}
      </div>

      {/* Latest week */}
      {latestWeek && (
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-5">
          <p className="section-label mb-3">Latest Raid Week</p>
          <p className="text-[--color-text]">
            Week of{" "}
            <span className="text-[--color-gold] font-medium">
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
        <p className="section-label mb-3">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { href: "/admin/raids",         label: "Add Raid Week",      desc: "Set up this week's Night 1 & Night 2" },
            { href: "/admin/import",        label: "Import Gargul CSV",  desc: "Paste or drop loot win data from Gargul" },
            { href: "/admin/raid-loot-priority",      label: "Manage Priority",    desc: "Add / edit item priority entries" },
            { href: "/admin/export",        label: "Export for Gargul",  desc: "Download priority JSON for the addon" },
          ].map(({ href, label, desc }) => (
            <Link key={href} href={href} className="action-card">
              <p className="action-title">{label}</p>
              <p className="action-desc">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
