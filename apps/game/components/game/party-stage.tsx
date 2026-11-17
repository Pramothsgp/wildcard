"use client";
// The scene behind the party games, in place of the 3D card table: each game has its own world.
// Imposter is a neon interrogation room with sweeping spotlights; Night Village is a hillside
// village whose sky turns from night to day with the phases. Players sit in a ring.
import { ROLES } from "@/game/party-meta";
import type { RoomView } from "@/game/protocol";
import { avatarUrl } from "./avatars";

// Fixed star positions, so the sky doesn't reshuffle on every render.
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 37.7) % 100, y: (i * 19.3) % 55, s: 1 + (i % 3), d: (i % 7) * 0.6 }));

export function PartyStage({ room }: { room: RoomView }) {
  const p = room.party;
  const kind = room.kind;
  const phase = p?.phase ?? "lobby";
  const night = kind === "village" && phase === "night";
  return (
    <div className={`party-stage absolute inset-0 overflow-hidden ${kind === "imposter" ? "stage-imposter" : `stage-village ${night || phase === "lobby" ? "is-night" : phase === "day" ? "is-day" : "is-dawn"}`} ${phase === "vote" || phase === "guess" ? "is-tense" : ""}`}>
      {kind === "imposter" ? <Interrogation /> : <Village night={night || phase === "lobby"} />}
      <Ring room={room} />
    </div>
  );
}

function Interrogation() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="spot spot-a" />
      <div className="spot spot-b" />
      <div className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 select-none text-[28vmin] font-black leading-none text-fuchsia-300/[0.06]">?</div>
      {/* The table under the lamp. */}
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
      {/* Campfire in the village square, where everyone gathers. */}
      <div className="fire absolute left-1/2 top-[66%] size-[18vmin] rounded-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}

/** Players around the middle of the scene, above the panel at the bottom. */
function Ring({ room }: { room: RoomView }) {
  const p = room.party;
  const players = room.players;
  const meIdx = Math.max(0, players.findIndex((x) => x.id === room.you));
  const n = players.length;
  const big = n > 10;
  return (
    <ul className="absolute inset-0" aria-label="Players">
      {players.map((pl, i) => {
        // You sit at the bottom of the ring; everyone else goes round from there.
        const a = Math.PI / 2 + ((i - meIdx + n) % n) * ((2 * Math.PI) / Math.max(1, n));
        const x = 50 + Math.cos(a) * 36;
        const y = 36 + Math.sin(a) * 22;
        const role = p?.kind === "village" ? p.known[pl.id] : undefined;
        const imposter = p?.kind === "imposter" && p.imposters?.includes(pl.id);
        const turn = p?.turn === pl.id;
        const won = p?.winners.includes(pl.id);
        const react = room.reactions.findLast((r) => r.id === pl.id);
        return (
          <li
            key={pl.id}
            className={`token absolute flex ${big ? "w-20" : "w-28"} -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center ${turn ? "is-turn" : ""} ${pl.out ? "is-out" : ""} ${!pl.connected ? "opacity-60" : ""}`}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {react && <span key={react.at} className="token-bubble">{react.text}</span>}
            <span className={`relative grid ${big ? "size-10" : "size-14"} place-items-center overflow-hidden rounded-full bg-white/10 text-xl font-black ring-2 ${won ? "ring-emerald-300" : imposter || role === "wolf" ? "ring-red-400" : turn ? "ring-amber-300" : "ring-white/25"}`}>
              {pl.avatar ? <img src={avatarUrl(pl.avatar)} alt="" className="size-full" /> : pl.name.slice(0, 1)}
              {pl.out && <span className="absolute inset-0 grid place-items-center bg-black/60 text-2xl text-red-300">✕</span>}
            </span>
            <span className="max-w-full truncate rounded-full bg-black/55 px-2 py-0.5 text-xs font-bold text-white">{pl.id === room.you ? "You" : pl.name}</span>
            <span className="text-[11px] text-white/70">
              {pl.score} pts
              {p?.done.includes(pl.id) ? " · voted" : ""}
              {imposter ? " · imposter" : ""}
              {role && pl.id !== room.you ? ` · ${ROLES[role].name}` : ""}
              {!pl.connected ? " · away" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
