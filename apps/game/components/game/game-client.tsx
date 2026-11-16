"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DARK_COLORS, LIGHT_COLORS, type Color } from "@/game/cards";
import type { Action, RoomView, ServerMsg } from "@/game/protocol";
import { send, useSocket, useSocketStatus } from "@/lib/socket";
import { ActionBar, Btn, LobbyPanel, Modal, RoundModal, SidePanel, TopBar } from "./hud";
import { RulesPanel } from "./rules";
import { HEX } from "./card-art";
import { TableScene } from "./scene";
import { sound } from "./sound";

type Pick = { cardId: number; color?: Color; needColor: boolean; needTarget: boolean };

export function GameClient({ code }: { code: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [rules, setRules] = useState(false);
  const status = useSocketStatus();
  const prev = useRef<RoomView | null>(null);

  const onMessage = useCallback((m: ServerMsg) => {
    if (m.t === "welcome") send({ t: "join", code });
    if (m.t === "state" && m.room.code === code) setRoom(m.room);
    if (m.t === "error") setToast(m.message);
    if (m.t === "left") router.push("/");
  }, [code, router]);
  useSocket(onMessage);
  useEffect(() => {
    send({ t: "join", code });
  }, [code]);

  useEffect(() => {
    if (!toast || !room) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast, room]);

  // Sounds for what just changed.
  useEffect(() => {
    const p = prev.current?.game;
    const g = room?.game;
    prev.current = room;
    if (!g || !p) return;
    if (g.pile.at(-1)?.id !== p.pile.at(-1)?.id) sound("play");
    if (g.hand.length > p.hand.length) sound("draw");
    if (g.turn === room!.you && p.turn !== room!.you && g.phase === "playing") sound("turn");
    if (g.phase !== "playing" && p.phase === "playing") sound("win");
  }, [room]);

  const act = useCallback((action: Action) => send({ t: "act", action }), []);

  const onPlay = useCallback((cardId: number) => {
    const r = prev.current;
    const g = r?.game;
    const card = g?.hand.find((c) => c.id === cardId);
    if (!r || !g || !card) return;
    const others = r.players.filter((p) => p.id !== r.you && !p.out);
    const needColor = card.face.color === "wild";
    const needTarget = r.rules.sevenZero && card.face.value === "7" && others.length > 1;
    if (needColor || needTarget) setPick({ cardId, needColor, needTarget });
    else act({ type: "play", cardId });
  }, [act]);

  const onDraw = useCallback(() => {
    const g = prev.current?.game;
    if (g && g.turn === prev.current!.you && g.drawn === null) act({ type: "draw" });
  }, [act]);

  if (!room) {
    return (
      <div className="grid h-dvh place-items-center bg-[#0b1020] text-white/80">
        {toast ? (
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold">{toast}</p>
            <p className="text-sm text-white/60">The table may have finished or closed.</p>
            <div className="flex justify-center gap-2">
              <Btn onClick={() => router.push("/")}>Back to lobby</Btn>
              <Btn variant="ghost" onClick={() => router.push(`/history/${code}`)}>See its game log</Btn>
            </div>
          </div>
        ) : (
          <p className="animate-pulse">{status === "open" ? `Joining table ${code}...` : "Connecting..."}</p>
        )}
      </div>
    );
  }

  const g = room.game;
  const palette = g?.side === "dark" ? DARK_COLORS : LIGHT_COLORS;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0b1020] text-white select-none">
      <Table room={room} onPlay={onPlay} onDraw={onDraw} />
      <TopBar room={room} status={status} onRules={() => setRules(true)} />
      <SidePanel room={room} />
      {room.status === "lobby" && <LobbyPanel room={room} onRules={() => setRules(true)} />}
      {rules && <RulesPanel room={room} onClose={() => setRules(false)} />}
      {g && g.phase === "playing" && room.status === "playing" && <ActionBar room={room} act={act} />}
      {g && g.phase !== "playing" && <RoundModal room={room} />}
      {room.status === "abandoned" && (
        <Modal title="Table closed">
          <p className="text-white/70">Everyone left, so this game ended. It is saved in your history.</p>
          <Btn onClick={() => router.push("/")}>Back to lobby</Btn>
        </Modal>
      )}
      {pick && (
        <Modal title={pick.needColor && !pick.color ? "Pick a colour" : "Swap hands with"} onClose={() => setPick(null)}>
          {pick.needColor && !pick.color ? (
            <div className="grid grid-cols-2 gap-3">
              {palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  className="h-20 rounded-xl capitalize font-bold shadow-lg ring-2 ring-white/10 transition hover:scale-105 hover:ring-white"
                  style={{ background: HEX[c] }}
                  onClick={() => {
                    if (pick.needTarget) setPick({ ...pick, color: c });
                    else { act({ type: "play", cardId: pick.cardId, color: c }); setPick(null); }
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              {room.players.filter((p) => p.id !== room.you && !p.out).map((p) => (
                <Btn key={p.id} variant="ghost" onClick={() => { act({ type: "play", cardId: pick.cardId, color: pick.color, target: p.id }); setPick(null); }}>
                  {p.name} · {p.count} cards
                </Btn>
              ))}
            </div>
          )}
        </Modal>
      )}
      {toast && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rounded-full bg-red-500/90 px-4 py-2 text-sm font-semibold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function Table({ room, onPlay, onDraw }: { room: RoomView; onPlay: (id: number) => void; onDraw: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<TableScene | null>(null);
  const cbs = useRef({ onPlay, onDraw });
  cbs.current = { onPlay, onDraw };

  useEffect(() => {
    const s = new TableScene(host.current!, {
      onPlay: (id) => cbs.current.onPlay(id),
      onDraw: () => cbs.current.onDraw(),
    });
    scene.current = s;
    return () => s.dispose();
  }, []);
  useEffect(() => {
    scene.current?.update(room);
  }, [room]);

  return <div ref={host} className="absolute inset-0 touch-none" aria-label="Game table" />;
}
