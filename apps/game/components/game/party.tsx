"use client";
// Pieces shared by Imposter and Night Village: the panel, timer, phase steps, text moves,
// the round result, and the lobby options and rules.
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { PACKS, PARTY_RULES, type PartyAction, type PartyKind, type PartyOpts } from "@/game/party-meta";
import type { RoomView } from "@/game/protocol";
import { send } from "@/lib/socket";
import { Btn } from "./hud";

export const glass = "rounded-2xl border border-white/15 bg-gradient-to-b from-[#1a1424]/92 to-[#09070d]/92 shadow-[0_10px_40px_rgba(0,0,0,0.55)] backdrop-blur-md";
export const act = (action: PartyAction) => send({ t: "party", action });
export const nameOf = (room: RoomView, id: string | null | undefined) => (id === room.you ? "You" : room.players.find((p) => p.id === id)?.name ?? "?");
const range = (a: number, b: number, step = 1) => Array.from({ length: (b - a) / step + 1 }, (_, i) => a + i * step).map((n) => [n, String(n)] as [number, string]);

export function PartyOptions({ room, host, onChange }: { room: RoomView; host: boolean; onChange: (o: Partial<PartyOpts>) => void }) {
  const o = room.partyRules;
  const select = (label: string, value: string | number, options: [string | number, string][], key: keyof PartyOpts, hint: string) => (
    <label className="flex items-center justify-between gap-2 rounded-xl bg-white/5 p-3 text-sm font-semibold">
      <span>{label}<span className="block text-xs font-normal text-white/50">{hint}</span></span>
      <select
        disabled={!host}
        value={value}
        onChange={(e) => onChange({ [key]: typeof value === "number" ? Number(e.target.value) : e.target.value })}
        className="rounded-lg bg-white/10 px-2 py-1 outline-none focus:ring-2 focus:ring-amber-300"
      >
        {options.map(([v, l]) => <option key={v} value={v} className="bg-[#1d150e]">{l}</option>)}
      </select>
    </label>
  );
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {room.kind === "imposter" && (
        <>
          {select("Word pack", o.pack, Object.entries(PACKS), "pack", "Where the secret words come from.")}
          {select("Imposters", o.imposters, [[1, "1"], [2, "2 (6+ players)"], [3, "3 (12+ players)"]], "imposters", "Smaller tables get fewer, whatever you pick.")}
          {select("Clue laps", o.laps, range(1, 3), "laps", "Clues each suspect gives before the vote.")}
        </>
      )}
      {select("Rounds", o.rounds, range(1, 10), "rounds", "Rounds in the match.")}
      {select(room.kind === "imposter" ? "Seconds per clue" : "Seconds per night", o.seconds, range(10, 120, 10), "seconds", "Voting gets three times this.")}
    </div>
  );
}

export function PartyRules({ kind }: { kind: PartyKind }) {
  return (
    <>
      {PARTY_RULES[kind].map((r) => (
        <section key={r.title} className="space-y-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300/80">{r.title}</h3>
          <p className="text-sm leading-relaxed text-white/80">{r.text}</p>
        </section>
      ))}
    </>
  );
}

function Clock({ ends, total }: { ends: number | null; total: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  if (!ends) return null;
  const left = Math.max(0, ends - now);
  const low = left < total * 0.3;
  return (
    <span className={`flex items-center gap-2 text-sm font-bold tabular-nums ${low ? "text-red-300" : "text-white/80"}`} aria-label={`${Math.ceil(left / 1000)} seconds left`}>
      <span className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
        <span className={`block h-full transition-[width] duration-200 ${low ? "bg-red-400" : "bg-amber-300"}`} style={{ width: `${Math.min(100, (left / total) * 100)}%` }} />
      </span>
      {Math.ceil(left / 1000)}s
    </span>
  );
}

/** Where we are in the round: e.g. Clues › Vote › Reveal, with the current step lit. */
function Steps({ steps, at }: { steps: string[]; at: number }) {
  return (
    <ol className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider">
      {steps.map((s, i) => (
        <li key={s} className={`rounded-full px-2 py-0.5 ${i === at ? "bg-amber-300 text-black" : i < at ? "bg-white/15 text-white/70" : "bg-white/5 text-white/40"}`}>{s}</li>
      ))}
    </ol>
  );
}

/** The panel at the bottom of the scene. `hot` makes it glow when it's your move. */
export function Panel({ room, title, steps, at, timer, hot, children }: { room: RoomView; title: string; steps: string[]; at: number; timer: number | null; hot?: boolean; children: ReactNode }) {
  const p = room.party!;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3">
      <section aria-live="polite" className={`${glass} pointer-events-auto max-h-[50dvh] w-full max-w-2xl space-y-3 overflow-y-auto p-4 text-white ${hot ? "panel-hot" : ""}`}>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <Steps steps={steps} at={at} />
          <span className="flex items-center gap-3 text-xs text-white/60">
            Round {p.round} of {p.rounds}
            {timer !== null && <Clock ends={p.ends} total={timer} />}
          </span>
        </header>
        <h2 className="text-xl font-black">{title}</h2>
        {children}
      </section>
    </div>
  );
}

export function TextMove({ placeholder, label, hint, onSend }: { placeholder: string; label: string; hint: string; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(text.trim()); setText(""); } }}>
      <div className="flex gap-2">
        <input autoFocus aria-label={placeholder} value={text} maxLength={30} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2.5 text-lg outline-none focus:ring-2 focus:ring-amber-300" />
        <Btn type="submit" disabled={!text.trim()}>{label}</Btn>
      </div>
      <p className="flex justify-between text-xs text-white/50"><span>{hint}</span><span>{text.length}/30</span></p>
    </form>
  );
}

/** End of a round: a personal headline, what happened, and everyone's points with what they just earned. */
export function RoundEnd({ room, headline, children }: { room: RoomView; headline: string; children?: ReactNode }) {
  const p = room.party!;
  const host = room.hostId === room.you;
  const won = p.winners.includes(room.you);
  const mine = p.gained[room.you] ?? 0;
  const over = p.phase === "over";
  return (
    <div className="space-y-3">
      <div className={`result-pop rounded-2xl p-3 text-center ${won ? "bg-gradient-to-b from-emerald-400/30 to-emerald-700/20 ring-1 ring-emerald-300/50" : "bg-white/5 ring-1 ring-white/10"}`}>
        <p className="text-2xl font-black">{headline}</p>
        {mine > 0 && <p className="text-lg font-black text-emerald-200">+{mine} points</p>}
      </div>
      {children}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {over ? (
          <>
            <Link href={`/${room.kind}/history/${room.code}`} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">Game log</Link>
            {host ? <Btn onClick={() => send({ t: "next" })}>Play again</Btn> : <Btn variant="ghost" onClick={() => send({ t: "leave" })}>Back to the lobby</Btn>}
          </>
        ) : (
          <>
            <span className="text-xs text-white/55">Next round starts in a few seconds</span>
            {host && <Btn onClick={() => send({ t: "next" })}>Start it now</Btn>}
          </>
        )}
      </div>
      <ol className="grid gap-1 text-sm sm:grid-cols-2">
        {room.players.toSorted((a, b) => b.score - a.score).map((x, i) => (
          <li key={x.id} className={`flex justify-between rounded-lg px-3 py-1.5 ${x.id === room.you ? "bg-amber-300/15" : "bg-white/5"}`}>
            <span>{over && i === 0 ? "Champion · " : `${i + 1}. `}{x.name}{x.id === room.you ? " (you)" : ""}</span>
            <span className="font-mono">{p.gained[x.id] ? <b className="mr-2 text-emerald-300">+{p.gained[x.id]}</b> : null}{x.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
