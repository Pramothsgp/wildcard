import { requireSession } from "@repo/auth/next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isMember, roomLog } from "@/game/store";
import { auth } from "@/lib/auth";
import { gameParam } from "@/lib/game-param";

export const dynamic = "force-dynamic";

export default async function GameLogPage({ params }: { params: Promise<{ game: string; code: string }> }) {
  const session = await requireSession(auth());
  const kind = await gameParam(params);
  const code = (await params).code.toUpperCase();
  // Only people who sat at the table can read its log.
  if (!(await isMember(code, session.user.id))) notFound();
  const log = await roomLog(code);
  if (!log) notFound();
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-white">
      <Link href={`/${kind}/history`} className="text-sm text-amber-300 hover:underline">← My games</Link>
      <h1 className="text-3xl font-black">{log.name}</h1>
      <p className="text-sm text-white/60">Table {code} · {log.status} · started {log.createdAt.toLocaleString()}</p>
      <ol className="space-y-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4 font-mono text-xs">
        {log.events.map((e) => (
          <li key={e.seq} className={e.kind === "roundOver" || e.kind === "matchOver" ? "font-bold text-amber-300" : "text-white/80"}>
            <span className="text-white/40">{e.createdAt.toLocaleTimeString()} R{e.round}</span> {e.text}
          </li>
        ))}
      </ol>
    </main>
  );
}
