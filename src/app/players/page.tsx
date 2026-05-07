import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CLASS_COLORS, ROLE_ICONS } from "@/lib/wow-constants";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    where: { active: true },
    include: {
      _count: { select: { lootWins: true } },
    },
    orderBy: { charName: "asc" },
  });

  // Count wins by type per player
  const winsByType = await prisma.lootWin.groupBy({
    by: ["playerId", "winType"],
    _count: { id: true },
  });

  const winsMap = winsByType.reduce<Record<number, Record<string, number>>>((acc, w) => {
    if (!acc[w.playerId]) acc[w.playerId] = {};
    acc[w.playerId][w.winType] = w._count.id;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[--color-gold]">Players</h1>
        <p className="mt-2 text-[--color-text-muted]">
          {players.length} active players — click a player to view their loot history.
        </p>
      </div>

      {players.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[--color-border] py-16 text-center">
          <p className="text-[--color-text-muted]">No players yet. Import a Gargul CSV to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[--color-border]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--color-border] bg-[--color-surface-2]">
                <th className="px-4 py-3 text-left font-medium text-[--color-text-muted]">Character</th>
                <th className="px-4 py-3 text-left font-medium text-[--color-text-muted]">Class / Spec</th>
                <th className="px-4 py-3 text-left font-medium text-[--color-text-muted]">Role</th>
                <th className="px-4 py-3 text-right font-medium text-[--color-text-muted]">MS Wins</th>
                <th className="px-4 py-3 text-right font-medium text-[--color-text-muted]">SR Wins</th>
                <th className="px-4 py-3 text-right font-medium text-[--color-text-muted]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {players.map((player) => {
                const classColor = CLASS_COLORS[player.class ?? ""] ?? "#e2e0d8";
                const wins = winsMap[player.id] ?? {};
                return (
                  <tr key={player.id} className="bg-[--color-surface] hover:bg-[--color-surface-2] transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/players/${player.charName}-${player.server}`}
                        className="font-medium hover:underline"
                        style={{ color: classColor }}
                      >
                        {player.charName}
                      </Link>
                      <span className="ml-1 text-xs text-[--color-text-muted]">
                        -{player.server}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: classColor }}>
                      {player.class ?? "—"}
                      {player.spec && (
                        <span className="text-[--color-text-muted]"> / {player.spec}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[--color-text-muted]">
                      {player.role ? `${ROLE_ICONS[player.role] ?? ""} ${player.role}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[--color-text-muted]">
                      {wins.MS ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-[--color-text-muted]">
                      {wins.SR ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[--color-text]">
                      {player._count.lootWins}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
