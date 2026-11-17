import { requireSession } from "@repo/auth/next";
import Link from "next/link";
import { GameNav } from "@/components/game-nav";
import { Lobby } from "@/components/lobby";
import { COPY } from "@/game/copy";
import { ACHIEVEMENTS, type AchievementId } from "@/game/help";
import { GAMES, kindOf, roomPath } from "@/game/party-meta";
import { achievementsFor, leaderboard, liveRoomFor, statsFor } from "@/game/store";
import { auth } from "@/lib/auth";
import { gameParam } from "@/lib/game-param";

export const dynamic = "force-dynamic";

export default async function GameHome({ params }: { params: Promise<{ game: string }> }) {
  const session = await requireSession(auth());
  const kind = await gameParam(params);
  const [live, stats, top, earned] = await Promise.all([
    liveRoomFor(session.user.id), statsFor(session.user.id, kind), leaderboard(kind, 5),
    kind === "wildcard" ? achievementsFor(session.user.id) : Promise.resolve([] as string[]),
  ]);
  const unlocked = new Set<string>(earned);
  if ((stats?.roundsWon ?? 0) > 0) unlocked.add("firstWin");
  if ((stats?.matchesWon ?? 0) > 0) unlocked.add("matchWin");
  // Only Wildcard has in-game achievements; the other games show the two every game shares.
  const c = COPY[kind];
  const badges = (Object.keys(ACHIEVEMENTS) as AchievementId[]).filter((id) => kind === "wildcard" || id === "firstWin" || id === "matchWin");

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-white">
      <GameNav kind={kind} />
      <section className={`space-y-5 rounded-3xl bg-gradient-to-br p-6 ring-1 sm:p-8 ${c.look}`}>
        <div className="space-y-1">
          <p className="text-2xl font-black sm:text-3xl">{c.tagline}</p>
          <p className="text-white/70">{GAMES[kind].min} to {GAMES[kind].max} {c.players.toLowerCase()}. {stats?.matches ? `You've played ${stats.matches} match${stats.matches > 1 ? "es" : ""}. Ready for another?` : c.firstGame}</p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {c.steps.map(([title, text], i) => (
            <li key={title} className="rounded-2xl bg-black/30 p-4">
              <span className="text-xs font-black uppercase tracking-widest text-white/50">Step {i + 1}</span>
              <b className="block text-lg">{title}</b>
              <span className="text-sm text-white/70">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      {live && (
        <Link href={roomPath(kindOf(live.mode), live.code)} className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-pink-600 to-orange-500 px-5 py-4 font-bold shadow-xl hover:brightness-110">
          <span>You are still seated at “{live.name}” ({GAMES[kindOf(live.mode)].name}, {live.status === "playing" ? "game in progress" : "lobby"})</span>
          <span>Rejoin →</span>
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Points", stats?.points ?? 0],
          ["Matches won", stats?.matchesWon ?? 0],
          ["Matches played", stats?.matches ?? 0],
          ["Rounds won", stats?.roundsWon ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
            <p className="text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Achievements" className="rounded-2xl border border-amber-300/20 bg-white/[0.04] p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-200/80">Achievements · {badges.filter((id) => unlocked.has(id)).length}/{badges.length}</h2>
        <ul className="grid gap-2 sm:grid-cols-5">
          {badges.map((id) => {
            const on = unlocked.has(id);
            return (
              <li key={id} className={`rounded-xl p-3 text-xs ${on ? "bg-gradient-to-b from-[#f3d27a]/25 to-[#c9973a]/10 ring-1 ring-amber-300/60" : "bg-white/5 opacity-60"}`}>
                <b className={`block text-sm ${on ? "text-amber-100" : "text-white/70"}`}>{on ? "★ " : ""}{ACHIEVEMENTS[id].title}</b>
                <span className="text-white/60">{ACHIEVEMENTS[id].detail}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <Lobby kind={kind} userName={session.user.name} />

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">{c.topTitle}</h2>
          <Link href={`/${kind}/leaderboard`} className="text-sm text-amber-300 hover:underline">Full leaderboard</Link>
        </div>
        {top.length ? (
          <ol className="space-y-1 text-sm">
            {top.map((p, i) => (
              <li key={p.userId} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5">
                <span>{i + 1}. {p.name}</span>
                <span className="font-mono">{p.points}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-white/50">{c.boardEmpty}</p>
        )}
      </section>
      <p className="text-center text-xs text-white/40">Points: {GAMES[kind].points}</p>
    </main>
  );
}
