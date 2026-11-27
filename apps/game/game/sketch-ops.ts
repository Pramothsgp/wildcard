// Draw it: the drawing, as a list of steps every screen replays the same way. Shared by the
// server (which checks and relays them) and the browser (which paints them). No server imports.

/** The board is always this many units; screens scale it to fit. */
export const W = 1000;
export const H = 750;

export type Tool = "pen" | "eraser";
export type Shape = "line" | "rect" | "ellipse";

export type Op =
  /** A freehand stroke. `p` is x,y pairs. */
  | { k: "stroke"; tool: Tool; c: string; s: number; p: number[] }
  /** A straight line, box or oval from one corner to the other. `p` is x1,y1,x2,y2. */
  | { k: "shape"; shape: Shape; c: string; s: number; solid: boolean; p: number[] }
  /** Paint bucket at one point. */
  | { k: "fill"; c: string; p: number[] }
  /** Wipes the board. It's a step like any other, so it can be undone. */
  | { k: "clear" };

/** What the drawer can send. Ink is the stroke in progress, shown live and never stored. */
export type DrawCmd =
  | { k: "op"; op: Op }
  | { k: "ink"; tool: Tool; c: string; s: number; p: number[] }
  | { k: "undo" }
  | { k: "redo" };

export const PALETTE = [
  "#000000", "#4b5563", "#9ca3af", "#ffffff", "#7f1d1d", "#ef4444", "#f97316", "#facc15",
  "#84cc16", "#16a34a", "#06b6d4", "#2563eb", "#7c3aed", "#db2777", "#f9a8d4", "#92400e",
];
export const SIZES = [4, 10, 20, 40];
/** Longest stroke in one step. The browser splits longer strokes into several. */
export const MAX_POINTS = 200;
/** Steps kept per drawing. */
export const MAX_OPS = 3000;

const HEX = /^#[0-9a-f]{6}$/;
const clampInt = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : null);

/** x,y pairs inside the board, or null if malformed. */
function points(v: unknown, min: number, max: number): number[] | null {
  if (!Array.isArray(v) || v.length % 2 || v.length < min * 2 || v.length > max * 2) return null;
  const out: number[] = [];
  for (let i = 0; i < v.length; i++) {
    const n = clampInt(v[i], 0, i % 2 ? H : W);
    if (n === null) return null;
    out.push(n);
  }
  return out;
}

const color = (v: unknown) => (typeof v === "string" && HEX.test(v.toLowerCase()) ? v.toLowerCase() : null);
const size = (v: unknown) => clampInt(v, 1, 80);

/** Check a step from a client. Null if it isn't a valid one. */
export function cleanOp(v: unknown): Op | null {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  if (o.k === "clear") return { k: "clear" };
  const c = color(o.c);
  if (!c) return null;
  if (o.k === "fill") {
    const p = points(o.p, 1, 1);
    return p && { k: "fill", c, p };
  }
  const s = size(o.s);
  if (s === null) return null;
  if (o.k === "stroke" && (o.tool === "pen" || o.tool === "eraser")) {
    const p = points(o.p, 1, MAX_POINTS);
    return p && { k: "stroke", tool: o.tool, c, s, p };
  }
  if (o.k === "shape" && (o.shape === "line" || o.shape === "rect" || o.shape === "ellipse")) {
    const p = points(o.p, 2, 2);
    return p && { k: "shape", shape: o.shape, c, s, solid: o.solid === true, p };
  }
  return null;
}

export function cleanCmd(v: unknown): DrawCmd | null {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  if (o.k === "undo" || o.k === "redo") return { k: o.k };
  if (o.k === "op") {
    const op = cleanOp(o.op);
    return op && { k: "op", op };
  }
  if (o.k === "ink") {
    const s = cleanOp({ ...o, k: "stroke" });
    return s && s.k === "stroke" ? { k: "ink", tool: s.tool, c: s.c, s: s.s, p: s.p } : null;
  }
  return null;
}
