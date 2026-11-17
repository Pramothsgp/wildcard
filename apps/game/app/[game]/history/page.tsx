import { requireSession } from "@repo/auth/next";
import Link from "next/link";
import { GameNav } from "@/components/game-nav";
import { MODES, isModeId } from "@/game/modes";
import { GAMES, roomPath } from "@/game/party-meta";
import { historyFor } from "@/game/store";
import { auth } from "@/lib/auth";
import { gameParam } from "@/lib/game-param";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: { params: Promise<{ game: string }> }) {
  const session = await requireSession(auth());
  const kind = await gameParam(params);
  const games = await historyFor(session.user.id, kind, 50);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-white">
      <GameNav kind={kind} title={`My ${GAMES[kind].name} games`} />
      <ul className="space-y-2">
        {games.map((g) => (
          <li key={g.code}>
            <Link
              href={g.status === "lobby" || g.status === "playing" ? roomPath(kind, g.code) : `/${kind}/history/${g.code}`}
              className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10"
            >
              <span>
                <b>{g.name}</b>
                <span className="ml-2 text-xs text-white/50">{isModeId(g.mode) ? `${MODES[g.mode].name} · ` : ""}{g.code}</span>
              </span>
              <span className="text-xs text-white/60">{g.status} · {g.updatedAt.toLocaleString()}</span>
            </Link>
          </li>
        ))}
        {!games.length && <p className="text-white/50">No games yet.</p>}
      </ul>
    </main>
  );
}
