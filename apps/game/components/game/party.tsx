"use client";
// Imposter and Night Village: lobby options and the in-game panel over the table.
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { PACKS, PARTY_RULES, type PartyAction, type PartyKind, type PartyOpts, ROLES, type ImposterView, type VillageView } from "@/game/party-meta";
import type { RoomView } from "@/game/protocol";
import { send } from "@/lib/socket";
import { Btn } from "./hud";

const glass = "rounded-2xl border border-amber-300/25 bg-gradient-to-b from-[#1d150e]/92 to-[#0b0806]/92 shadow-[0_10px_40px_rgba(0,0,0,0.55)] backdrop-blur-md";
const act = (action: PartyAction) => send({ t: "party", action });
const range = (a: number, b: number, step = 1) => Array.from({ length: (b - a) / step + 1 }, (_, i) => a + i * step).map((n) => [n, String(n)] as [number, string]);
const nameOf = (room: RoomView, id: string | null | undefined) => (id === room.you ? "You" : room.players.find((p) => p.id === id)?.name ?? "?");

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
          {select("Clue laps", o.laps, range(1, 3), "laps", "Clues each player gives before the vote.")}
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
  return (
    <span className="flex items-center gap-2 text-xs text-amber-100/70">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-amber-100/10">
        <span className={`block h-full ${left < total * 0.3 ? "bg-red-400" : "bg-amber-300"}`} style={{ width: `${Math.min(100, (left / total) * 100)}%` }} />
      </span>
      {Math.ceil(left / 1000)}s
    </span>
  );
}

function Shell({ room, title, children }: { room: RoomView; title: string; children: ReactNode }) {
  const p = room.party!;
  const total = room.partyRules.seconds * 1000 * (p.phase === "vote" || p.phase === "day" ? 3 : 1);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3">
      <section aria-live="polite" className={`${glass} pointer-events-auto max-h-[58dvh] w-full max-w-xl space-y-3 overflow-y-auto p-4 text-white`}>
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">{title}</h2>
          <span className="flex items-center gap-3 text-xs text-white/60">
            Round {p.round}/{p.rounds}
            {p.phase !== "reveal" && p.phase !== "over" && <Clock ends={p.ends} total={total} />}
          </span>
        </header>
        {children}
      </section>
    </div>
  );
}

/** Buttons to pick one player. */
function Pick({ room, ids, chosen, onPick, extra }: { room: RoomView; ids: string[]; chosen: string | null | undefined; onPick: (id: string) => void; extra?: (id: string) => ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={chosen === id}
          onClick={() => onPick(id)}
          className={`rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${chosen === id ? "bg-gradient-to-b from-[#f3d27a] to-[#c9973a] text-[#1a1208]" : "bg-white/5 hover:bg-white/10"}`}
        >
          {nameOf(room, id)}
          {extra?.(id)}
        </button>
      ))}
    </div>
  );
}

function TextMove({ placeholder, label, onSend }: { placeholder: string; label: string; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(text.trim()); setText(""); } }}>
      <input autoFocus aria-label={placeholder} value={text} maxLength={30} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300" />
      <Btn type="submit">{label}</Btn>
    </form>
  );
}

function RoundEnd({ room }: { room: RoomView }) {
  const p = room.party!;
  const host = room.hostId === room.you;
  const won = p.winners.includes(room.you);
  return (
    <div className="space-y-3">
      <p className={`rounded-xl p-3 text-sm font-semibold ${won ? "bg-emerald-500/20 text-emerald-100" : "bg-white/5"}`}>{won ? "You win this round! " : ""}{p.outcome}</p>
      <ol className="space-y-1 text-sm">
        {room.players.toSorted((a, b) => b.score - a.score).map((x, i) => (
          <li key={x.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-1">
            <span>{i + 1}. {x.name}{x.id === room.you ? " (you)" : ""}</span><span className="font-mono">{x.score}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {p.phase === "over" ? (
          <>
            <Link href={`/${room.kind}/history/${room.code}`} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">Game log</Link>
            {host ? <Btn onClick={() => send({ t: "next" })}>Rematch</Btn> : <Btn variant="ghost" onClick={() => send({ t: "leave" })}>Back to lobby</Btn>}
          </>
        ) : (
          <>
            <span className="text-xs text-white/50">Next round starts shortly</span>
            {host && <Btn onClick={() => send({ t: "next" })}>Next round now</Btn>}
          </>
        )}
      </div>
    </div>
  );
}

export function PartyPanel({ room }: { room: RoomView }) {
  return room.party?.kind === "imposter" ? <Imposter room={room} p={room.party} /> : room.party?.kind === "village" ? <Village room={room} p={room.party} /> : null;
}

function Imposter({ room, p }: { room: RoomView; p: ImposterView }) {
  const [vote, setVote] = useState<string | null>(null);
  useEffect(() => {
    setVote(null);
  }, [p.round]);
  const title = { clues: `Clues · lap ${p.lap}/${p.laps}`, vote: "Vote: who is the imposter?", guess: "Last chance", reveal: "Round over", over: "Match over" }[p.phase];
  return (
    <Shell room={room} title={title}>
      <div className={`rounded-xl p-3 text-center ${p.youAreImposter && p.phase !== "reveal" && p.phase !== "over" ? "bg-red-500/20 ring-1 ring-red-400/50" : "bg-amber-300/10 ring-1 ring-amber-300/30"}`}>
        <p className="text-xs uppercase tracking-widest text-white/60">Category · {p.category}</p>
        {p.word ? <p className="text-2xl font-black text-amber-100">{p.word}</p> : <p className="text-xl font-black text-red-200">You are the imposter. Blend in!</p>}
      </div>
      {p.clues.length > 0 && (
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {p.clues.map((c, i) => (
            <li key={i} className="rounded-lg bg-white/5 px-3 py-1"><b className="text-sky-300">{nameOf(room, c.id)}:</b> {c.text}</li>
          ))}
        </ul>
      )}
      {p.phase === "clues" && (p.turn === room.you
        ? <TextMove placeholder="One short clue" label="Give clue" onSend={(text) => act({ type: "clue", text })} />
        : <p className="text-sm text-white/70">Waiting for {nameOf(room, p.turn)} to give a clue...</p>)}
      {p.phase === "vote" && (
        <>
          <Pick room={room} ids={room.players.filter((x) => x.id !== room.you).map((x) => x.id)} chosen={vote}
            onPick={(id) => { setVote(id); act({ type: "vote", target: id }); }}
            extra={(id) => p.done.includes(id) && <span className="block text-xs font-normal opacity-60">voted</span>} />
          <p className="text-xs text-white/50">{p.done.length}/{room.players.length} voted. You can change your vote until everyone has voted.</p>
        </>
      )}
      {p.phase === "guess" && (p.turn === room.you
        ? <TextMove placeholder="Guess the word" label="Guess" onSend={(text) => act({ type: "guess", text })} />
        : <p className="text-sm text-white/70">{nameOf(room, p.accused)} was the imposter and is guessing the word...</p>)}
      {(p.phase === "reveal" || p.phase === "over") && <RoundEnd room={room} />}
    </Shell>
  );
}

function Village({ room, p }: { room: RoomView; p: VillageView }) {
  const me = p.yourRole;
  const alive = p.alive.includes(room.you);
  const others = p.alive.filter((id) => id !== room.you);
  const roleTag = (id: string) => p.known[id] && id !== room.you ? <span className="block text-xs font-normal opacity-70">{ROLES[p.known[id]].name}</span> : null;
  const tally = (id: string) => Object.values(p.votes).filter((t) => t === id).length;
  const title = { night: `Night ${p.day + 1}`, day: `Day ${p.day}`, reveal: "Round over", over: "Match over" }[p.phase];
  return (
    <Shell room={room} title={title}>
      {me && p.phase !== "reveal" && p.phase !== "over" && (
        <div className={`rounded-xl p-3 ${me === "wolf" ? "bg-red-500/20 ring-1 ring-red-400/50" : "bg-sky-400/10 ring-1 ring-sky-300/30"}`}>
          <p className="font-black">You are the {ROLES[me].name}{alive ? "" : " (out)"}</p>
          <p className="text-xs text-white/70">{ROLES[me].detail}</p>
          {me === "wolf" && <p className="mt-1 text-xs text-red-200">Pack: {Object.keys(p.known).filter((id) => p.known[id] === "wolf").map((id) => nameOf(room, id)).join(", ")}</p>}
          {p.seen.length > 0 && <p className="mt-1 text-xs text-sky-200">Checked: {p.seen.map((x) => `${nameOf(room, x.id)} ${x.wolf ? "is a WOLF" : "is not a wolf"}`).join(" · ")}</p>}
        </div>
      )}
      {p.news.map((n, i) => <p key={i} className="rounded-lg bg-white/5 px-3 py-2 text-sm">{n}</p>)}
      {p.phase === "night" && (!alive
        ? <p className="text-sm text-white/60">You are out. Watch quietly, no hints in chat.</p>
        : me === "villager"
          ? <p className="text-sm text-white/70">The village sleeps. Wait for morning...</p>
          : (
            <>
              <p className="text-sm text-white/70">{me === "wolf" ? "Pick who the wolves take tonight." : me === "seer" ? "Pick someone to check." : "Pick someone to protect."}</p>
              <Pick room={room} chosen={p.yourPick}
                ids={(me === "healer" ? p.alive : others).filter((id) => me !== "wolf" || p.known[id] !== "wolf")}
                onPick={(id) => act({ type: "pick", target: id })}
                extra={(id) => me === "wolf" && tally(id) > 0 ? <span className="block text-xs font-normal opacity-70">{tally(id)} wolf pick</span> : null} />
            </>
          ))}
      {p.phase === "day" && (
        <>
          <p className="text-sm text-white/70">{alive ? "Talk it over in chat, then vote to send someone away." : "You are out. Watch quietly."}</p>
          {alive && (
            <>
              <Pick room={room} ids={others} chosen={p.votes[room.you]} onPick={(id) => act({ type: "vote", target: id })}
                extra={(id) => <>{roleTag(id)}{tally(id) > 0 && <span className="block text-xs font-normal opacity-70">{tally(id)} vote{tally(id) > 1 ? "s" : ""}</span>}</>} />
              <Btn variant="ghost" aria-pressed={p.votes[room.you] === null} onClick={() => act({ type: "vote", target: null })}>
                Skip vote{p.votes[room.you] === null ? " ✓" : ""}
              </Btn>
            </>
          )}
          <p className="text-xs text-white/50">{p.done.length}/{p.alive.length} voted.</p>
        </>
      )}
      {(p.phase === "reveal" || p.phase === "over") && (
        <>
          <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
            {room.players.map((x) => (
              <li key={x.id} className={`rounded-lg px-3 py-1 ${p.known[x.id] === "wolf" ? "bg-red-500/20" : "bg-white/5"}`}>
                {x.name}<span className="block text-xs text-white/60">{p.known[x.id] ? ROLES[p.known[x.id]].name : ""}</span>
              </li>
            ))}
          </ul>
          <RoundEnd room={room} />
        </>
      )}
    </Shell>
  );
}
