"use client";
// Night Village in the room: the village scene where you tap players to act, a role card at the
// start of each round, and a panel that says what your role does right now.
import { useState } from "react";
import { ROLES, type Role, type VillageView } from "@/game/party-meta";
import type { RoomView } from "@/game/protocol";
import { Btn } from "./hud";
import { Panel, RoundEnd, act, glass, nameOf } from "./party";
import { PartyStage } from "./party-stage";

const MISSION: Record<Role, string> = {
  wolf: "Each night, pick a villager to take with your pack. By day, act innocent and steer the vote.",
  seer: "Each night, look into one player's heart and learn if they're a wolf. Share wisely by day.",
  healer: "Each night, protect one player, even yourself. If the wolves pick them, they survive.",
  villager: "No night powers, but your vote is your weapon. Listen, question, and find the wolves.",
};

export function VillageGame({ room }: { room: RoomView }) {
  const p = room.party?.kind === "village" ? room.party : null;
  const [seenRound, setSeenRound] = useState(0);
  const [showRole, setShowRole] = useState(false);
  if (!p) return <PartyStage room={room} ring={{}} />;

  const me = p.yourRole;
  const over = p.phase === "reveal" || p.phase === "over";
  const alive = p.alive.includes(room.you);
  const power = p.phase === "night" && alive && me !== null && me !== "villager";
  const targets = new Set(
    p.phase === "day" && alive ? p.alive.filter((id) => id !== room.you)
    : power ? p.alive.filter((id) => (me === "healer" || id !== room.you) && (me !== "wolf" || p.known[id] !== "wolf"))
    : [],
  );
  const tally = (id: string) => Object.values(p.votes).filter((t) => t === id).length;
  const seen = (id: string) => p.seen.find((x) => x.id === id);
  const myVote = p.votes[room.you];
  const roleOpen = (showRole || (seenRound !== p.round && !over)) && me !== null;

  return (
    <>
      <PartyStage
        room={room}
        sky={p.phase === "night" ? "night" : p.phase === "day" ? "day" : "dawn"}
        ring={{
          banner: p.phase === "night" ? `Night ${p.day + 1}` : p.phase === "day" ? `Day ${p.day}` : p.winner === "village" ? "Village wins" : "Wolves win",
          pickable: targets,
          picked: p.phase === "night" ? p.yourPick : p.phase === "day" ? (myVote ?? null) : null,
          onPick: (id) => act(p.phase === "night" ? { type: "pick", target: id } : { type: "vote", target: id }),
          badge: (id) => (tally(id) ? tally(id) : null),
          tone: (id) => (p.known[id] === "wolf" && (over || me === "wolf" || !p.alive.includes(id))) || seen(id)?.wolf ? "bad" : seen(id) || (over && p.winners.includes(id)) ? "good" : null,
          status: (id) =>
            p.known[id] && (over || !p.alive.includes(id) || id === room.you || me === "wolf") ? `${ROLES[p.known[id]].name}${p.alive.includes(id) ? "" : " · out"}`
            : seen(id) ? (seen(id)!.wolf ? "checked: WOLF" : "checked: safe")
            : p.phase === "day" && p.done.includes(id) ? "voted"
            : null,
        }}
      />
      {roleOpen && me && <RoleCard room={room} p={p} role={me} onClose={() => { setSeenRound(p.round); setShowRole(false); }} />}
      <Panel room={room} steps={["Night", "Day", "Result"]} at={over ? 2 : p.phase === "night" ? 0 : 1}
        timer={over ? null : room.partyRules.seconds * 1000 * (p.phase === "day" ? 3 : 1)}
        hot={(power && !p.yourPick) || (p.phase === "day" && alive && myVote === undefined)}
        title={title(room, p, power)}>
        {me && !over && (
          <div className="flex items-center justify-between gap-2">
            <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${me === "wolf" ? "bg-red-500/25 text-red-100" : "bg-sky-400/15 text-sky-100"}`}>
              <RoleIcon role={me} className="size-5" /> You are the {ROLES[me].name}{alive ? "" : " (out)"}
            </span>
            <Btn variant="ghost" kbd="r" className="px-3 text-xs" onClick={() => setShowRole(true)}>My role</Btn>
          </div>
        )}
        {p.news.length > 0 && !over && (
          <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${/taken|voted out/.test(p.news.at(-1)!) ? "bg-red-500/15 ring-1 ring-red-400/30" : "bg-emerald-500/15 ring-1 ring-emerald-300/30"}`}>{p.news.at(-1)}</p>
        )}
        {p.phase === "night" && <p className="text-sm text-white/75">{nightText(room, p, power)}</p>}
        {targets.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {[...targets].map((id, i) => (
              <Btn key={id} variant={(p.phase === "night" ? p.yourPick : myVote) === id ? "primary" : "ghost"} kbd={i < 9 ? String(i + 1) : undefined} className="px-3 text-xs"
                onClick={() => act(p.phase === "night" ? { type: "pick", target: id } : { type: "vote", target: id })}>
                {nameOf(room, id)}
              </Btn>
            ))}
          </div>
        )}
        {p.phase === "day" && (
          <>
            <p className="text-sm text-white/75">{alive ? "Talk it over in chat, then tap a suspect to vote. Votes show live on the table." : "You're a ghost now. Watch quietly: no hints in chat, please."}</p>
            {alive && (
              <div className="flex flex-wrap items-center gap-2">
                <Btn variant={myVote === null ? "primary" : "ghost"} kbd="0" aria-pressed={myVote === null} onClick={() => act({ type: "vote", target: null })}>Skip the vote</Btn>
                <span className="text-xs text-white/60">{myVote ? `You voted for ${nameOf(room, myVote)}. Tap someone else to change.` : myVote === null ? "You chose to skip." : ""}</span>
              </div>
            )}
            <p className="text-xs text-white/55">{p.done.length} of {p.alive.length} have voted.</p>
          </>
        )}
        {me === "seer" && p.seen.length > 0 && !over && (
          <p className="text-xs text-sky-100">Your visions: {p.seen.map((x) => `${nameOf(room, x.id)} is ${x.wolf ? "a WOLF" : "not a wolf"}`).join(" · ")}</p>
        )}
        {over && (
          <RoundEnd room={room} headline={headline(room, p)}>
            <ul className="grid grid-cols-2 gap-1.5 text-sm sm:grid-cols-3">
              {room.players.map((x) => {
                const r = p.known[x.id];
                return (
                  <li key={x.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${r === "wolf" ? "bg-red-500/20" : "bg-white/5"}`}>
                    {r && <RoleIcon role={r} className="size-5 shrink-0" />}
                    <span className="min-w-0 truncate">{x.id === room.you ? "You" : x.name}<span className="block text-xs text-white/55">{r ? ROLES[r].name : ""}</span></span>
                  </li>
                );
              })}
            </ul>
          </RoundEnd>
        )}
      </Panel>
    </>
  );
}

function nightText(room: RoomView, p: VillageView, power: boolean) {
  const me = p.yourRole;
  if (!p.alive.includes(room.you)) return "You're a ghost now. Watch quietly: no hints in chat, please.";
  if (!power) return "You have no night power. Think back: who acted strangely today?";
  const pick = p.yourPick ? `You picked ${nameOf(room, p.yourPick)}. Tap someone else to change.` : "Tap a player on the hill.";
  if (me === "wolf") {
    const pack = Object.keys(p.known).filter((id) => p.known[id] === "wolf" && id !== room.you);
    return `${pick}${pack.length ? ` Your pack: ${pack.map((id) => nameOf(room, id)).join(", ")}. Agree on one target.` : ""}`;
  }
  return me === "healer" ? `${pick} You can protect yourself.` : pick;
}

function title(room: RoomView, p: VillageView, power: boolean) {
  const me = p.yourRole;
  if (p.phase === "night") {
    if (!power) return p.alive.includes(room.you) ? "Sleep tight..." : "The village sleeps";
    return me === "wolf" ? "Choose tonight's target" : me === "seer" ? "Who will you look into?" : "Who will you protect tonight?";
  }
  if (p.phase === "day") {
    if (!p.alive.includes(room.you)) return "The village decides";
    if (p.votes[room.you] !== undefined) return "Vote in. Waiting for the others...";
    return me === "wolf" ? "Act innocent. Who will you blame?" : "Who is the wolf?";
  }
  return p.phase === "over" ? "The story ends" : `Round ${p.round} result`;
}

function headline(room: RoomView, p: VillageView) {
  const wolf = p.known[room.you] === "wolf";
  if (p.winners.includes(room.you)) return wolf ? "The pack wins! Perfect deception." : "The village is safe! Great detective work.";
  return wolf ? "The village found you out!" : "The wolves won this time. Rematch?";
}

/** Shown at the start of each round (and from "My role"): who you are and what to do. */
function RoleCard({ room, p, role, onClose }: { room: RoomView; p: VillageView; role: Role; onClose: () => void }) {
  const pack = Object.keys(p.known).filter((id) => p.known[id] === "wolf" && id !== room.you);
  const wolf = role === "wolf";
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Your role">
      <div className={`${glass} role-card w-full max-w-sm space-y-4 p-6 text-center text-white ${wolf ? "ring-2 ring-red-400/60" : "ring-2 ring-sky-300/50"}`}>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Your secret role</p>
        <RoleIcon role={role} className={`mx-auto size-24 ${wolf ? "text-red-300" : "text-sky-200"}`} />
        <h2 className="text-4xl font-black">{ROLES[role].name}</h2>
        <p className={`text-sm font-bold ${wolf ? "text-red-200" : "text-sky-200"}`}>Team {ROLES[role].team === "wolves" ? "Wolves" : "Village"}</p>
        <p className="text-sm leading-relaxed text-white/80">{MISSION[role]}</p>
        {wolf && pack.length > 0 && <p className="rounded-lg bg-red-500/15 p-2 text-sm">Your pack: <b>{pack.map((id) => nameOf(room, id)).join(", ")}</b></p>}
        <p className="text-xs text-white/50">Keep it secret. Don't let anyone see your screen.</p>
        <Btn className="w-full py-3 text-base" kbd="Enter" onClick={onClose} data-autofocus>I&apos;m ready</Btn>
      </div>
    </div>
  );
}

/** Simple line icons for the roles, drawn in the current text colour. */
export function RoleIcon({ role, className = "" }: { role: Role; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {role === "wolf" && <path {...common} d="M4 3l3 6h10l3-6-1 9-2 3-2 5h-6l-2-5-2-3zM9 13h.01M15 13h.01M11 17h2" />}
      {role === "seer" && <path {...common} d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z" />}
      {role === "healer" && <path {...common} d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM12 9v6M9 12h6" />}
      {role === "villager" && <path {...common} d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5" />}
    </svg>
  );
}
