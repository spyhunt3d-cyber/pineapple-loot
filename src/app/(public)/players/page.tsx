import { prisma } from "@/lib/prisma";
import { PlayersTable, type PublicPlayer } from "@/components/players/PlayersTable";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    where: { active: true },
    include: {
      lootWins: {
        include: { raid: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { charName: "asc" },
  });

  const data: PublicPlayer[] = players.map(p => {
    const winCounts: Record<string, number> = {};
    const wins = p.lootWins.map(w => {
      winCounts[w.winType] = (winCounts[w.winType] ?? 0) + 1;
      return {
        id:       w.id,
        itemId:   w.itemId,
        itemName: w.itemName,
        bossName: w.bossName,
        winType:  w.winType,
        raidDate: w.raid.raidDate.toISOString(),
        instance: w.raid.instance,
        night:    w.raid.night,
      };
    });
    return {
      id:        p.id,
      charName:  p.charName,
      server:    p.server,
      class:     p.class,
      spec:      p.spec,
      role:      p.role,
      wins,
      winCounts,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="page-header">
        <h1 className="page-title">Players</h1>
        <p className="page-subtitle">
          {players.length} active player{players.length !== 1 ? "s" : ""} — click a name to view full loot history, or expand a row.
        </p>
      </div>

      {players.length === 0 ? (
        <div className="empty-state">No players yet. Import a Gargul CSV to get started.</div>
      ) : (
        <PlayersTable players={data} />
      )}
    </div>
  );
}
