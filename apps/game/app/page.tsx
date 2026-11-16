import { SignOutButton } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import Link from "next/link";
import { Lobby } from "@/components/lobby";
import { ACHIEVEMENTS, type AchievementId } from "@/game/help";
import { achievementsFor, leaderboard, liveRoomFor, statsFor } from "@/game/store";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const link = "rounded-xl px-4 py-2 text-sm font-bold transition";

export default async function Home() {
  const session = await getSession(auth());

  if (!session) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-3xl place-items-center px-4 text-white">
        <div className="space-y-6 text-center">
          <h1 className="bg-gradient-to-r from-amber-300 via-pink-400 to-sky-400 bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-7xl">
            WILDCARD
          </h1>
          <p className="text-lg text-white/70">
            A 3D shedding card game for 2 to 10 players. Match colour or number, stack the draws, flip to the dark side,
            and be first to empty your hand.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/signup" className={`${link} bg-amber-400 text-black hover:bg-amber-300`}>Create account</Link>
            <Link href="/signin" className={`${link} bg-white/10 hover:bg-white/20`}>Sign in</Link>
          </div>
        </div>
      </main>
    );
  }

  const [live, stats, top, earned] = await Promise.all([
    liveRoomFor(session.user.id), statsFor(session.user.id), leaderboard(5), achievementsFor(session.user.id),
  ]);
  const unlocked = new Set<string>(earned);
  if ((stats?.roundsWon ?? 0) > 0) unlocked.add("firstWin");
  if ((stats?.matchesWon ?? 0) > 0) unlocked.add("matchWin");

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="bg-gradient-to-r from-amber-300 via-pink-400 to-sky-400 bg-clip-text text-4xl font-black text-transparent">WILDCARD</h1>
        <nav className="flex flex-wrap items-center gap-2">
          <Link href="/leaderboard" className={`${link} bg-white/10 hover:bg-white/20`}>Leaderboard</Link>
          <Link href="/history" className={`${link} bg-white/10 hover:bg-white/20`}>My games</Link>
          <SignOutButton />
        </nav>
      </header>

      {live && (
        <Link href={`/room/${live.code}`} className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-pink-600 to-orange-500 px-5 py-4 font-bold shadow-xl hover:brightness-110">
          <span>You are still seated at “{live.name}” ({live.status === "playing" ? "game in progress" : "lobby"})</span>
          <span>Rejoin →</span>
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Global points", stats?.points ?? 0],
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
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-200/80">
          Achievements · {unlocked.size}/{Object.keys(ACHIEVEMENTS).length}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-5">
          {(Object.keys(ACHIEVEMENTS) as AchievementId[]).map((id) => {
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

      <Lobby userName={session.user.name} />

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">Top players</h2>
          <Link href="/leaderboard" className="text-sm text-amber-300 hover:underline">Full leaderboard</Link>
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
          <p className="text-sm text-white/50">Nobody has scored yet. Win a round to get on the board.</p>
        )}
      </section>
      <p className="text-center text-xs text-white/40">
        Points: win a round to score the cards left in everyone else&apos;s hands, plus 100 for winning a match.
      </p>
    </main>
  );
}
