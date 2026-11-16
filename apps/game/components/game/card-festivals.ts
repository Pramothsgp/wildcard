// Festival packs: Pongal (overflowing pot and sugarcane), Diwali (diya and rangoli) and
// Christmas (tree and snowflakes). Original drawings; the card colour shows in each design.
import { type Face, SYMBOL, type Value } from "@/game/cards";
import { THEMES } from "@/game/themes";
import { H, HEX, W, WILD_COLS, base, isDarkFace, pinwheel, rounded, shade } from "./card-art";
import { INK, namePlate, outlined } from "./card-figures";

export type Festival = "pongal" | "diwali" | "christmas";
type Ctx = CanvasRenderingContext2D;
const VALUES = Object.keys(SYMBOL) as Value[];

function dots(g: Ctx, color: string, alpha: number, step = 22) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) { g.beginPath(); g.arc(x, y, 1.8, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/** Clay pot with a decorated band, rice boiling over, sugarcane on both sides. */
function pongalPot(g: Ctx, accent: string) {
  for (const s of [-1, 1]) {
    g.save();
    g.rotate(s * 0.18);
    for (let y = -110; y < 70; y += 26) { rounded(g, s * 62 - 6, y, 12, 24, 3); outlined(g, "#6b8f2a", 2); }
    g.beginPath(); g.moveTo(s * 62, -110); g.quadraticCurveTo(s * 90, -140, s * 100, -120); outlined(g, "#8fbf3a", 2);
    g.restore();
  }
  g.beginPath(); g.ellipse(0, 10, 54, 58, 0, 0, Math.PI * 2); outlined(g, "#a0522d");
  g.beginPath(); g.ellipse(0, -46, 30, 9, 0, 0, Math.PI * 2); outlined(g, "#8a4524");
  g.fillStyle = accent; g.fillRect(-52, 0, 104, 12);
  g.fillStyle = "#f4ecd8";
  for (let x = -40; x <= 40; x += 16) { g.beginPath(); g.arc(x, 6, 3, 0, Math.PI * 2); g.fill(); }
  // Foam bubbling up over the rim: overlapping round puffs, outlined once as a cloud.
  const puffs: [number, number, number][] = [[-26, -52, 13], [-8, -62, 16], [12, -60, 15], [28, -50, 12], [-36, -40, 9], [38, -38, 9]];
  g.lineWidth = 6;
  g.strokeStyle = INK;
  for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = "#fffaf0";
  for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
}

/** A clay diya with its flame, in front of a rangoli flower. */
function diya(g: Ctx, accent: string, dark: boolean) {
  const cols = WILD_COLS(dark);
  for (let i = 0; i < 12; i++) {
    g.save();
    g.rotate((i / 12) * Math.PI * 2);
    g.beginPath(); g.ellipse(0, -62, 14, 32, 0, 0, Math.PI * 2);
    outlined(g, i % 2 ? accent : cols[i % 4], 2);
    g.restore();
  }
  g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); outlined(g, "#2a1040", 3);
  const glow = g.createRadialGradient(0, -24, 2, 0, -24, 46);
  glow.addColorStop(0, "rgba(255,230,140,0.9)"); glow.addColorStop(1, "rgba(255,160,40,0)");
  g.fillStyle = glow; g.beginPath(); g.arc(0, -24, 46, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(0, -48); g.quadraticCurveTo(12, -26, 0, -14); g.quadraticCurveTo(-12, -26, 0, -48); outlined(g, "#ffd23d", 2);
  g.beginPath(); g.moveTo(-36, -10); g.quadraticCurveTo(0, 30, 36, -10); g.quadraticCurveTo(44, -12, 46, -16); g.lineTo(-46, -16); g.closePath(); outlined(g, "#c0622a");
  g.fillStyle = "#ffd23d"; for (const x of [-20, 0, 20]) { g.beginPath(); g.arc(x, 0, 3, 0, Math.PI * 2); g.fill(); }
}

/** A pine tree with a star on top and baubles in the card colour. */
function tree(g: Ctx, accent: string) {
  g.fillStyle = "#6b3e1e"; g.fillRect(-10, 60, 20, 26); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-10, 60, 20, 26);
  for (const [y, w] of [[-60, 46], [-20, 66], [22, 86]] as const) {
    g.beginPath(); g.moveTo(0, y - 46); g.lineTo(w, y + 40); g.lineTo(-w, y + 40); g.closePath(); outlined(g, "#1f7a3a");
  }
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 8 : 18;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(Math.cos(a) * r, -112 + Math.sin(a) * r);
  }
  g.closePath(); outlined(g, "#ffd23d", 2);
  for (const [x, y] of [[-20, -30], [18, -10], [-36, 30], [30, 44], [0, 10], [-8, 52]] as const) {
    g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); outlined(g, accent, 2);
  }
}

function snowflakes(g: Ctx) {
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 2;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 14; k++) {
    const x = rnd() * W, y = rnd() * 260, r = 4 + rnd() * 6;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      g.beginPath(); g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke();
    }
  }
}

export function festivalFace(f: Face, kind: Festival): HTMLCanvasElement {
  const dark = isDarkFace(f);
  const [c, g] = base(kind === "christmas" ? "#f4f4f4" : "#d4af60");
  const fill = f.color === "wild" ? { pongal: "#7a3a0a", diwali: "#2a0a3a", christmas: "#0f2a1a" }[kind] : HEX[f.color];
  rounded(g, 10, 10, W - 20, H - 20, 18);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, shade(fill, 0.1));
  grad.addColorStop(1, shade(fill, -0.4));
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  if (f.color === "wild") { g.globalAlpha = 0.5; pinwheel(g, W / 2, 150, 160, WILD_COLS(dark)); g.globalAlpha = 1; }
  if (kind === "pongal") dots(g, "#fff3d6", 0.3);
  if (kind === "christmas") snowflakes(g);
  g.restore();

  const accent = f.color === "wild" ? "#d4af60" : f.color === "yellow" ? "#b87f00" : shade(HEX[f.color], 0.15);
  g.save();
  g.translate(W / 2, 150);
  g.scale(0.9, 0.9);
  g.lineJoin = "round";
  if (kind === "pongal") pongalPot(g, accent);
  else if (kind === "diwali") diya(g, accent, dark);
  else tree(g, accent);
  g.restore();
  namePlate(g, f, THEMES[kind].bots[VALUES.indexOf(f.value) % 10]);
  return c;
}

export function festivalBack(kind: Festival): HTMLCanvasElement {
  const [c, g] = base(kind === "christmas" ? "#f4f4f4" : "#d4af60");
  const [a, b] = { pongal: ["#d9822b", "#5a2a06"], diwali: ["#6a1a8a", "#1b0626"], christmas: ["#b3202a", "#3a0a0e"] }[kind];
  rounded(g, 10, 10, W - 20, H - 20, 18);
  const grad = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 240);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  if (kind === "christmas") snowflakes(g);
  else dots(g, "#ffe08a", 0.35, 18);
  g.restore();
  g.save();
  g.translate(W / 2, H / 2 + 6);
  g.scale(0.8, 0.8);
  g.lineJoin = "round";
  if (kind === "pongal") pongalPot(g, "#d4af60");
  else if (kind === "diwali") diya(g, "#d4af60", false);
  else tree(g, "#d4af60");
  g.restore();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#fff3d6";
  g.font = "700 22px Georgia, 'Times New Roman', serif";
  g.fillText(THEMES[kind].name.toUpperCase(), W / 2, 50);
  g.font = "700 18px Georgia, 'Times New Roman', serif";
  g.fillText("W I L D C A R D", W / 2, H - 40);
  return c;
}
