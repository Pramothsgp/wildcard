import Link from "next/link";
import { GAMES, type GameKind } from "@/game/party-meta";

/** Top of every page inside a game: back to all games, then this game's pages. */
export function GameNav({ kind, title }: { kind: GameKind; title?: string }) {
  const link = "rounded-xl bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20";
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Link href="/" className="text-sm text-amber-300 hover:underline">← All games</Link>
        <h1 className="text-3xl font-black">{title ?? GAMES[kind].name}</h1>
      </div>
      <nav className="flex flex-wrap gap-2">
        <Link href={`/${kind}`} className={link}>Play</Link>
        <Link href={`/${kind}/leaderboard`} className={link}>Leaderboard</Link>
        <Link href={`/${kind}/history`} className={link}>My games</Link>
      </nav>
    </header>
  );
}
