import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CLASS_COLORS, getWowheadItemUrl, getWowheadDataAttr } from "@/lib/wow-constants";

export const dynamic = "force-dynamic";

type Params = Promise<{ playerName: string }>;

export default async function PlayerDetailPage({ params }: { params: Params }) {
  const { playerName } = await params;

  // URL format: charName-server (e.g. "arthas-galakrond")
  const hyphen = playerName.indexOf("-");
  if (hyphen === -1) notFound();

  const charName = playerName.slice(0, hyphen).toLowerCase();
  const server   = playerName.slice(hyphen + 1).toLowerCase();

  const player = await prisma.player.findUnique({
    where: { charName_server: { charName, server } },
    include: {
      lootWins: {
        include: { raid: { include: { week: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!player) notFound();

  const classColor = CLASS_COLORS[player.class ?? ""] ?? "#e2e0d8";

  const msByType = player.lootWins.reduce<Record<string, number>>((acc, w) => {
    acc[w.winType] = (acc[w.winType] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
      {/* Back */}
      <Link href="/players" className="text-sm text-[--color-text-muted] hover:text-[--color-gold] transition-colors">
        ← Back to Players
      </Link>

      {/* Header */}
      <div className="mt-6 mb-8 space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: classColor }}>
            {player.charName}
          </h1>
          <p className="mt-1 text-sm text-[--color-text-muted]">
            {player.class ?? "Unknown class"}{player.spec ? ` · ${player.spec}` : ""}{" "}
            · {player.server}
            {!player.active && (
              <span className="ml-2 text-xs rounded px-1.5 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700">
                Inactive
              </span>
            )}
          </p>
        </div>

        {/* Win summary */}
        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-3">
          {(["MS", "SR", "PRIO", "OS"] as const).map((type) => (
            <div key={type} className="stat-card text-center">
              <p className="stat-label">{type}</p>
              <p className="stat-value text-xl sm:text-2xl">{msByType[type] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Loot history */}
      <h2 className="section-label mb-3">Loot History</h2>
      {player.lootWins.length === 0 ? (
        <div className="empty-state">No loot wins recorded yet.</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Boss</th>
                <th>Raid</th>
                <th>Date</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {player.lootWins.map((win) => (
                <tr key={win.id}>
                  <td>
                    <a
                      href={getWowheadItemUrl(win.itemId, win.raid.instance)}
                      data-wowhead={getWowheadDataAttr(win.itemId, win.raid.instance)}
                      target="_blank"
                      rel="noreferrer"
                      className="item-link"
                    >
                      {win.itemName}
                    </a>
                  </td>
                  <td className="muted">{win.bossName}</td>
                  <td className="muted">
                    Night {win.raid.night} · {win.raid.instance}
                  </td>
                  <td className="muted">
                    {new Date(win.raid.raidDate).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td>
                    <span className={`text-xs rounded border px-1.5 py-0.5 ${
                      win.winType === "MS"   ? "bg-emerald-900/40 text-emerald-400 border-emerald-800" :
                      win.winType === "SR"   ? "bg-blue-900/40 text-blue-400 border-blue-800" :
                      win.winType === "PRIO" ? "bg-amber-900/40 text-amber-400 border-amber-800" :
                                              "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}>
                      {win.winType}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
