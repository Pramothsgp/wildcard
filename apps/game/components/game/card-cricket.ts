// "Cricket": trading-card style player cards. Invented players and made-up stats; no real
// cricketers, team or sponsor logos, and no national flag (only a saffron, white and green wash).
import { type Face, SYMBOL, type Value } from "@/game/cards";
import { THEMES } from "@/game/themes";
import { H, HEX, W, WILD_COLS, base, isDarkFace, pinwheel, rounded, shade } from "./card-art";
import { type HeadFn, type Hero, INK, drawHero, eyes, outlined } from "./card-figures";

type Ctx = CanvasRenderingContext2D;
const NAVY = "#141a3c";
const VALUES = Object.keys(SYMBOL) as Value[];

/** Batting helmet with a steel grille. */
const helmet: HeadFn = (g, _h, accent) => {
  eyes(g);
  g.beginPath(); g.arc(0, -78, 33, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(36, -70); g.lineTo(-36, -70); g.closePath(); outlined(g, NAVY);
  g.fillStyle = accent; g.fillRect(-30, -96, 60, 5);
  g.strokeStyle = "#c9d1da"; g.lineWidth = 3;
  for (const y of [-64, -56, -48]) { g.beginPath(); g.moveTo(-24, y); g.quadraticCurveTo(0, y + 6, 24, y); g.stroke(); }
  for (const x of [-12, 0, 12]) { g.beginPath(); g.moveTo(x, -68); g.lineTo(x * 0.8, -44); g.stroke(); }
};

/** Team cap with a brim. */
const cap: HeadFn = (g, _h, accent) => {
  eyes(g);
  g.beginPath(); g.arc(0, -82, 31, Math.PI, 0); g.closePath(); outlined(g, accent);
  g.beginPath(); g.ellipse(18, -82, 26, 6, 0.1, 0, Math.PI * 2); outlined(g, shade(accent, -0.3), 3);
  g.beginPath(); g.moveTo(-10, -60); g.quadraticCurveTo(0, -54, 10, -60); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
};

/** Floppy sun hat, as worn in the field on a hot day. */
const sunhat: HeadFn = (g) => {
  eyes(g);
  g.beginPath(); g.ellipse(0, -88, 46, 11, 0, 0, Math.PI * 2); outlined(g, "#f4f1e8");
  g.beginPath(); g.arc(0, -90, 26, Math.PI, 0); g.closePath(); outlined(g, "#f4f1e8");
};

const skins = ["#8a5a3a", "#c68a5c", "#a8714a", "#e2b48c", "#6e4428"];
/** Ten players: batters, bowlers, a keeper and all-rounders, in the card's team colour. */
const ROLES: { head: HeadFn; prop: Hero["prop"]; role: string }[] = [
  { head: helmet, prop: "bat", role: "BAT" }, { head: cap, prop: "ball", role: "BOWL" }, { head: helmet, prop: "gloves", role: "KEEP" },
  { head: cap, prop: "bat", role: "ALL" }, { head: sunhat, prop: "ball", role: "BOWL" }, { head: helmet, prop: "bat", role: "BAT" },
  { head: cap, prop: "ball", role: "BOWL" }, { head: sunhat, prop: "bat", role: "ALL" }, { head: helmet, prop: "bat", role: "BAT" },
  { head: cap, prop: "ball", role: "BOWL" },
];

/** Stable made-up stats for a card, so the same card always shows the same numbers. */
function stats(i: number, color: string) {
  let seed = i * 977 + color.length * 131 + 7;
  const r = (lo: number, hi: number) => lo + ((seed = (seed * 16807) % 2147483647) % (hi - lo + 1));
  return [["MATCHES", r(40, 320)], ["RUNS", r(400, 9800)], ["HUNDREDS", r(0, 32)], ["WICKETS", r(0, 260)]] as const;
}

/** Saffron, white and green wash with floodlight beams. */
function backdrop(g: Ctx, fill: string, wild: boolean, dark: boolean) {
  const grad = g.createLinearGradient(0, 0, W, 240);
  grad.addColorStop(0, "#ff9933");
  grad.addColorStop(0.45, "#f4f1e8");
  grad.addColorStop(1, "#138808");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, 260);
  g.fillStyle = "rgba(20,26,60,0.55)";
  g.fillRect(0, 0, W, 260);
  const glow = g.createRadialGradient(W / 2, 140, 10, W / 2, 140, 150);
  glow.addColorStop(0, shade(fill, 0.2));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, 260);
  if (wild) { g.globalAlpha = 0.45; pinwheel(g, W / 2, 140, 150, WILD_COLS(dark)); g.globalAlpha = 1; }
  g.fillStyle = "rgba(255,255,255,0.12)";
  for (const x of [30, W - 30]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (x < W / 2 ? 90 : -90), 260); g.lineTo(x + (x < W / 2 ? 40 : -40), 260); g.fill(); }
}

export function cricketFace(f: Face): HTMLCanvasElement {
  const dark = isDarkFace(f);
  const team = f.color === "wild" ? "#d4af60" : HEX[f.color];
  const [c, g] = base(team);
  rounded(g, 8, 8, W - 16, H - 16, 18);
  g.save();
  g.clip();
  g.fillStyle = NAVY;
  g.fillRect(0, 0, W, H);
  backdrop(g, team, f.color === "wild", dark);
  const i = VALUES.indexOf(f.value) % 10;
  const r = ROLES[i];
  g.save();
  g.translate(W / 2, 205);
  g.scale(0.92, 0.92);
  drawHero(g, { head: r.head, prop: r.prop, skin: skins[i % skins.length], suit: f.color === "wild" ? NAVY : team, trim: NAVY }, team);
  g.restore();
  g.restore();

  // Name banner: first name light, surname bold.
  const [first, last] = THEMES.cricket.bots[i].toUpperCase().split(" ");
  g.fillStyle = NAVY;
  g.fillRect(8, 236, W - 16, 30);
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.font = "300 17px system-ui, -apple-system, Segoe UI, sans-serif";
  const fw = g.measureText(`${first} `).width;
  g.font = "800 17px system-ui, -apple-system, Segoe UI, sans-serif";
  const lw = g.measureText(last).width;
  const x0 = W / 2 - (fw + lw) / 2;
  g.textAlign = "left";
  g.fillStyle = "#f4f1e8";
  g.font = "300 17px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillText(`${first} `, x0, 251);
  g.font = "800 17px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillText(last, x0 + fw, 251);

  // Stats panel: the card's value big on the left (the rating), made-up numbers on the right.
  rounded(g, 16, 272, W - 32, 92, 10);
  g.fillStyle = "rgba(10,14,36,0.92)";
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = team;
  g.stroke();
  const sym = SYMBOL[f.value] === "W" ? "★" : SYMBOL[f.value];
  g.textAlign = "center";
  g.fillStyle = f.color === "wild" ? "#ffe08a" : shade(team, 0.3);
  g.font = `900 ${sym.length > 2 ? 32 : 48}px system-ui, -apple-system, Segoe UI, sans-serif`;
  g.fillText(sym, 62, 308);
  g.fillStyle = "#f4f1e8";
  g.font = "700 12px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillText(r.role, 62, 344);
  g.fillStyle = "rgba(255,255,255,0.25)";
  g.fillRect(108, 282, 2, 72);
  g.textAlign = "left";
  stats(i, f.color).forEach(([label, n], k) => {
    const y = 290 + k * 18;
    g.fillStyle = "rgba(244,241,232,0.65)";
    g.font = "700 10px system-ui, -apple-system, Segoe UI, sans-serif";
    g.fillText(label, 120, y);
    g.fillStyle = "#f4f1e8";
    g.font = "800 12px system-ui, -apple-system, Segoe UI, sans-serif";
    g.textAlign = "right";
    g.fillText(String(n), W - 26, y);
    g.textAlign = "left";
  });

  // Corner value, readable in a fanned hand.
  g.font = `900 ${sym.length > 2 ? 22 : 30}px system-ui, -apple-system, Segoe UI, sans-serif`;
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.strokeText(sym, 32, 36);
  g.fillText(sym, 32, 36);
  return c;
}

/** League crest: a shield with crossed bats, stumps and a ball, on a purple ground. */
export function cricketBack(): HTMLCanvasElement {
  const [c, g] = base("#f4f1e8");
  rounded(g, 8, 8, W - 16, H - 16, 18);
  const grad = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 260);
  grad.addColorStop(0, "#7b3fd0");
  grad.addColorStop(1, "#2a0f5a");
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = "rgba(255,255,255,0.07)";
  g.lineWidth = 16;
  for (let x = -H; x < W + H; x += 44) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke(); }
  g.restore();
  const cx = W / 2;
  const cy = H / 2 - 10;
  g.beginPath();
  g.moveTo(cx - 80, cy - 80);
  g.quadraticCurveTo(cx, cy - 104, cx + 80, cy - 80);
  g.lineTo(cx + 74, cy + 10);
  g.quadraticCurveTo(cx + 60, cy + 76, cx, cy + 104);
  g.quadraticCurveTo(cx - 60, cy + 76, cx - 74, cy + 10);
  g.closePath();
  g.fillStyle = "rgba(20,10,50,0.6)";
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = "#f4f1e8";
  g.stroke();
  // Stumps and bails.
  g.fillStyle = "#f4f1e8";
  for (const x of [-14, 0, 14]) g.fillRect(cx + x - 3, cy - 46, 6, 70);
  g.fillRect(cx - 18, cy - 52, 15, 4);
  g.fillRect(cx + 3, cy - 52, 15, 4);
  // Crossed bats.
  for (const s of [-1, 1]) {
    g.save();
    g.translate(cx, cy);
    g.rotate(s * 0.65);
    rounded(g, -9, -58, 18, 84, 7);
    outlined(g, "#e9d7a8", 3);
    g.fillStyle = "#2a2a2a";
    g.fillRect(-3, 26, 6, 26);
    g.restore();
  }
  g.beginPath();
  g.arc(cx, cy - 66, 11, 0, Math.PI * 2);
  outlined(g, "#c8102e", 3);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#f4f1e8";
  g.font = "900 26px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillText("CRICKET", cx, cy + 58);
  g.font = "700 12px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillText("W I L D C A R D   L E A G U E", cx, cy + 80);
  return c;
}
