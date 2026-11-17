"use client";
// Imposter in the room: the spotlit stage with everyone's clues under their name, and the panel
// that tells you exactly what to do next.
import { useEffect, useState } from "react";
import type { ImposterView } from "@/game/party-meta";
import type { RoomView } from "@/game/protocol";
import { Btn } from "./hud";
import { Panel, RoundEnd, TextMove, act, nameOf } from "./party";
import { PartyStage } from "./party-stage";

const STEPS = ["Clues", "Vote", "Reveal"];

export function ImposterGame({ room }: { room: RoomView }) {
  const p = room.party?.kind === "imposter" ? room.party : null;
  const [vote, setVote] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const round = p?.round;
  useEffect(() => {
    setVote(null);
    setHidden(false);
  }, [round]);
  if (!p) return <PartyStage room={room} ring={{}} />;

  const over = p.phase === "reveal" || p.phase === "over";
  const others = room.players.filter((x) => x.id !== room.you).map((x) => x.id);
  const cluesOf = (id: string) => p.clues.filter((c) => c.id === id).map((c) => c.text);
  const votesFor = (id: string) => Object.values(p.votes ?? {}).filter((t) => t === id).length;
  const doVote = (id: string) => {
    setVote(id);
    act({ type: "vote", target: id });
  };

  return (
    <>
      <PartyStage
        room={room}
        tense={p.phase === "vote" || p.phase === "guess"}
        ring={{
          banner: { clues: p.lap === 1 ? `Round ${p.round}` : `Lap ${p.lap}`, vote: "Who's the faker?", guess: "Caught!", reveal: banner(p), over: banner(p) }[p.phase],
          notes: cluesOf,
          pickable: p.phase === "vote" ? new Set(others) : undefined,
          picked: p.phase === "vote" ? vote : null,
          onPick: doVote,
          badge: (id) => (over && votesFor(id) ? votesFor(id) : null),
          tone: (id) => (over && p.imposters?.includes(id)) || (p.phase === "guess" && p.accused === id) ? "bad" : over && p.winners.includes(id) ? "good" : null,
          status: (id) =>
            p.phase === "clues" && p.turn === id ? (id === room.you ? "your turn" : "thinking...")
            : p.phase === "vote" && p.done.includes(id) ? "voted"
            : over && p.imposters?.includes(id) ? "the imposter"
            : null,
        }}
      />
      <Panel room={room} steps={STEPS} at={over ? 2 : p.phase === "clues" ? 0 : 1} timer={over ? null : room.partyRules.seconds * 1000 * (p.phase === "vote" ? 3 : 1)}
        hot={(p.phase === "clues" || p.phase === "guess") && p.turn === room.you || (p.phase === "vote" && !vote)}
        title={title(room, p, vote)}>
        {!over && <Secret p={p} hidden={hidden} onToggle={() => setHidden(!hidden)} />}
        {p.phase === "clues" && <Clues room={room} p={p} />}
        {p.phase === "vote" && (
          <>
            <p className="text-sm text-white/70">{p.youAreImposter ? "Vote too, or you'll stand out. " : ""}Tap a suspect on the table, or here. Compare their clues.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {others.map((id) => (
                <button key={id} type="button" aria-pressed={vote === id} onClick={() => doVote(id)}
                  className={`rounded-xl p-2 text-left text-sm transition ${vote === id ? "bg-gradient-to-b from-[#f3d27a] to-[#c9973a] text-black" : "bg-white/5 hover:bg-white/10"}`}>
                  <b>{nameOf(room, id)}</b>{p.done.includes(id) && <span className="ml-1 text-xs opacity-60">· voted</span>}
                  <span className="block text-xs opacity-80">{cluesOf(id).join(" · ") || "no clues"}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-white/55">{vote ? `You voted for ${nameOf(room, vote)}. Tap someone else to change it. ` : ""}{p.done.length} of {room.players.length} have voted.</p>
          </>
        )}
        {p.phase === "guess" && (p.turn === room.you
          ? <TextMove placeholder="Guess the secret word" label="Guess" hint={`The category is ${p.category}. Use the clues!`} onSend={(text) => act({ type: "guess", text })} />
          : <p className="text-sm text-white/75">If they guess the word, the imposter still wins. Fingers crossed...</p>)}
        {over && (
          <RoundEnd room={room} headline={headline(room, p)}>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/5 p-3"><p className="text-xs uppercase tracking-widest text-white/50">The word</p><p className="text-xl font-black text-amber-100">{p.word}</p></div>
              <div className="rounded-xl bg-red-500/15 p-3 ring-1 ring-red-400/30"><p className="text-xs uppercase tracking-widest text-white/50">Imposter</p><p className="text-xl font-black text-red-200">{(p.imposters ?? []).map((id) => nameOf(room, id)).join(" & ")}</p></div>
            </div>
          </RoundEnd>
        )}
      </Panel>
    </>
  );
}

/** Your secret, which you can hide if someone is looking over your shoulder. */
function Secret({ p, hidden, onToggle }: { p: ImposterView; hidden: boolean; onToggle: () => void }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${p.youAreImposter ? "bg-red-500/20 ring-1 ring-red-400/50" : "bg-amber-300/10 ring-1 ring-amber-300/30"}`}>
      <div>
        <p className="text-xs uppercase tracking-widest text-white/60">{p.youAreImposter ? "You are the imposter" : "Your secret word"} · {p.category}</p>
        <p className={`text-2xl font-black ${p.youAreImposter ? "text-red-100" : "text-amber-100"}`}>
          {hidden ? "••••••" : p.youAreImposter ? "Blend in!" : p.word}
        </p>
        {!hidden && p.youAreImposter && <p className="text-xs text-red-100/80">You don't know the word. Listen to the clues and bluff.</p>}
      </div>
      <Btn variant="ghost" className="shrink-0 px-3 text-xs" onClick={onToggle}>{hidden ? "Show" : "Hide"}</Btn>
    </div>
  );
}

function Clues({ room, p }: { room: RoomView; p: ImposterView }) {
  if (p.turn === room.you) {
    return (
      <TextMove
        placeholder={p.youAreImposter ? "A clue that fits in" : "Your clue"}
        label="Give clue"
        hint={p.youAreImposter ? "Bluff: match the feel of the others' clues." : "1 to 3 words. Don't say the word, don't make it too easy."}
        onSend={(text) => act({ type: "clue", text })}
      />
    );
  }
  const order = room.players.map((x) => x.id);
  const at = order.indexOf(p.turn ?? "");
  const next = [1, 2].map((k) => order[(at + k) % order.length]).filter((id) => id !== p.turn);
  return (
    <p className="text-sm text-white/70">
      Up next: {next.map((id) => nameOf(room, id)).join(", then ")}.{" "}
      {p.youAreImposter ? "Use their clues to work out the word." : "Watch for clues that are a little too vague."}
    </p>
  );
}

function title(room: RoomView, p: ImposterView, vote: string | null) {
  if (p.phase === "clues") return p.turn === room.you ? "Your turn: give a clue" : `${nameOf(room, p.turn)} is thinking of a clue...`;
  if (p.phase === "vote") return vote ? "Vote in. Waiting for the others..." : "Who's the imposter?";
  if (p.phase === "guess") return p.turn === room.you ? "They caught you! One guess to steal the win" : `${nameOf(room, p.accused)} was the imposter!`;
  return p.phase === "over" ? "Case closed" : `Round ${p.round} result`;
}

function banner(p: ImposterView) {
  const caught = p.accused !== null && (p.imposters ?? []).includes(p.accused);
  return caught && !p.winners.some((id) => p.imposters?.includes(id)) ? "Caught!" : "Escaped!";
}

function headline(room: RoomView, p: ImposterView) {
  const imp = (p.imposters ?? []).includes(room.you);
  const won = p.winners.includes(room.you);
  const caught = p.accused !== null && (p.imposters ?? []).includes(p.accused);
  if (imp) return won ? (caught ? "Caught, but you cracked the word!" : "You fooled them all!") : "They saw right through you!";
  if (won) return "You caught the imposter!";
  return caught ? "So close! They guessed the word." : "The imposter slipped away. Next time!";
}
