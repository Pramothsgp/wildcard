"use client";
// Draw it, team relay: the lobby options, and the host's team picker when teams are picked by hand.
import { type PartyOpts, TEAMS } from "@/game/party-meta";
import type { RoomView } from "@/game/protocol";
import { OptionSelect, range } from "./party";

const YES_NO: [string, string][] = [["yes", "Yes"], ["no", "No"]];

export function RelayOptions({ room, host, onChange }: { room: RoomView; host: boolean; onChange: (o: Partial<PartyOpts>) => void }) {
  const o = room.partyRules;
  const hidden = o.showWord === false;
  return (
    <>
      <OptionSelect label="Teams" hint="2 players per team at least." value={o.teams ?? 2} options={range(2, 4)} disabled={!host}
        onPick={(v) => onChange({ teams: Number(v) })} />
      <OptionSelect label="Picking teams" hint="Random, or the host puts each player on a team." value={o.teamPick ?? "random"}
        options={[["random", "Random"], ["manual", "Host picks"]]} disabled={!host} onPick={(v) => onChange({ teamPick: v as PartyOpts["teamPick"] })} />
      <OptionSelect label="Guessers per turn" hint="Fewer if a team is too small." value={o.guessers ?? 1} options={range(1, 5)} disabled={!host}
        onPick={(v) => onChange({ guessers: Number(v) })} />
      <OptionSelect label="Drawers per turn" hint="Anyone left over sits the turn out. Roles rotate every turn." value={o.drawers ?? 0}
        options={[[0, "Everyone else"], ...range(1, 10)]} disabled={!host} onPick={(v) => onChange({ drawers: Number(v) })} />
      <OptionSelect label="Turns per drawer" hint="How many times the pen goes round per word." value={o.laps} options={range(1, 3)} disabled={!host}
        onPick={(v) => onChange({ laps: Number(v) })} />
      <OptionSelect label="Other teams see the word" hint="Their guessers never do." value={hidden ? "no" : "yes"} options={YES_NO} disabled={!host}
        onPick={(v) => onChange(v === "yes" ? { showWord: true, steal: false } : { showWord: false })} />
      <OptionSelect label="Steal a missed word" value={o.steal && hidden ? "yes" : "no"} options={YES_NO} disabled={!host || !hidden}
        hint={hidden ? "When a team's time runs out without the word, the other teams can guess it." : "Only when other teams can't see the word."}
        onPick={(v) => onChange({ steal: v === "yes" })} />
      <OptionSelect label="Seconds to steal" hint="How long the other teams get." value={o.stealSeconds ?? 20} options={range(5, 60, 5)}
        disabled={!host || !hidden || !o.steal} onPick={(v) => onChange({ stealSeconds: Number(v) })} />
      {o.teamPick === "manual" && <TeamPicker room={room} host={host} onChange={onChange} />}
    </>
  );
}

/** Each player with a team dropdown. Players left on Auto join the smallest team when the game starts. */
function TeamPicker({ room, host, onChange }: { room: RoomView; host: boolean; onChange: (o: Partial<PartyOpts>) => void }) {
  const picks = room.partyRules.teamOf ?? {};
  const count = Math.max(2, Math.min(4, room.partyRules.teams ?? 2));
  const teamOf = (id: string) => (picks[id] !== undefined && picks[id] < count ? picks[id] : null);
  // Only this player's pick goes to the server, which merges it in (-1 = back to auto).
  const set = (id: string, v: string) => onChange({ teamOf: { [id]: v === "auto" ? -1 : Number(v) } });
  return (
    <section className="space-y-2 rounded-xl bg-white/5 p-3 sm:col-span-2" aria-label="Teams">
      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {TEAMS.slice(0, count).map((t, i) => (
          <span key={t.name} className="rounded-full px-2 py-0.5" style={{ background: `${t.color}33`, color: t.color }}>
            Team {t.name}: {room.players.filter((p) => teamOf(p.id) === i).length}
          </span>
        ))}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/60">Auto: {room.players.filter((p) => teamOf(p.id) === null).length}</span>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {room.players.map((p) => {
          const t = teamOf(p.id);
          return (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-1 text-sm">
              <span className="truncate">{p.id === room.you ? "You" : p.name}</span>
              <select aria-label={`Team for ${p.name}`} disabled={!host} value={t ?? "auto"} onChange={(e) => set(p.id, e.target.value)}
                className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-300" style={t === null ? undefined : { color: TEAMS[t].color }}>
                <option value="auto" className="bg-[#1d150e] text-white">Auto</option>
                {TEAMS.slice(0, count).map((team, i) => <option key={team.name} value={i} className="bg-[#1d150e] text-white">{team.name}</option>)}
              </select>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-white/50">Each team needs at least 2 players. Anyone on Auto joins the smallest team when the game starts.</p>
    </section>
  );
}
