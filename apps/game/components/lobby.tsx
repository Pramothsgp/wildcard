"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { MODES, type ModeId } from "@/game/modes";
import type { RoomSummary, ServerMsg } from "@/game/protocol";
import { send, useSocket, useSocketStatus } from "@/lib/socket";
import { Btn } from "./game/hud";

const panel = "rounded-2xl border border-white/10 bg-white/[0.04] p-5";

export function Lobby({ userName }: { userName: string }) {
  const router = useRouter();
  const status = useSocketStatus();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [mode, setMode] = useState<ModeId>("classic");
  const [isPublic, setIsPublic] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bots = useRef(0);

  const onMessage = useCallback((m: ServerMsg) => {
    if (m.t === "welcome") send({ t: "lobby" });
    if (m.t === "rooms") setRooms(m.rooms);
    if (m.t === "error") setError(m.message);
    if (m.t === "joined") {
      for (; bots.current > 0; bots.current--) send({ t: "addBot" });
      router.push(`/room/${m.code}`);
    }
  }, [router]);
  useSocket(onMessage);

  const create = (practice: boolean) => {
    setError(null);
    bots.current = practice ? 3 : 0;
    send({ t: "create", settings: { mode, isPublic: practice ? false : isPublic, name: practice ? `${userName} vs bots` : undefined } });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <section className={`${panel} space-y-4`}>
        <h2 className="text-lg font-black">Start a table</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(MODES) as ModeId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={`rounded-xl p-3 text-left text-xs transition ${mode === id ? "bg-amber-400 text-black" : "bg-white/5 text-white hover:bg-white/10"}`}
            >
              <b className="block text-sm">{MODES[id].name}</b>
              <span className={mode === id ? "text-black/70" : "text-white/50"}>{MODES[id].blurb}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-amber-400" />
          List it publicly (otherwise invite by code)
        </label>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => create(false)} disabled={status !== "open"}>Create table</Btn>
          <Btn variant="ghost" onClick={() => create(true)} disabled={status !== "open"}>Practice vs 3 bots</Btn>
        </div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      </section>

      <section className={`${panel} space-y-4`}>
        <h2 className="text-lg font-black">Join with a code</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const c = code.trim().toUpperCase();
            if (/^[A-Z0-9]{5}$/.test(c)) router.push(`/room/${c}`);
            else setError("Codes are 5 letters or numbers");
          }}
        >
          <input
            aria-label="Table code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={5}
            placeholder="ABCDE"
            className="w-36 rounded-xl bg-white/10 px-3 py-2 font-mono uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-amber-300"
          />
          <Btn type="submit">Join</Btn>
        </form>

        <div>
          <h3 className="mb-2 text-sm font-bold text-white/70">Open tables</h3>
          {rooms === null ? (
            <p className="text-sm text-white/40">Loading...</p>
          ) : rooms.length === 0 ? (
            <p className="text-sm text-white/40">No public tables right now. Start one.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {rooms.map((r) => (
                <li key={r.code} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{r.name}</p>
                    <p className="text-xs text-white/50">{MODES[r.mode].name} · {r.players}/{r.maxPlayers} · {r.status === "playing" ? "in progress" : `host ${r.host}`}</p>
                  </div>
                  <Btn
                    variant="ghost"
                    disabled={r.status === "playing" || r.players >= r.maxPlayers}
                    onClick={() => router.push(`/room/${r.code}`)}
                  >
                    {r.status === "playing" ? "Playing" : "Join"}
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
