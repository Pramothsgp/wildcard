"use client";
// HTML overlays on top of the 3D table.
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { FIELD_HINTS, RULE_INFO, type Toggle, ordinal } from "@/game/help";
import { BOT_LEVELS, type BotLevel, MODES, type ModeId, type Rules, ruleChanges } from "@/game/modes";
import type { Action, RoomView } from "@/game/protocol";
import { THEMES, type ThemeId } from "@/game/themes";
import { send } from "@/lib/socket";
import { HEX, backDataUrl, faceDataUrl } from "./card-art";
import { FieldOption, RuleOption } from "./rules";
import { AvatarPicker } from "./social";

import { isMuted, setMuted } from "./sound";

// Dark lacquer panels with a gold hairline, to match the table.
const glass = "rounded-2xl border border-amber-300/25 bg-gradient-to-b from-[#1d150e]/90 to-[#0b0806]/90 shadow-[0_10px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,220,160,0.10)] backdrop-blur-md";
const chip = "rounded border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-xs text-amber-100";

export function Btn({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "hot" }) {
  const v = {
    primary: "bg-gradient-to-b from-[#f3d27a] to-[#c9973a] text-[#1a1208] shadow-[0_2px_12px_rgba(212,175,96,0.35)] hover:brightness-110",
    ghost: "border border-amber-300/25 bg-black/40 text-amber-50 hover:border-amber-300/60 hover:bg-amber-300/10",
    danger: "bg-red-500/80 text-white hover:bg-red-500",
    hot: "bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:brightness-110 animate-pulse",
  }[variant];
  return (
    <button
      type="button"
      className={`rounded-xl px-4 py-2 text-sm font-bold transition active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${v} ${className}`}
      {...p}
    />
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} className={`${glass} w-full max-w-md space-y-4 p-6`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-black">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function TopBar({ room, status, onRules }: { room: RoomView; status: string; onRules: () => void }) {
  const [copied, setCopied] = useState(false);
  const [muted, setM] = useState(false);
  useEffect(() => {
    setM(isMuted());
  }, []);
  const g = room.game;
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
      <div className={`${glass} flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm`}>
        <span className="bg-gradient-to-b from-[#f7e3a3] to-[#c9973a] bg-clip-text font-black tracking-[0.2em] text-transparent">WILDCARD</span>
        <span className="h-4 w-px bg-amber-300/30" aria-hidden />
        <span className="font-semibold text-amber-50">{room.name}</span>
        <span className={chip}>{MODES[room.mode].name}</span>
        <span className={chip}>{THEMES[room.theme ?? "classic"].name} cards</span>
        {ruleChanges(room.mode, room.rules).map((r) => (
          <span key={r} className="rounded bg-amber-400/20 px-2 py-0.5 text-xs text-amber-200">{r}</span>
        ))}
        {g && <span className="text-amber-100/70">Round {g.round}</span>}
        {g?.side === "dark" && <span className="rounded bg-purple-600 px-2 py-0.5 text-xs font-bold">DARK SIDE</span>}
        <button
          type="button"
          className="rounded border border-amber-300/30 px-2 py-0.5 font-mono text-xs text-amber-100 hover:bg-amber-300/10"
          onClick={() => {
            void navigator.clipboard?.writeText(`${location.origin}/room/${room.code}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Link copied" : `Code ${room.code}`}
        </button>
        {status !== "open" && <span className="animate-pulse text-xs text-red-300">Reconnecting...</span>}
      </div>
      <div className="flex gap-2">
        <Btn variant="ghost" onClick={onRules}>Rules</Btn>
        <Btn variant="ghost" aria-label={muted ? "Unmute" : "Mute"} onClick={() => { setMuted(!muted); setM(!muted); }}>
          {muted ? "Sound off" : "Sound on"}
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => {
            if (room.status !== "playing" || confirmLeave()) send({ t: "leave" });
          }}
        >
          Leave
        </Btn>
      </div>
    </div>
  );
}

function confirmLeave() {
  // A plain confirm is fine here: leaving a running game hands your seat to autopilot.
  return window.confirm("Leave the game? Autopilot plays your seat. You can rejoin from the lobby.");
}

export function ActionBar({ room, act }: { room: RoomView; act: (a: Action) => void }) {
  const g = room.game!;
  const mine = g.turn === room.you;
  const me = room.players.find((p) => p.id === room.you);
  const target = g.unoTarget && g.unoTarget !== room.you ? room.players.find((p) => p.id === g.unoTarget) : null;
  const turnName = room.players.find((p) => p.id === g.turn)?.name;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = g.deadline ? Math.max(0, g.deadline - now) : null;
  const pct = left !== null ? (left / (room.rules.turnSeconds * 1000)) * 100 : 0;
  const last = room.log.findLast((l) => l.kind !== "chat");
  const done = me?.place ?? null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 p-3">
      {last && <p key={last.seq} aria-live="polite" className="rounded-full border border-amber-300/20 bg-black/60 px-3 py-1 text-xs text-amber-50/85">{last.text}</p>}
      <div className={`${glass} pointer-events-auto flex items-center gap-3 px-4 py-2`}>
        <span className="size-4 rounded-full ring-2 ring-amber-300/70 ring-offset-2 ring-offset-black/60" style={{ background: HEX[g.color] }} aria-label={`Colour ${g.color}`} />
        <span className="text-sm font-semibold">
          {me && <span className="mr-2 text-amber-100/60">{me.count} cards · {me.score} pts</span>}
          {done
            ? `You finished ${ordinal(done)} · every hand is face up · ${turnName}'s turn`
            : mine
            ? g.pendingDraw
              ? g.playable.length ? `Stack a glowing card or take ${g.pendingDraw}` : `Take ${g.pendingDraw}`
              : g.drawn !== null
                ? g.playable.length ? "Play the card you drew or pass" : "Pass"
                : g.playable.length ? "Your turn: play a glowing card" : "Nothing to play: draw"
            : g.playable.length ? `${turnName}'s turn · you can jump in!` : `${turnName}'s turn`}
        </span>
        {left !== null && (
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-amber-100/10" aria-label={`${Math.ceil(left / 1000)} seconds left`}>
            <div className={`h-full ${pct < 30 ? "bg-red-400" : "bg-gradient-to-r from-[#f3d27a] to-[#c9973a]"}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
        {mine && g.pendingDraw > 0 && <Btn variant="danger" onClick={() => act({ type: "draw" })}>Take {g.pendingDraw}</Btn>}
        {g.canChallenge && <Btn variant="ghost" onClick={() => act({ type: "challenge" })}>Challenge the +4</Btn>}
        {mine && !g.pendingDraw && g.drawn === null && <Btn variant="ghost" onClick={() => act({ type: "draw" })}>Draw</Btn>}
        {mine && g.drawn !== null && <Btn variant="ghost" onClick={() => act({ type: "pass" })}>Pass</Btn>}
        {me && !me.out && g.hand.length <= 2 && !me.calledUno && (
          <Btn variant="hot" onClick={() => act({ type: "uno" })}>WILDCARD!</Btn>
        )}
        {target && <Btn variant="danger" onClick={() => act({ type: "catch", target: target.id })}>Catch {target.name}!</Btn>}
      </div>
    </div>
  );
}

export function SidePanel({ room }: { room: RoomView }) {
  const [tab, setTab] = useState<"chat" | "log" | "scores">("chat");
  // Closed by default so it doesn't cover the player on the right.
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [room.chat.length, room.log.length, tab]);
  const unread = useRef(room.chat.length);
  if (tab === "chat" && open) unread.current = room.chat.length;

  if (!open) {
    return (
      <Btn variant="ghost" className="absolute right-3 top-28 z-10 sm:top-16" onClick={() => setOpen(true)}>
        Chat {room.chat.length > unread.current ? `(${room.chat.length - unread.current})` : ""}
      </Btn>
    );
  }
  return (
    <aside className={`${glass} absolute right-3 top-16 z-10 flex h-[min(60dvh,460px)] w-[min(88vw,300px)] flex-col overflow-hidden`}>
      <div className="flex border-b border-white/10 text-xs font-bold">
        {(["chat", "log", "scores"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 px-2 py-2 capitalize ${tab === t ? "bg-white/10 text-amber-300" : "text-white/60 hover:text-white"}`}>
            {t}
          </button>
        ))}
        <button type="button" aria-label="Hide panel" onClick={() => setOpen(false)} className="px-3 text-white/60 hover:text-white">×</button>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3 text-sm">
        {tab === "chat" && room.chat.map((c, i) => (
          <p key={i}><b className={c.id === room.you ? "text-amber-300" : "text-sky-300"}>{c.name}:</b> <span className="break-words text-white/90">{c.text}</span></p>
        ))}
        {tab === "chat" && !room.chat.length && <p className="text-white/40">Say hi to the table.</p>}
        {tab === "log" && room.log.map((l) => (
          <p key={l.seq} className={l.kind === "roundOver" || l.kind === "matchOver" ? "font-bold text-amber-300" : "text-white/75"}>{l.text}</p>
        ))}
        {tab === "scores" && (
          <table className="w-full">
            <tbody>
              {room.players.toSorted((a, b) => b.score - a.score).map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-1">{p.name}{p.id === room.you ? " (you)" : ""}</td>
                  <td className="py-1 text-right font-mono">{p.score}</td>
                </tr>
              ))}
              <tr><td className="pt-2 text-xs text-white/50" colSpan={2}>{room.rules.targetScore ? `First to ${room.rules.targetScore} wins` : "Single round"}</td></tr>
            </tbody>
          </table>
        )}
        <div ref={end} />
      </div>
      {tab === "chat" && (
        <form
          className="flex gap-2 border-t border-white/10 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send({ t: "chat", text });
            setText("");
          }}
        >
          <input aria-label="Chat message" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Message" className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
          <Btn type="submit" className="px-3">Send</Btn>
        </form>
      )}
    </aside>
  );
}

export function LobbyPanel({ room, onRules }: { room: RoomView; onRules: () => void }) {
  const host = room.hostId === room.you;
  const set = (s: Partial<Pick<RoomView, "name" | "mode" | "isPublic" | "maxPlayers" | "theme">> & { rules?: Partial<Rules> }) =>
    send({ t: "settings", settings: { ...s, rules: s.rules ? { ...room.rules, ...s.rules } : s.mode ? undefined : room.rules } });
  return (
    <div className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-black/40 p-4">
      <div className={`${glass} w-full max-w-2xl space-y-5 p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50">Table {room.code} · {room.isPublic ? "public" : "private"}</p>
            <h1 className="text-2xl font-black">{room.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-white/60">Share the code or link so friends can join.</p>
            <Btn variant="ghost" onClick={onRules}>How to play</Btn>
          </div>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-bold text-white/70">Players {room.players.length}/{room.maxPlayers}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {room.players.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span>
                  <span className={`mr-2 inline-block size-2 rounded-full ${p.connected ? "bg-emerald-400" : "bg-white/30"}`} />
                  {p.name}{p.id === room.hostId ? " · host" : ""}{p.id === room.you ? " (you)" : ""}
                </span>
                {host && p.id !== room.you && (
                  <button type="button" className="text-xs text-white/50 hover:text-red-300" onClick={() => send({ t: "kick", id: p.id })}>remove</button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-white/70">Your avatar</h2>
          <AvatarPicker room={room} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white/70">Game mode</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(MODES) as ModeId[]).map((id) => (
              <button
                key={id}
                type="button"
                disabled={!host}
                onClick={() => set({ mode: id })}
                className={`rounded-xl p-3 text-left text-xs transition ${room.mode === id ? "bg-gradient-to-b from-[#f3d27a] to-[#c9973a] text-[#1a1208]" : "bg-white/5 hover:bg-white/10"} disabled:cursor-default`}
              >
                <b className="block text-sm">{MODES[id].name}</b>
                <span className={room.mode === id ? "text-black/70" : "text-white/50"}>{MODES[id].blurb}</span>
              </button>
            ))}
          </div>
          <h2 className="pt-1 text-sm font-bold text-white/70">Card theme <span className="font-normal text-white/50">· also names the bots</span></h2>
          <ThemePicker value={room.theme ?? "classic"} disabled={!host} onChange={(theme) => set({ theme })} />
          <h2 className="pt-1 text-sm font-bold text-white/70">House rules <span className="font-normal text-white/50">· tap i for the full explanation</span></h2>
          <div className="grid items-start gap-2 sm:grid-cols-2">
            {(Object.keys(RULE_INFO) as Toggle[]).map((key) => (
              <RuleOption key={key} k={key} checked={room.rules[key]} disabled={!host} onChange={(v) => set({ rules: { [key]: v } })} />
            ))}
          </div>
          <h2 className="pt-1 text-sm font-bold text-white/70">Table settings</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <FieldOption hint={FIELD_HINTS.targetScore}>
              <NumberField label="Target score" value={room.rules.targetScore} disabled={!host} step={100} onChange={(v) => set({ rules: { targetScore: v } })} />
            </FieldOption>
            <FieldOption hint={FIELD_HINTS.turnSeconds}>
              <NumberField label="Turn seconds" value={room.rules.turnSeconds} disabled={!host} step={5} onChange={(v) => set({ rules: { turnSeconds: v } })} />
            </FieldOption>
            <FieldOption hint={FIELD_HINTS.handSize}>
              <NumberField label="Starting hand" value={room.rules.handSize} disabled={!host} step={1} onChange={(v) => set({ rules: { handSize: v } })} />
            </FieldOption>
            <FieldOption hint={FIELD_HINTS.maxPlayers}>
              <NumberField label="Max players" value={room.maxPlayers} disabled={!host} step={1} onChange={(v) => set({ maxPlayers: v })} />
            </FieldOption>
            <FieldOption hint={FIELD_HINTS.botLevel}>
              <label className="flex items-center justify-between gap-2 font-semibold">
                Bot skill
                <select
                  disabled={!host}
                  value={room.rules.botLevel ?? "normal"}
                  onChange={(e) => set({ rules: { botLevel: e.target.value as BotLevel } })}
                  className="rounded-lg bg-white/10 px-2 py-1 capitalize outline-none focus:ring-2 focus:ring-amber-300"
                >
                  {BOT_LEVELS.map((l) => <option key={l} value={l} className="bg-[#1d150e]">{l}</option>)}
                </select>
              </label>
            </FieldOption>
            <FieldOption hint={FIELD_HINTS.isPublic}>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" disabled={!host} checked={room.isPublic} onChange={(e) => set({ isPublic: e.target.checked })} className="accent-amber-400" />
                Listed publicly
              </label>
            </FieldOption>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          {host ? (
            <>
              <Btn variant="ghost" disabled={room.players.length >= room.maxPlayers} onClick={() => send({ t: "addBot" })}>Add bot</Btn>
              <Btn disabled={room.players.length < 2} onClick={() => send({ t: "start" })}>Start game</Btn>
            </>
          ) : (
            <p className="text-sm text-white/60">Waiting for the host to start...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ThemePicker({ value, disabled, onChange }: { value: ThemeId; disabled: boolean; onChange: (t: ThemeId) => void }) {
  // Card previews are drawn once; canvas work is cheap but not free.
  const previews = useMemo(() => (Object.keys(THEMES) as ThemeId[]).map((id) => ({
    id, back: backDataUrl(id), face: faceDataUrl({ color: "red", value: "7" }, id), wild: faceDataUrl({ color: "wild", value: "wild" }, id),
  })), []);
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {previews.map(({ id, back, face, wild }) => (
        <button
          key={id}
          type="button"
          disabled={disabled}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`rounded-xl p-3 text-left text-xs transition disabled:cursor-default ${value === id ? "bg-amber-300/15 ring-1 ring-amber-300/70" : "bg-white/5 hover:bg-white/10"}`}
        >
          <span className="mb-2 flex gap-1">
            {[back, face, wild].map((src, i) => (
              <img key={i} src={src} alt="" className="h-14 w-auto rounded shadow-md" />
            ))}
          </span>
          <b className="block text-sm">{THEMES[id].name}</b>
          <span className="text-white/55">{THEMES[id].blurb}</span>
        </button>
      ))}
    </div>
  );
}

function NumberField({ label, value, step, disabled, onChange }: { label: string; value: number; step: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 font-semibold">
      {label}
      <input
        type="number"
        step={step}
        disabled={disabled}
        defaultValue={value}
        key={value}
        onBlur={(e) => Number(e.target.value) !== value && onChange(Number(e.target.value))}
        className="w-20 rounded-lg bg-white/10 px-2 py-1 outline-none focus:ring-2 focus:ring-amber-300"
      />
    </label>
  );
}

export function RoundModal({ room }: { room: RoomView }) {
  const g = room.game!;
  const host = room.hostId === room.you;
  const winner = room.players.find((p) => p.id === g.roundWinner);
  const match = g.phase === "matchOver";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <Modal title={match ? `${winner?.name ?? "Someone"} wins the match!` : `${winner?.name ?? "Someone"} wins round ${g.round}`}>
      <p className="text-white/70">{winner?.id === room.you ? "Nice one. " : ""}+{g.lastRoundPoints} points from the cards left in other hands.</p>
      {room.players.some((p) => p.place) && (
        <p className="text-sm text-amber-100/80">
          Finish order: {room.players.filter((p) => p.place).toSorted((a, b) => a.place! - b.place!).map((p) => `${ordinal(p.place!)} ${p.name}`).join(" · ")}
        </p>
      )}
      <ol className="space-y-1">
        {room.players.toSorted((a, b) => b.score - a.score).map((p, i) => (
          <li key={p.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5">
            <span>{i + 1}. {p.name}</span>
            <span className="font-mono">{p.score}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap justify-end gap-2">
        {match ? (
          <>
            <Link href={`/history/${room.code}`} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">Game log</Link>
            {host ? <Btn onClick={() => send({ t: "next" })}>Rematch</Btn> : <Btn variant="ghost" onClick={() => send({ t: "leave" })}>Back to lobby</Btn>}
          </>
        ) : (
          <>
            {g.deadline && <span className="self-center text-sm text-white/60">Next round in {Math.max(0, Math.ceil((g.deadline - now) / 1000))}s</span>}
            {host && <Btn onClick={() => send({ t: "next" })}>Deal now</Btn>}
          </>
        )}
      </div>
    </Modal>
  );
}
