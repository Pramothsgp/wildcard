// Card faces drawn on a canvas at runtime. Original artwork, no image files or third-party designs.
import * as THREE from "three";
import { type Face, SYMBOL } from "@/game/cards";
import type { ThemeId } from "@/game/themes";
import { heroBack, heroFace, legendBack, legendFace } from "./card-themes";
import { MOOVENDAR } from "./card-emblems";
import { cricketBack, cricketFace } from "./card-cricket";
import { figureBack, figureFace } from "./card-figures";
import { festivalBack, festivalFace } from "./card-festivals";
import { fleetBack, fleetFace } from "./card-fleet";
import { MYTHIC } from "./card-mythic";

export const HEX: Record<string, string> = {
  red: "#e5383b", yellow: "#f4b400", green: "#2fa84f", blue: "#1f7ae0",
  pink: "#ff2e93", teal: "#00a7a0", orange: "#ff7b1a", purple: "#7c3aed",
  wild: "#17171c",
};
export const DARK = new Set(["pink", "teal", "orange", "purple"]);
export const W = 256;
export const H = 384;

export function rounded(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function base(edge: string): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  rounded(g, 0, 0, W, H, 26);
  g.fillStyle = edge;
  g.fill();
  return [c, g];
}

export function pinwheel(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, colors: string[]) {
  colors.forEach((col, i) => {
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, r, (i * Math.PI) / 2 - Math.PI / 4, ((i + 1) * Math.PI) / 2 - Math.PI / 4);
    g.closePath();
    g.fillStyle = col;
    g.fill();
  });
}

/** Faces that sit on a dark card edge (Flipside dark side and the nastiest wilds). */
export const isDarkFace = (f: Face) => DARK.has(f.color) || ["wildColor", "wild6", "wild10", "wildReverse4"].includes(f.value);
export const WILD_COLS = (dark: boolean) => (dark ? ["#ff2e93", "#00a7a0", "#ff7b1a", "#7c3aed"] : ["#e5383b", "#1f7ae0", "#f4b400", "#2fa84f"]);

function drawFace(f: Face): HTMLCanvasElement {
  const dark = isDarkFace(f);
  const [c, g] = base(dark ? "#101014" : "#fbfaf6");
  const fill = HEX[f.color];
  // Inner panel with a soft diagonal sheen.
  rounded(g, 12, 12, W - 24, H - 24, 18);
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, shade(fill, -0.25));
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  g.globalAlpha = 0.08;
  g.fillStyle = "#fff";
  for (let x = -H; x < W; x += 34) {
    g.beginPath();
    g.moveTo(x, H);
    g.lineTo(x + H, 0);
    g.lineTo(x + H + 14, 0);
    g.lineTo(x + 14, H);
    g.fill();
  }
  g.restore();

  // Centre medallion: a ringed circle (not an oval) so the look is our own.
  const cx = W / 2;
  const cy = H / 2;
  if (f.color === "wild") {
    const cols = WILD_COLS(dark);
    g.beginPath();
    g.arc(cx, cy, 92, 0, Math.PI * 2);
    g.fillStyle = "#fff";
    g.fill();
    pinwheel(g, cx, cy, 82, cols);
  } else {
    g.beginPath();
    g.arc(cx, cy, 92, 0, Math.PI * 2);
    g.fillStyle = dark ? "#101014" : "#fff";
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = shade(fill, 0.35);
    g.stroke();
  }

  const sym = SYMBOL[f.value];
  const big = sym === "W" ? "" : sym;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${big.length > 2 ? 64 : big.length > 1 ? 84 : 112}px system-ui, -apple-system, Segoe UI, sans-serif`;
  g.lineWidth = 10;
  g.strokeStyle = "#101014";
  g.fillStyle = f.color === "wild" ? "#fff" : fill;
  if (big) {
    if (f.color === "wild") g.strokeText(big, cx, cy + 4);
    g.fillText(big, cx, cy + 4);
    if (big === "6" || big === "9") underline(g, cx, cy + 52, f.color === "wild" ? "#fff" : fill);
  }

  // Corner indices.
  g.font = "900 46px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillStyle = "#fff";
  g.lineWidth = 6;
  for (const [x, y, rot] of [[38, 44, 0], [W - 38, H - 44, Math.PI]] as const) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    const label = sym === "W" ? "★" : sym;
    g.font = `900 ${label.length > 2 ? 30 : 46}px system-ui, -apple-system, Segoe UI, sans-serif`;
    g.strokeText(label, 0, 0);
    g.fillText(label, 0, 0);
    g.restore();
  }
  return c;
}

export function underline(g: CanvasRenderingContext2D, x: number, y: number, col: string) {
  g.fillStyle = col;
  g.fillRect(x - 26, y, 52, 8);
}

function drawBack(): HTMLCanvasElement {
  const [c, g] = base("#f2e8cf");
  rounded(g, 12, 12, W - 24, H - 24, 18);
  g.fillStyle = "#14213d";
  g.fill();
  g.save();
  g.clip();
  // Gold lattice.
  g.strokeStyle = "rgba(252,163,17,0.35)";
  g.lineWidth = 3;
  for (let i = -H; i < W + H; i += 28) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke();
    g.beginPath(); g.moveTo(i, H); g.lineTo(i + H, 0); g.stroke();
  }
  g.restore();
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-Math.PI / 4);
  g.fillStyle = "#fca311";
  g.fillRect(-70, -70, 140, 140);
  g.fillStyle = "#14213d";
  g.fillRect(-58, -58, 116, 116);
  g.restore();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#fca311";
  g.font = "900 34px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillText("WILD", W / 2, H / 2 - 18);
  g.fillText("CARD", W / 2, H / 2 + 20);
  return c;
}

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(Math.min(255, Math.max(0, amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

const cache = new Map<string, THREE.Texture>();
let maxAniso = 4;
export const setAnisotropy = (n: number) => (maxAniso = n);

/** Canvases that get repainted later (e.g. once a photo loads); their texture refreshes then. */
export const repaintLater = new WeakMap<HTMLCanvasElement, Promise<unknown>>();

function tex(key: string, draw: () => HTMLCanvasElement) {
  let t = cache.get(key);
  if (!t) {
    const canvas = draw();
    t = new THREE.CanvasTexture(canvas);
    const texture = t;
    repaintLater.get(canvas)?.then(() => { texture.needsUpdate = true; });
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    cache.set(key, t);
  }
  return t;
}

const FACES: Record<ThemeId, (f: Face) => HTMLCanvasElement> = {
  classic: drawFace, heroes: heroFace, action: (f) => figureFace(f), mythic: (f) => figureFace(f, MYTHIC), fleet: fleetFace,
  pongal: (f) => festivalFace(f, "pongal"), diwali: (f) => festivalFace(f, "diwali"), christmas: (f) => festivalFace(f, "christmas"),
  legends: (f) => legendFace(f),
  moovendar: (f) => legendFace(f, MOOVENDAR), cricket: cricketFace,
};
const BACKS: Record<ThemeId, () => HTMLCanvasElement> = {
  classic: drawBack, heroes: heroBack, action: () => figureBack(), mythic: () => figureBack(MYTHIC), fleet: fleetBack,
  pongal: () => festivalBack("pongal"), diwali: () => festivalBack("diwali"), christmas: () => festivalBack("christmas"),
  legends: () => legendBack(),
  moovendar: () => legendBack(MOOVENDAR), cricket: cricketBack,
};

export const faceTexture = (f: Face, theme: ThemeId = "classic") => tex(`${theme}|${f.color}:${f.value}`, () => FACES[theme](f));
export const backTexture = (theme: ThemeId = "classic") => tex(`${theme}|back`, BACKS[theme]);

/** Small PNG of a face for the HTML overlay (colour picker, log). */
export const faceDataUrl = (f: Face, theme: ThemeId = "classic") => FACES[theme](f).toDataURL();
export const backDataUrl = (theme: ThemeId = "classic") => BACKS[theme]().toDataURL();
