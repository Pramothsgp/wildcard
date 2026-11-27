"use client";
// The scene behind the party games, in place of the 3D card table: each game has its own world.
// Imposter is a neon interrogation room with sweeping spotlights; Night Village is a hillside
// village whose sky turns from night to day. Players sit in a ring and can be tapped to vote or pick.
import type { ReactNode } from "react";
import type { RoomView } from "@/game/protocol";
import { avatarUrl } from "./avatars";

// Fixed star positions, so the sky doesn't reshuffle on every render.
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 37.7) % 100, y: (i * 19.3) % 55, s: 1 + (i % 3), d: (i % 7) * 0.6 }));

export type Sky = "night" | "day" | "dawn";
export type RingProps = {
  /** Players that can be tapped right now. */
  pickable?: Set<string>;
  picked?: string | string[] | null;
  onPick?: (id: string) => void;
  /** Small label on a token, e.g. a vote count. */
  badge?: (id: string) => ReactNode;
  /** Lines under a token, e.g. that player's clues. */
  notes?: (id: string) => string[];
  /** Coloured ring: red for a known wolf or imposter, green for a winner. */
  tone?: (id: string) => "bad" | "good" | null;
  /** A short status under the name. */
  status?: (id: string) => string | null;
  /** Big words across the scene when the phase changes, e.g. "Night 2". */
  banner?: string | null;
};

export function PartyStage({ room, sky = "night", tense = false, ring }: { room: RoomView; sky?: Sky; tense?: boolean; ring: RingProps }) {
  const kind = room.kind;
  return (
    <div className={`party-stage absolute inset-0 overflow-hidden ${kind === "imposter" ? "stage-imposter" : `stage-village is-${sky}`} ${tense ? "is-tense" : ""}`}>
      {kind === "imposter" ? <Interrogation /> : <Village night={sky === "night"} />}
      {ring.banner && (
        <p key={ring.banner} aria-hidden className="stage-banner pointer-events-none absolute inset-x-0 top-[22%] text-center text-5xl font-black tracking-wide text-white sm:text-7xl">
          {ring.banner}
        </p>
      )}
      <Ring room={room} {...ring} />
    </div>
  );
}

function Interrogation() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="spot spot-a" />
      <div className="spot spot-b" />
      <div className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 select-none text-[28vmin] font-black leading-none text-fuchsia-300/[0.06]">?</div>
      <div className="absolute left-1/2 top-[38%] h-[30vmin] w-[62vmin] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(240,171,252,0.16),rgba(20,8,30,0.6)_60%,transparent_72%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
    </div>
  );
}

function Village({ night }: { night: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className={`absolute inset-0 transition-opacity duration-[1500ms] ${night ? "opacity-100" : "opacity-0"}`}>
        {STARS.map((s, i) => (
          <span key={i} className="star absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
        ))}
      </div>
      {/* Moon by night, sun by day: one disc that changes colour and climbs. */}
      <div className={`absolute right-[12%] size-[11vmin] rounded-full transition-all duration-[1500ms] ${night ? "top-[8%] bg-[#f4f1de] shadow-[0_0_60px_20px_rgba(244,241,222,0.25)]" : "top-[5%] bg-[#ffd166] shadow-[0_0_90px_40px_rgba(255,209,102,0.45)]"}`} />
      <svg className="absolute inset-x-0 bottom-0 h-[42%] w-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
        <path className="hill-back" d="M0 170 Q 200 90 420 160 T 820 130 T 1200 150 V400 H0Z" />
        <path className="hill-front" d="M0 250 Q 260 180 520 240 T 1000 220 T 1200 240 V400 H0Z" />
        {[120, 260, 880, 1030].map((x, i) => (
          <g key={x} className="house" transform={`translate(${x} ${i % 2 ? 196 : 206})`}>
            <rect x="0" y="16" width="56" height="40" />
            <path d="M-6 18 L28 -8 L62 18Z" />
            <rect className="window" x="20" y="28" width="14" height="12" />
          </g>
        ))}
      </svg>
      {/* Campfire in the village square. */}
      <div className="fire absolute left-1/2 top-[66%] size-[18vmin] rounded-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}

/** Players around the middle of the scene, above the panel at the bottom. You sit at the bottom. */
/**
 * Seat spots spread evenly along the oval (by distance, not by angle), so the steep left and right
 * sides don't bunch up on big tables. Spot 0 is at the front. Returns [x%, y%] pairs.
 */
function ovalSpots(n: number, rx: number, ry: number, cy: number) {
  const steps = 720;
  const aspect = 1.6; // a % of width is about this many % of height on a wide screen
  const at = (k: number) => Math.PI / 2 + (k / steps) * Math.PI * 2;
  const run = [0];
  for (let k = 1; k <= steps; k++) run.push(run[k - 1] + Math.hypot((Math.cos(at(k)) - Math.cos(at(k - 1))) * rx * aspect, (Math.sin(at(k)) - Math.sin(at(k - 1))) * ry));
  return Array.from({ length: n }, (_, i) => {
    const k = run.findIndex((d) => d >= (run[steps] * i) / n);
    return [50 + Math.cos(at(k)) * rx, cy + Math.sin(at(k)) * ry];
  });
}

function Ring({ room, pickable, picked, onPick, badge, notes, tone, status }: { room: RoomView } & RingProps) {
  const players = room.players;
  const meIdx = Math.max(0, players.findIndex((x) => x.id === room.you));
  const n = players.length;
  const big = n > 10;
  const huge = n > 18;
  const spots = big ? ovalSpots(n, huge ? 44 : 40, huge ? 21 : 17, huge ? 30 : 27) : null;
  const turn = room.party?.turn;
  return (
    <ul className="absolute inset-0" aria-label="Players">
      {players.map((pl, i) => {
        const seat = (i - meIdx + n) % n;
        const a = Math.PI / 2 + seat * ((2 * Math.PI) / Math.max(1, n));
        // A flat ring in the upper part of the scene, so the panel at the bottom never hides anyone.
        const [x, y] = spots?.[seat] ?? [50 + Math.cos(a) * 40, 27 + Math.sin(a) * 17];
        const can = pickable?.has(pl.id) ?? false;
        const t = tone?.(pl.id);
        const lines = notes?.(pl.id) ?? [];
        const mark = badge?.(pl.id);
        const react = room.reactions.findLast((r) => r.id === pl.id);
        const label = pl.id === room.you ? "You" : pl.name;
        const ring = [picked].flat().includes(pl.id) ? "ring-4 ring-amber-300" : t === "bad" ? "ring-2 ring-red-400" : t === "good" ? "ring-2 ring-emerald-300" : turn === pl.id ? "ring-2 ring-amber-300" : "ring-2 ring-white/25";
        const face = (
          <>
            {react && <span key={react.at} className="token-bubble">{react.text}</span>}
            <span className={`relative grid ${huge ? "size-9" : big ? "size-10" : "size-14"} place-items-center rounded-full bg-white/10 text-xl font-black ${ring} ${can ? "token-pickable" : ""}`}>
              <span className="grid size-full place-items-center overflow-hidden rounded-full">
                {pl.avatar ? <img src={avatarUrl(pl.avatar)} alt="" className="size-full" /> : pl.name.slice(0, 1)}
              </span>
              {pl.out && <span className="absolute inset-0 grid place-items-center rounded-full bg-black/60 text-2xl text-red-300">✕</span>}
              {mark ? <span className="absolute -right-2 -top-2 grid min-w-6 place-items-center rounded-full bg-amber-300 px-1.5 py-0.5 text-[11px] font-black text-black shadow">{mark}</span> : null}
            </span>
            <span className="max-w-full truncate rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">{label}</span>
            <span className="text-[11px] text-white/80 [text-shadow:0_1px_2px_black]">{status?.(pl.id) ?? `${pl.score} pts`}{!pl.connected ? " · away" : ""}</span>
            {lines.length > 0 && (
              <span className="flex max-w-36 flex-wrap justify-center gap-1">
                {lines.map((l, k) => <span key={k} className="rounded-md bg-sky-400/25 px-1.5 py-0.5 text-[11px] font-semibold text-sky-50 ring-1 ring-sky-300/40">{l}</span>)}
              </span>
            )}
          </>
        );
        const box = `flex ${huge ? "w-20" : big ? "w-24" : "w-32"} flex-col items-center gap-1 rounded-2xl p-1 text-center`;
        return (
          <li
            key={pl.id}
            className={`token absolute -translate-x-1/2 -translate-y-1/2 ${turn === pl.id ? "is-turn" : ""} ${pl.out ? "is-out" : ""} ${!pl.connected ? "opacity-60" : ""}`}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {can ? (
              <button type="button" aria-pressed={[picked].flat().includes(pl.id)} aria-label={`Pick ${label}`} onClick={() => onPick?.(pl.id)} className={`${box} transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300`}>
                {face}
              </button>
            ) : (
              <div className={box}>{face}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
