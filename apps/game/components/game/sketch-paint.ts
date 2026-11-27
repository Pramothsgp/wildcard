// Draw it: painting steps onto a canvas, the same way on every screen, plus the store of the board's
// steps as they arrive from the server.
import { getStroke } from "perfect-freehand";
import { H, type Op, W } from "@/game/sketch-ops";
import type { ServerMsg } from "@/game/protocol";

const BG = "#ffffff";

const pairs = (p: number[]) => Array.from({ length: p.length / 2 }, (_, i) => [p[i * 2], p[i * 2 + 1]]);

/** A freehand stroke as a smooth filled outline (what perfect-freehand is for). */
export function strokePath(p: number[], size: number, pen: boolean) {
  const outline = getStroke(pairs(p), { size, thinning: pen ? 0.5 : 0, smoothing: 0.5, streamline: 0.4, simulatePressure: pen, last: true });
  const path = new Path2D();
  outline.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
  path.closePath();
  return path;
}

export function paint(ctx: CanvasRenderingContext2D, op: Op) {
  ctx.save();
  if (op.k === "clear") {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
  } else if (op.k === "stroke") {
    ctx.fillStyle = op.tool === "eraser" ? BG : op.c;
    ctx.fill(strokePath(op.p, op.s, op.tool === "pen"));
  } else if (op.k === "shape") {
    const [x1, y1, x2, y2] = op.p;
    ctx.strokeStyle = ctx.fillStyle = op.c;
    ctx.lineWidth = op.s;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath();
    if (op.shape === "line") {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else if (op.shape === "rect") ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    else ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
    if (op.solid && op.shape !== "line") ctx.fill();
    else ctx.stroke();
  } else floodFill(ctx, op.p[0], op.p[1], op.c);
  ctx.restore();
}

export function replay(ctx: CanvasRenderingContext2D, ops: Op[]) {
  paint(ctx, { k: "clear" });
  for (const op of ops) paint(ctx, op);
}

/** Paint bucket: fill the area of similar colour around (x, y). A small tolerance swallows anti-aliased edges. */
function floodFill(ctx: CanvasRenderingContext2D, x: number, y: number, hex: string) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const at = (Math.min(H - 1, y) * W + Math.min(W - 1, x)) * 4;
  const target = [d[at], d[at + 1], d[at + 2]];
  const fill = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  if (target.every((v, i) => Math.abs(v - fill[i]) < 4)) return;
  const near = (i: number) => Math.abs(d[i] - target[0]) + Math.abs(d[i + 1] - target[1]) + Math.abs(d[i + 2] - target[2]) < 120;
  const seen = new Uint8Array(W * H);
  const stack = [Math.min(W - 1, x), Math.min(H - 1, y)];
  // Scanline fill: run left and right along each row, then queue the rows above and below.
  while (stack.length) {
    const py = stack.pop()!;
    let px = stack.pop()!;
    while (px > 0 && !seen[py * W + px - 1] && near((py * W + px - 1) * 4)) px--;
    let up = false;
    let down = false;
    for (; px < W && !seen[py * W + px] && near((py * W + px) * 4); px++) {
      const k = py * W + px;
      seen[k] = 1;
      d.set(fill, k * 4);
      d[k * 4 + 3] = 255;
      for (const below of [false, true]) {
        const ny = below ? py + 1 : py - 1;
        if (ny < 0 || ny >= H) continue;
        const ok = !seen[ny * W + px] && near((ny * W + px) * 4);
        // Queue one start per run of fillable pixels in that row.
        if (ok && !(below ? down : up)) stack.push(px, ny);
        if (below) down = ok;
        else up = ok;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// The board as the server last sent it. Kept outside React: the board arrives right after joining,
// before the game screen has mounted.
type SketchMsg = Extract<ServerMsg, { t: "board" | "op" | "ink" }>;
export const sketch = { key: 0, ops: [] as Op[] };
const subs = new Set<(m: SketchMsg | null) => void>();

export function sketchFeed(m: SketchMsg) {
  if (m.key < sketch.key) return;
  if (m.key > sketch.key) Object.assign(sketch, { key: m.key, ops: [] });
  if (m.t === "board") sketch.ops = [...m.ops];
  else if (m.t === "op") sketch.ops.push(m.op);
  for (const s of subs) s(m);
}

/** A step this screen drew itself (the server doesn't echo those back). */
export function sketchLocal(op: Op) {
  sketch.ops.push(op);
}

/** A new word: wipe the board if the server hasn't already. */
export function sketchTurn(key: number) {
  if (key <= sketch.key) return;
  Object.assign(sketch, { key, ops: [] });
  for (const s of subs) s(null);
}

export function onSketch(fn: (m: SketchMsg | null) => void) {
  subs.add(fn);
  return () => void subs.delete(fn);
}
