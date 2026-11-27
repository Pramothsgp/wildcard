"use client";
// Draw it in the room: the word (or its hint) on top, the board in the middle, the players or teams
// and the guesses on the side, and what you can do right now underneath.
import { DRAW_STYLES, type DrawView, TEAMS } from "@/game/party-meta";
import type { RoomView } from "@/game/protocol";
import { Btn } from "./hud";
import { Clock, RoundEnd, TextMove, act, glass, nameOf } from "./party";
import { Sketch } from "./sketch";

const PICK_MS = 15_000;
const who = (room: RoomView, ids: string[]) => ids.map((id) => nameOf(room, id)).join(" & ");
const LEVEL_LOOK = { easy: "bg-emerald-900/30 text-emerald-900", medium: "bg-sky-900/30 text-sky-900", hard: "bg-red-900/30 text-red-900" };

export function DrawGame({ room }: { room: RoomView }) {
  const p = room.party?.kind === "draw" ? room.party : null;
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,#12324a_0%,#0b1622_55%,#05080d_100%)]">
      <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:22px_22px]" />
      {p && (
        <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto px-3 pb-20 pt-52 sm:pt-32 lg:flex-row lg:overflow-hidden lg:pb-3 lg:pr-[324px] lg:pt-20">
          {/* On narrow screens the page scrolls; the board keeps its shape instead of shrinking. */}
          <main className="flex shrink-0 flex-col gap-2 lg:min-h-0 lg:flex-1 lg:shrink">
            <WordBar room={room} p={p} />
            <Sketch turnKey={p.turnKey} canDraw={p.canDraw} />
            <Moves room={room} p={p} />
          </main>
          <aside className="flex shrink-0 flex-col gap-2 lg:order-first lg:w-60 lg:overflow-y-auto">
            <Players room={room} p={p} />
            <Guesses room={room} p={p} />
          </aside>
        </div>
      )}
    </div>
  );
}

function WordBar({ room, p }: { room: RoomView; p: DrawView }) {
  const over = p.phase === "reveal" || p.phase === "over";
  const relay = p.style === "relay";
  const label =
    p.phase === "pick" ? (p.choices ? "Pick a word to draw" : `${nameOf(room, p.drawers[0])} ${p.drawers[0] === room.you ? "are" : "is"} picking a word`)
    : over ? "The word was"
    : p.phase === "steal" ? (p.canGuess ? "Steal it!" : "The other teams can steal it")
    : p.word && relay && !p.guessers.includes(room.you) ? `The word · don't tell ${who(room, p.guessers)}!`
    : p.word && p.drawer === room.you ? "Draw this"
    : p.word ? "You got it"
    : p.canGuess ? "Guess the word"
    : "The word is hidden from you";
  const shown = p.word ?? p.hint;
  // Classic splits the drawing time into steps (a hint letter each); show the whole time, not the step.
  const step = room.partyRules.seconds * 1000;
  const [ends, total] = p.phase === "pick" ? [p.ends, PICK_MS] : p.phase === "steal" ? [p.ends, (room.partyRules.stealSeconds ?? 20) * 1000] : relay ? [p.ends, step] : [p.ends && p.ends + (p.slots - p.slot - 1) * step, p.slots * step];
  return (
    <div className={`${glass} flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2`}>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-white/55">{label}{p.category && !over ? ` · ${p.category}` : ""}{p.level && !over ? ` · ${p.level}` : ""}</p>
        {p.phase !== "pick" && (
          <p className={`font-mono text-2xl font-black tracking-[0.25em] ${p.word ? "text-amber-200" : "text-white"}`} aria-label={p.word ?? `${p.hint.length} letters: ${p.hint.replace(/_/g, " blank ")}`}>
            {[...shown].map((ch, i) => <span key={i} className={ch === " " ? "inline-block w-4" : undefined}>{ch}</span>)}
            {!p.word && <span className="ml-2 align-middle font-sans text-xs font-normal tracking-normal text-white/50">{p.hint.replace(/[^_a-z0-9]/gi, "").length} letters</span>}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-white/65">
        <span>{DRAW_STYLES[p.style]} · Round {p.round} of {p.rounds}</span>
        {p.phase === "draw" && relay && <span>Drawer {(p.slot % p.drawers.length) + 1} of {p.drawers.length} · turn {p.slot + 1}/{p.slots}</span>}
        {p.phase === "steal" && <span className="font-bold text-amber-200">Steal round</span>}
        {!over && <Clock ends={ends} total={total} />}
      </div>
    </div>
  );
}

function Moves({ room, p }: { room: RoomView; p: DrawView }) {
  const relay = p.style === "relay";
  if (p.phase === "reveal" || p.phase === "over") {
    return (
      <div className={`${glass} p-3`}>
        <RoundEnd room={room} headline={headline(room, p)}>
          {p.outcome && <p className="text-center text-sm text-white/75">{p.outcome}</p>}
        </RoundEnd>
      </div>
    );
  }
  let body;
  if (p.phase === "pick") {
    body = p.choices ? (
      <div className="flex flex-wrap justify-center gap-2">
        {p.choices.map((c, i) => (
          <Btn key={c.word} kbd={String(i + 1)} className="text-base" onClick={() => act({ type: "word", index: i })}>
            {c.word}<span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${LEVEL_LOOK[c.level]}`}>{c.level}</span>
          </Btn>
        ))}
      </div>
    ) : <p className="text-center text-sm text-white/70">Get ready{p.guessers.includes(room.you) ? ": you're guessing this one" : ""}...</p>;
  } else if (p.canGuess) {
    const hint = p.phase === "steal" ? "They missed it. First right guess steals the points for your team."
      : relay ? "Your teammates are drawing it for you. Guess as often as you like." : "The faster you get it, the more you score.";
    body = <TextMove placeholder="Type your guess" label="Guess" hint={hint} onSend={(text) => act({ type: "guess", text })} />;
  } else if (p.canDraw) {
    body = (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/80">
          Your turn to draw <b className="text-amber-200">{p.word}</b>. No letters or numbers!
          {relay && p.drawers.length > 1 && <> Next up: {nameOf(room, p.drawers[(p.slot + 1) % p.drawers.length])}.</>}
        </p>
        {relay && <Btn variant="ghost" kbd="n" onClick={() => act({ type: "pass" })}>Pass the pen</Btn>}
      </div>
    );
  } else {
    const mine = p.yourTeam === p.active;
    const text = !relay ? (p.solved.includes(room.you) ? "You got it! Watch the others try." : `${nameOf(room, p.drawer)} is drawing.`)
      : p.phase === "steal" ? "Time's up. The other teams are trying to steal it."
      : p.drawers.includes(room.you) ? `Your teammate ${nameOf(room, p.drawer)} is drawing. Your turn comes round soon.`
      : mine ? "You're sitting this turn out. Cheer your team on!"
      : p.word ? `You know the word. Watch ${who(room, p.guessers)} try to get it.`
      : room.partyRules.steal ? `Watch closely: if ${who(room, p.guessers)} can't get it, your team can steal it.`
      : `Team ${TEAMS[p.active].name} is guessing.`;
    body = <p className="text-center text-sm text-white/70">{text}</p>;
  }
  return <div className={`${glass} p-3 ${p.canGuess || p.choices ? "panel-hot" : ""}`}>{body}</div>;
}

function Players({ room, p }: { room: RoomView; p: DrawView }) {
  const score = (id: string) => room.players.find((x) => x.id === id)?.score ?? 0;
  const status = (id: string) =>
    p.phase === "draw" && id === p.drawer ? "drawing"
    : p.phase === "pick" && id === p.drawers[0] ? "picking"
    : p.solved.includes(id) ? "got it"
    : p.guessers.includes(id) ? "guessing"
    : null;
  const row = (id: string) => (
    <li key={id} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm ${id === room.you ? "bg-amber-300/15" : "bg-white/5"}`}>
      <span className="truncate">{nameOf(room, id)}{status(id) && <span className={`ml-1.5 text-xs ${status(id) === "got it" ? "text-emerald-300" : "text-amber-200/80"}`}>· {status(id)}</span>}</span>
      <span className="font-mono text-xs text-white/70">{p.gained[id] ? <b className="mr-1 text-emerald-300">+{p.gained[id]}</b> : null}{score(id)}</span>
    </li>
  );
  if (p.style === "relay") {
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {p.teams.map((t, i) => (
          <section key={i} className={`${glass} p-2 ${p.phase !== "over" && p.active === i ? "ring-2" : ""}`} style={{ ["--tw-ring-color" as string]: TEAMS[i].color }}>
            <h3 className="mb-1 flex justify-between px-1 text-xs font-black uppercase tracking-widest" style={{ color: TEAMS[i].color }}>
              <span>Team {TEAMS[i].name}{p.yourTeam === i ? " (you)" : ""}</span><span>{t.score}</span>
            </h3>
            <ul className="space-y-1">{t.members.map(row)}</ul>
          </section>
        ))}
      </div>
    );
  }
  return (
    <section className={`${glass} p-2`}>
      <h3 className="mb-1 px-1 text-xs font-black uppercase tracking-widest text-white/60">Artists</h3>
      <ul className="space-y-1">{room.players.map((x) => x.id).toSorted((a, b) => score(b) - score(a)).map(row)}</ul>
    </section>
  );
}

function Guesses({ room, p }: { room: RoomView; p: DrawView }) {
  if (!p.guesses.length && !p.solved.length) return null;
  return (
    <section className={`${glass} p-2`} aria-label="Guesses">
      <h3 className="mb-1 px-1 text-xs font-black uppercase tracking-widest text-white/60">Guesses</h3>
      <ul className="max-h-48 space-y-0.5 overflow-y-auto text-sm lg:max-h-none">
        {p.guesses.map((g, i) => (
          <li key={i} className="px-1"><b className="text-white/70">{nameOf(room, g.id)}:</b> {g.text}{g.close && <span className="ml-1 rounded bg-amber-300/20 px-1 text-xs font-bold text-amber-200">so close!</span>}</li>
        ))}
        {p.solved.map((id) => <li key={id} className="px-1 font-bold text-emerald-300">{nameOf(room, id)} guessed it!</li>)}
      </ul>
    </section>
  );
}

function headline(room: RoomView, p: DrawView) {
  if (p.phase === "over") return p.winners.includes(room.you) ? "Champion artist!" : "That's the match!";
  const got = p.solved.length > 0;
  if (p.style === "relay") {
    if (p.yourTeam === p.active) return got ? "Your team got it!" : "So close! The word got away.";
    return `Team ${TEAMS[p.active].name} ${got ? "got it" : "missed it"}`;
  }
  if (p.drawer === room.you) return got ? `${p.solved.length} guessed your drawing!` : "Nobody got it. Tough word!";
  return p.solved.includes(room.you) ? "You got it!" : "Missed it this time";
}
