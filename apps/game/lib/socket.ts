"use client";
// One WebSocket per tab, shared by every page. Reconnects with backoff; the server
// sends "welcome" on every connect, and pages re-join their room when they see it.
import { useEffect, useSyncExternalStore } from "react";
import type { ClientMsg, ServerMsg } from "@/game/protocol";

type Status = "connecting" | "open" | "closed";
let ws: WebSocket | null = null;
let status: Status = "closed";
let retry = 0;
const outbox: ClientMsg[] = [];
const listeners = new Set<(m: ServerMsg) => void>();
const statusListeners = new Set<() => void>();

function setStatus(s: Status) {
  status = s;
  for (const l of statusListeners) l();
}

function open() {
  if (ws) return;
  setStatus("connecting");
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.addEventListener("open", () => {
    retry = 0;
    setStatus("open");
    for (const m of outbox.splice(0)) ws!.send(JSON.stringify(m));
  });
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data) as ServerMsg;
    for (const l of listeners) l(m);
  });
  ws.addEventListener("close", () => {
    ws = null;
    setStatus("closed");
    setTimeout(open, Math.min(10_000, 400 * 2 ** retry++));
  });
}

export function send(m: ClientMsg) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  else {
    outbox.push(m);
    open();
  }
}

export function useSocket(onMessage: (m: ServerMsg) => void) {
  useEffect(() => {
    listeners.add(onMessage);
    open();
    return () => void listeners.delete(onMessage);
  }, [onMessage]);
}

export function useSocketStatus() {
  return useSyncExternalStore(
    (cb) => (statusListeners.add(cb), () => void statusListeners.delete(cb)),
    () => status,
    () => "connecting" as Status,
  );
}
