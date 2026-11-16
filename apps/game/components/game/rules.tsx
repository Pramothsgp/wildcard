"use client";
// Rule explanations: lobby option rows with hints, and the full Rules panel.
import { type ReactNode, useMemo, useState } from "react";
import { LABEL } from "@/game/cards";
import { CARD_HELP, RULE_INFO, type Toggle, activeToggles, deckSpecials } from "@/game/help";
import { MODES } from "@/game/modes";
import type { RoomView } from "@/game/protocol";
import { faceDataUrl } from "./card-art";

/** The "i" button: shows the long explanation inline (works on touch, unlike a tooltip). */
function Info({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={`What does "${label}" mean?`}
      onClick={onToggle}
      className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-black italic transition ${open ? "bg-amber-400 text-black" : "bg-white/15 text-white hover:bg-white/30"}`}
    >
      i
    </button>
  );
}

export function RuleOption({ k, checked, disabled, onChange }: { k: Toggle; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const info = RULE_INFO[k];
  return (
    <div className={`rounded-xl p-3 transition ${checked ? "bg-amber-400/10 ring-1 ring-amber-400/40" : "bg-white/5"}`}>
      <div className="flex items-start gap-2">
        <label className="flex flex-1 cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" disabled={disabled} checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-amber-400" />
          <span>
            <b className="block">{info.label}</b>
            <span className="text-xs text-white/60">{info.hint}</span>
          </span>
        </label>
        <Info open={open} onToggle={() => setOpen(!open)} label={info.label} />
      </div>
      {open && <p className="mt-2 border-t border-white/10 pt-2 text-xs leading-relaxed text-white/80">{info.detail}</p>}
    </div>
  );
}

export function FieldOption({ hint, children }: { hint: string; children: ReactNode }) {
  return (
    <div className="space-y-1 rounded-xl bg-white/5 p-3 text-sm">
      {children}
      <p className="text-xs text-white/55">{hint}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-white/85">{children}</div>
    </section>
  );
}

export function RulesPanel({ room, onClose }: { room: RoomView; onClose: () => void }) {
  const on = activeToggles(room.rules);
  const off = (Object.keys(RULE_INFO) as Toggle[]).filter((k) => !on.includes(k));
  const groups = useMemo(
    () => deckSpecials(room.rules.deck).map((g) => ({ ...g, cards: g.faces.map((f) => ({ f, src: faceDataUrl(f, room.theme) })) })),
    [room.rules.deck, room.theme],
  );
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/60 p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Rules"
        className="max-h-[90dvh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-[#11172b] p-5 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">How to play</h2>
            <p className="text-sm text-white/60">This table: <b className="text-white">{MODES[room.mode].name}</b>. {MODES[room.mode].blurb}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close rules" className="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold hover:bg-white/20">Close</button>
        </div>

        <Section title="Goal">
          <p>Be the first to get rid of all your cards. Win the round and you score points for the cards left in everyone else&apos;s hands. {room.rules.targetScore ? `First to ${room.rules.targetScore} points wins the match.` : "This table plays a single round."}</p>
        </Section>

        <Section title="Your turn">
          <p>Play one card that matches the top of the pile by <b>colour</b> or by <b>number/symbol</b>, or play a <b>wild</b> card and pick the next colour. The ring around the middle of the table shows the colour in play.</p>
          <p>Cards you can play right now <b className="text-amber-300">glow gold and stand up</b>. Dark cards can&apos;t be played.</p>
          <p>Can&apos;t or don&apos;t want to play? Press <b>Draw</b> or tap the deck. {room.rules.drawToMatch ? "At this table you keep drawing until you get a playable card." : "You draw one card."} If it can be played you may play it, otherwise press Pass.</p>
          <p>You have {room.rules.turnSeconds} seconds. If time runs out, the game draws for you.</p>
        </Section>

        <Section title="One card left">
          <p>When you play your second-to-last card, press the <b>WILDCARD!</b> button. If you forget, another player can press <b>Catch</b> and you draw 2. You&apos;re safe once the next player acts.</p>
        </Section>

        <Section title="Special cards">
          {groups.map((g) => (
            <div key={g.title} className="space-y-2">
              {groups.length > 1 && <p className="text-xs font-bold uppercase text-white/50">{g.title}</p>}
              <ul className="grid gap-2 sm:grid-cols-2">
                {g.cards.map(({ f, src }) => (
                  <li key={`${f.color}${f.value}`} className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
                    <img src={src} alt="" className="h-16 w-auto rounded" />
                    <span className="text-xs"><b className="block text-sm">{LABEL[f.value]}</b>{CARD_HELP[f.value]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {room.rules.deck === "flip" && (
            <p>Every card has a light side and a dark side. You see the hidden side of your opponents&apos; cards, so watch what they&apos;re holding for after the flip.</p>
          )}
        </Section>

        <Section title="House rules at this table">
          {on.length ? on.map((k) => (
            <p key={k}><b className="text-amber-300">{RULE_INFO[k].label}:</b> {RULE_INFO[k].detail}</p>
          )) : <p>None. Plain rules.</p>}
          {off.length > 0 && <p className="text-xs text-white/50">Off here: {off.map((k) => RULE_INFO[k].label).join(", ")}.</p>}
        </Section>

        <Section title="Scoring">
          <p>The round winner scores: number cards at face value, coloured action cards 20 (Draw 1: 10, Skip everyone: 30), wilds 50 (Colour Roulette: 60).</p>
          <p>Global points on the leaderboard add up every round you win, plus 100 for each match you win.</p>
        </Section>
      </div>
    </div>
  );
}
