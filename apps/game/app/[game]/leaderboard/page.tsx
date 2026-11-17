import { requireSession } from "@repo/auth/next";
import { GameNav } from "@/components/game-nav";
import { GAMES } from "@/game/party-meta";
import { leaderboard } from "@/game/store";
import { auth } from "@/lib/auth";
import { gameParam } from "@/lib/game-param";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ params }: { params: Promise<{ game: string }> }) {
  const session = await requireSession(auth());
  const kind = await gameParam(params);
  const rows = await leaderboard(kind, 100);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-white">
      <GameNav kind={kind} title={`${GAMES[kind].name} leaderboard`} />
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2 text-right">Points</th>
              <th className="px-3 py-2 text-right">Matches won</th>
              <th className="px-3 py-2 text-right">Played</th>
              <th className="px-3 py-2 text-right">Rounds won</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.userId} className={`border-t border-white/5 ${r.userId === session.user.id ? "bg-amber-400/10" : ""}`}>
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2 text-right font-mono">{r.points}</td>
                <td className="px-3 py-2 text-right">{r.matchesWon}</td>
                <td className="px-3 py-2 text-right">{r.matches}</td>
                <td className="px-3 py-2 text-right">{r.roundsWon}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-white/50">No results yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-white/40">{GAMES[kind].points}</p>
    </main>
  );
}
