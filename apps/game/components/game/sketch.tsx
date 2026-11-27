"use client";
// Draw it: the board everyone watches, and the tools for whoever is drawing.
// Two canvases: the drawing itself, and a layer on top for strokes still in progress.
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { type DrawCmd, H, MAX_POINTS, type Op, PALETTE, SIZES, type Shape, W } from "@/game/sketch-ops";
import { send } from "@/lib/socket";
import { Btn } from "./hud";
import { onSketch, paint, replay, sketch, sketchLocal, sketchTurn, strokePath } from "./sketch-paint";

type ToolId = "pen" | "eraser" | "fill" | Shape;
const TOOLS: { id: ToolId; label: string; key: string }[] = [
  { id: "pen", label: "Pen", key: "b" },
  { id: "eraser", label: "Eraser", key: "e" },
  { id: "fill", label: "Fill", key: "f" },
  { id: "line", label: "Line", key: "l" },
  { id: "rect", label: "Box", key: "r" },
  { id: "ellipse", label: "Oval", key: "o" },
];
/** How often the stroke in progress is shared, in ms. */
const INK_MS = 80;

const draw = (cmd: DrawCmd) => send({ t: "draw", cmd });

/** Where the pointer is, in board units. */
function point(e: ReactPointerEvent<HTMLCanvasElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)].map((v, i) => Math.max(0, Math.min(i ? H : W, v)));
}

export function Sketch({ turnKey, canDraw }: { turnKey: number; canDraw: boolean }) {
  const base = useRef<HTMLCanvasElement>(null);
  const top = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolId>("pen");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(SIZES[1]);
  const [solid, setSolid] = useState(false);
  // The stroke or shape being drawn here: board points, and when it was last shared.
  const live = useRef<{ p: number[]; sent: number } | null>(null);

  const ctx = (c: typeof base) => c.current?.getContext("2d", { willReadFrequently: c === base }) ?? null;
  const redraw = useCallback(() => { const b = ctx(base); if (b) replay(b, sketch.ops); }, []);
  const clearTop = () => ctx(top)?.clearRect(0, 0, W, H);

  // Follow the server: a whole board, one more step, or someone else's stroke in progress.
  useEffect(() => onSketch((m) => {
    if (!m || m.t === "board") return redraw();
    if (m.t === "op") {
      clearTop();
      const b = ctx(base);
      if (b) paint(b, m.op);
    } else {
      const t = ctx(top);
      if (!t) return;
      t.clearRect(0, 0, W, H);
      t.fillStyle = m.ink.tool === "eraser" ? "#ffffff" : m.ink.c;
      t.fill(strokePath(m.ink.p, m.ink.s, m.ink.tool === "pen"));
    }
  }), [redraw]);
  // A new word wipes the board; otherwise show what we already have.
  useEffect(() => {
    sketchTurn(turnKey);
    redraw();
  }, [turnKey, redraw]);

  const commit = (op: Op) => {
    sketchLocal(op);
    const b = ctx(base);
    if (b) paint(b, op);
    draw({ k: "op", op });
  };

  const preview = (p: number[]) => {
    const t = ctx(top);
    if (!t) return;
    t.clearRect(0, 0, W, H);
    if (tool === "pen" || tool === "eraser") {
      t.fillStyle = tool === "eraser" ? "#ffffff" : color;
      t.fill(strokePath(p, size, tool === "pen"));
    } else if (tool !== "fill") paint(t, { k: "shape", shape: tool, c: color, s: size, solid, p: [p[0], p[1], p.at(-2)!, p.at(-1)!] });
  };

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || e.button > 0) return;
    const [x, y] = point(e);
    if (tool === "fill") return commit({ k: "fill", c: color, p: [x, y] });
    e.currentTarget.setPointerCapture(e.pointerId);
    live.current = { p: [x, y], sent: 0 };
    preview(live.current.p);
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const l = live.current;
    if (!l) return;
    const [x, y] = point(e);
    if (tool === "pen" || tool === "eraser") {
      if (Math.hypot(x - l.p.at(-2)!, y - l.p.at(-1)!) < 2) return;
      l.p.push(x, y);
      // Long strokes go out in pieces, each starting where the last one ended.
      if (l.p.length >= MAX_POINTS * 2) {
        commit({ k: "stroke", tool, c: color, s: size, p: l.p });
        l.p = l.p.slice(-2);
      }
      if (Date.now() - l.sent > INK_MS) {
        l.sent = Date.now();
        draw({ k: "ink", tool, c: color, s: size, p: l.p });
      }
    } else l.p = [l.p[0], l.p[1], x, y];
    preview(l.p);
  };

  const up = () => {
    const l = live.current;
    live.current = null;
    if (!l) return;
    clearTop();
    if (tool === "pen" || tool === "eraser") commit({ k: "stroke", tool, c: color, s: size, p: l.p });
    else if (tool !== "fill" && l.p.length === 4) commit({ k: "shape", shape: tool, c: color, s: size, solid, p: l.p });
  };

  // Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. Single-key tool shortcuts are on the buttons.
  useEffect(() => {
    if (!canDraw) return;
    const on = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement | null)?.closest("input, textarea")) return;
      const k = e.key.toLowerCase();
      if (k === "z" || k === "y") {
        e.preventDefault();
        draw({ k: k === "y" || e.shiftKey ? "redo" : "undo" });
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [canDraw]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
      <div className="relative w-full max-w-[min(100%,calc((100dvh-15rem)*4/3))] shrink-0 overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-4 ring-white/10" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={base} width={W} height={H} className="absolute inset-0 size-full" aria-label="The drawing" role="img" />
        <canvas ref={top} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          className={`absolute inset-0 size-full touch-none ${canDraw ? (tool === "fill" ? "cursor-cell" : "cursor-crosshair") : ""}`} />
      </div>
      {canDraw && (
        <div className="flex w-full max-w-[min(100%,calc((100dvh-15rem)*4/3))] flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-black/40 p-2 ring-1 ring-white/10">
          {TOOLS.map((t) => (
            <Btn key={t.id} kbd={t.key} variant={tool === t.id ? "primary" : "ghost"} aria-pressed={tool === t.id} className="px-2.5 py-1.5 text-xs" onClick={() => setTool(t.id)}>{t.label}</Btn>
          ))}
          <Btn kbd="s" variant={solid ? "primary" : "ghost"} aria-pressed={solid} className="px-2.5 py-1.5 text-xs" title="Box and oval drawn filled" onClick={() => setSolid(!solid)}>Filled</Btn>
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden />
          {SIZES.map((s, i) => (
            <Btn key={s} kbd={String(i + 1)} variant={size === s ? "primary" : "ghost"} aria-pressed={size === s} aria-label={`Brush size ${s}`} className="px-2 py-1.5" onClick={() => setSize(s)}>
              <span className="block rounded-full bg-current" style={{ width: 4 + i * 4, height: 4 + i * 4 }} />
            </Btn>
          ))}
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden />
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Colour">
            {PALETTE.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)}
                className={`size-6 rounded-full ring-2 transition ${color === c ? "scale-110 ring-amber-300" : "ring-white/20 hover:ring-white/60"}`} style={{ background: c }} />
            ))}
            <label className="relative size-6 cursor-pointer overflow-hidden rounded-full ring-2 ring-white/20 hover:ring-white/60" title="Any colour" style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Pick any colour" className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden />
          <Btn variant="ghost" className="px-2.5 py-1.5 text-xs" title="Ctrl+Z" onClick={() => draw({ k: "undo" })}>Undo</Btn>
          <Btn variant="ghost" className="px-2.5 py-1.5 text-xs" title="Ctrl+Shift+Z" onClick={() => draw({ k: "redo" })}>Redo</Btn>
          <Btn variant="danger" kbd="c" className="px-2.5 py-1.5 text-xs" onClick={() => commit({ k: "clear" })}>Clear</Btn>
        </div>
      )}
    </div>
  );
}
