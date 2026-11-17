import { SignOutButton } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import Link from "next/link";
import { GAMES, type GameKind, kindOf, roomPath } from "@/game/party-meta";
import { liveRoomFor } from "@/game/store";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const link = "rounded-xl px-4 py-2 text-sm font-bold transition";
/** Each game's colours on its card. */
const LOOK: Record<GameKind, string> = {
  wildcard: "from-emerald-700/60 via-emerald-900/40 to-amber-700/30 ring-amber-300/40",
  imposter: "from-fuchsia-700/50 via-violet-950/60 to-black ring-fuchsia-400/40",
  village: "from-indigo-800/60 via-slate-950/70 to-orange-800/30 ring-indigo-300/40",
};

export default async function Home() {
  const session = await getSession(auth());
  const live = session ? await liveRoomFor(session.user.id) : null;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-amber-300 via-pink-400 to-sky-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">GAME NIGHT</h1>
          <p className="text-white/60">Pick a game, open a table, send your friends the code.</p>
        </div>
        {session ? <SignOutButton /> : (
          <div className="flex gap-2">
            <Link href="/signup" className={`${link} bg-amber-400 text-black hover:bg-amber-300`}>Create account</Link>
            <Link href="/signin" className={`${link} bg-white/10 hover:bg-white/20`}>Sign in</Link>
          </div>
        )}
      </header>

      {live && (
        <Link href={roomPath(kindOf(live.mode), live.code)} className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-pink-600 to-orange-500 px-5 py-4 font-bold shadow-xl hover:brightness-110">
          <span>You are still seated at “{live.name}” ({GAMES[kindOf(live.mode)].name})</span>
          <span>Rejoin →</span>
        </Link>
      )}

      <ul className="grid gap-4 md:grid-cols-3">
        {(Object.keys(GAMES) as GameKind[]).map((kind) => (
          <li key={kind}>
            <Link
              href={session ? `/${kind}` : "/signin"}
              className={`flex h-full flex-col justify-between gap-6 rounded-3xl bg-gradient-to-br p-6 ring-1 transition hover:-translate-y-1 hover:brightness-110 ${LOOK[kind]}`}
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-black">{GAMES[kind].name}</h2>
                <p className="text-sm text-white/75">{GAMES[kind].blurb}</p>
              </div>
              <span className="flex items-center justify-between text-sm font-bold">
                <span className="text-white/60">{GAMES[kind].min} to {GAMES[kind].max} players</span>
                <span>Play →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
