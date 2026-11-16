// Picture sets for the festival cards, one picture per card value so a hand looks varied.
// Diwali: crackers and lights. Pongal: the harvest. All drawn centred on (0, 0), about 100 across.
import { WILD_COLS, rounded } from "./card-art";
import { INK, outlined } from "./card-figures";

type Ctx = CanvasRenderingContext2D;
export type Art = (g: Ctx, accent: string, dark: boolean) => void;

/** Seeded scatter, so a card looks the same every time it is drawn. */
function scatter(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function sparks(g: Ctx, n: number, at: (k: number, r: () => number) => [number, number], seed: number) {
  const r = scatter(seed);
  for (let k = 0; k < n; k++) {
    const [x, y] = at(k, r);
    g.fillStyle = ["#fff6c4", "#ffd23d", "#ff9a3d", "#ffffff"][k % 4];
    g.beginPath();
    g.arc(x, y, 1.5 + r() * 2.5, 0, Math.PI * 2);
    g.fill();
  }
}

// ---------- Diwali ----------

/** Pusvanam: a flower-pot cracker throwing a fountain of sparks. */
const pusvanam: Art = (g, accent) => {
  sparks(g, 90, (_k, r) => {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.3;
    const d = 20 + r() * 110;
    return [Math.cos(a) * d * 0.7, 30 + Math.sin(a) * d + (d * d) / 260];
  }, 11);
  g.beginPath(); g.moveTo(-34, 90); g.lineTo(34, 90); g.lineTo(14, 26); g.lineTo(-14, 26); g.closePath(); outlined(g, accent);
  g.fillStyle = "#fff3d6";
  for (const y of [44, 62, 80]) g.fillRect(-26 + (90 - y) * 0.3, y, 52 - (90 - y) * 0.6, 4);
};

/** Sangu chakkaram: a spinning wheel cracker with sparks flying off its rim. */
const chakkaram: Art = (g, accent) => {
  g.strokeStyle = "rgba(255,214,90,0.8)";
  g.lineWidth = 3;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    g.beginPath();
    g.arc(0, 0, 70 + (i % 3) * 8, a, a + 0.5);
    g.stroke();
  }
  g.beginPath();
  for (let t = 0; t < Math.PI * 8; t += 0.1) {
    const r = 6 + t * 1.9;
    g.lineTo(Math.cos(t) * r, Math.sin(t) * r);
  }
  g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
  g.lineWidth = 6; g.strokeStyle = accent; g.stroke();
  g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); outlined(g, "#d4af60", 2);
  sparks(g, 40, (k, r) => { const a = (k / 40) * Math.PI * 2; const d = 60 + r() * 40; return [Math.cos(a) * d, Math.sin(a) * d]; }, 23);
};

/** Rocket on its stick, flying up with a trail and a burst overhead. */
const rocket: Art = (g, accent) => {
  sparks(g, 50, (k, r) => { const a = (k / 50) * Math.PI * 2; const d = 10 + r() * 34; return [46 + Math.cos(a) * d, -80 + Math.sin(a) * d]; }, 37);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 10;
  g.beginPath(); g.moveTo(-60, 100); g.quadraticCurveTo(-40, 60, -12, 40); g.stroke();
  g.save(); g.rotate(0.45);
  g.strokeStyle = "#8a5a2b"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 20); g.lineTo(0, 110); g.stroke();
  rounded(g, -11, -40, 22, 62, 4); outlined(g, accent);
  g.beginPath(); g.moveTo(-11, -40); g.lineTo(0, -66); g.lineTo(11, -40); g.closePath(); outlined(g, "#e5383b");
  g.beginPath(); g.moveTo(-8, 22); g.quadraticCurveTo(0, 50, 8, 22); outlined(g, "#ffb020", 2);
  g.restore();
};

/** Kambi mathappu: a sparkler stick with a starburst at its tip. */
const sparkler: Art = (g) => {
  g.strokeStyle = "#9aa3ad"; g.lineWidth = 5;
  g.beginPath(); g.moveTo(-50, 100); g.lineTo(20, -30); g.stroke();
  g.strokeStyle = "#fff6c4"; g.lineWidth = 2;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const d = 30 + (i % 4) * 14;
    g.beginPath(); g.moveTo(20, -30); g.lineTo(20 + Math.cos(a) * d, -30 + Math.sin(a) * d); g.stroke();
  }
  sparks(g, 30, (_k, r) => { const a = r() * Math.PI * 2; const d = 40 + r() * 40; return [20 + Math.cos(a) * d, -30 + Math.sin(a) * d]; }, 51);
  const glow = g.createRadialGradient(20, -30, 0, 20, -30, 30);
  glow.addColorStop(0, "#ffffff"); glow.addColorStop(1, "rgba(255,230,140,0)");
  g.fillStyle = glow; g.beginPath(); g.arc(20, -30, 30, 0, Math.PI * 2); g.fill();
};

/** Akash kandil: a hanging star lantern with tassels. */
const kandil: Art = (g, accent) => {
  g.strokeStyle = "#d4af60"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -110); g.lineTo(0, -66); g.stroke();
  const glow = g.createRadialGradient(0, 0, 10, 0, 0, 90);
  glow.addColorStop(0, "rgba(255,220,120,0.6)"); glow.addColorStop(1, "rgba(255,160,40,0)");
  g.fillStyle = glow; g.beginPath(); g.arc(0, 0, 90, 0, Math.PI * 2); g.fill();
  g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 28 : 66; const a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); outlined(g, accent);
  g.beginPath(); g.arc(0, 0, 20, 0, Math.PI * 2); outlined(g, "#fff3d6", 3);
  for (const x of [-30, -15, 0, 15, 30]) { g.strokeStyle = "#d4af60"; g.lineWidth = 3; g.beginPath(); g.moveTo(x * 0.6, 50); g.lineTo(x, 104); g.stroke(); }
};

/** Rangoli: rings of petals and dots in festival colours. */
const rangoli: Art = (g, accent, dark) => {
  const cols = WILD_COLS(dark);
  for (const [r, n, w, h] of [[78, 16, 10, 22], [52, 12, 12, 20], [28, 8, 9, 14]] as const) {
    for (let i = 0; i < n; i++) {
      g.save(); g.rotate((i / n) * Math.PI * 2);
      g.beginPath(); g.ellipse(0, -r, w, h, 0, 0, Math.PI * 2);
      outlined(g, i % 2 ? accent : cols[(i + r) % 4], 2);
      g.restore();
    }
  }
  g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); outlined(g, "#fff3d6", 2);
  g.fillStyle = "#fff3d6";
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 100, Math.sin(a) * 100, 3, 0, Math.PI * 2); g.fill(); }
};

/** A string of red crackers going off, "BOOM!" at the end. */
const crackerString: Art = (g, accent) => {
  g.strokeStyle = "#6b4a26"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-70, -90); g.quadraticCurveTo(-10, 0, 40, 60); g.stroke();
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const x = -70 + t * 110 + Math.sin(t * 3) * 10;
    const y = -90 + t * 150;
    g.save(); g.translate(x, y); g.rotate(i % 2 ? 0.6 : -0.6);
    rounded(g, -6, -16, 12, 32, 3); outlined(g, i % 2 ? "#e5383b" : accent, 2);
    g.restore();
  }
  g.beginPath();
  for (let i = 0; i < 16; i++) { const r = i % 2 ? 22 : 46; const a = (i / 16) * Math.PI * 2; g.lineTo(52 + Math.cos(a) * r, 74 + Math.sin(a) * r); }
  g.closePath(); outlined(g, "#ffd23d", 3);
  g.fillStyle = "#e5383b"; g.font = "900 18px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("BOOM!", 52, 76);
};

// ---------- Pongal ----------

/** A bundle of three sugarcane stalks tied with a ribbon in the card colour. */
const sugarcane: Art = (g, accent) => {
  for (const [x, rot] of [[-26, -0.18], [0, 0], [26, 0.18]] as const) {
    g.save(); g.rotate(rot); g.translate(x, 0);
    for (let y = -100; y < 100; y += 28) { rounded(g, -8, y, 16, 26, 4); outlined(g, "#7a3b6e", 2); }
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -100); g.quadraticCurveTo(s * 30, -140, s * 44, -118); g.quadraticCurveTo(s * 22, -124, 0, -100); outlined(g, "#5aa02c", 2); }
    g.restore();
  }
  rounded(g, -42, 10, 84, 14, 5); outlined(g, accent, 3);
};

/** Surya: the rising sun with long rays over a green field. */
const sun: Art = (g) => {
  g.beginPath(); g.ellipse(0, 70, 110, 28, 0, Math.PI, 0); g.closePath(); outlined(g, "#5aa02c");
  for (let i = 0; i < 16; i++) {
    const a = Math.PI + (i / 15) * Math.PI;
    g.beginPath(); g.moveTo(Math.cos(a) * 56, 40 + Math.sin(a) * 56); g.lineTo(Math.cos(a - 0.06) * 96, 40 + Math.sin(a - 0.06) * 96); g.lineTo(Math.cos(a + 0.06) * 96, 40 + Math.sin(a + 0.06) * 96); g.closePath();
    outlined(g, "#ffb020", 2);
  }
  g.beginPath(); g.arc(0, 40, 50, Math.PI, 0); g.closePath(); outlined(g, "#ff8a1d");
};

/** Mattu Pongal: a cow with painted horns, a bell and a marigold garland. */
const cow: Art = (g, accent) => {
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 20, -54); g.quadraticCurveTo(s * 60, -74, s * 56, -112); g.quadraticCurveTo(s * 44, -80, s * 10, -66); g.closePath(); outlined(g, accent, 3);
    g.fillStyle = "#fff3d6"; g.fillRect(s * 46 - 3, -96, 6, 10);
    g.beginPath(); g.ellipse(s * 46, -40, 18, 9, s * 0.4, 0, Math.PI * 2); outlined(g, "#f4ecd8", 3);
  }
  g.beginPath(); g.moveTo(-36, -50); g.quadraticCurveTo(-40, 20, -22, 46); g.quadraticCurveTo(0, 60, 22, 46); g.quadraticCurveTo(40, 20, 36, -50); g.quadraticCurveTo(0, -70, -36, -50); outlined(g, "#f4ecd8");
  g.beginPath(); g.ellipse(0, 36, 22, 14, 0, 0, Math.PI * 2); outlined(g, "#e8b4a0", 3);
  g.fillStyle = INK; for (const x of [-16, 16]) { g.beginPath(); g.arc(x, -18, 5, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + i * 0.0875); g.beginPath(); g.arc(Math.cos(a) * 46, 40 + Math.sin(a) * 30, 8, 0, Math.PI * 2); outlined(g, i % 2 ? "#ff8a1d" : "#ffd23d", 2); }
  g.beginPath(); g.arc(0, 86, 11, 0, Math.PI * 2); outlined(g, "#d4af60", 3);
};

/** A sikku kolam: one line weaving round a grid of dots. */
const kolam: Art = (g, accent) => {
  g.fillStyle = "#fff3d6";
  for (let y = -60; y <= 60; y += 30) for (let x = -60; x <= 60; x += 30) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = "#fff3d6"; g.lineWidth = 4;
  for (let y = -45; y <= 45; y += 30) for (let x = -45; x <= 45; x += 30) {
    g.beginPath(); g.moveTo(x, y - 15); g.quadraticCurveTo(x + 15, y - 15, x + 15, y); g.quadraticCurveTo(x + 15, y + 15, x, y + 15); g.quadraticCurveTo(x - 15, y + 15, x - 15, y); g.quadraticCurveTo(x - 15, y - 15, x, y - 15); g.stroke();
  }
  g.strokeStyle = accent; g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, -96); g.lineTo(96, 0); g.lineTo(0, 96); g.lineTo(-96, 0); g.closePath(); g.stroke();
};

/** Manjal kothu: a turmeric plant with broad leaves and roots, tied to the pot at Pongal. */
const turmeric: Art = (g) => {
  for (const [a, l] of [[-0.5, 100], [-0.2, 118], [0.15, 112], [0.45, 96]] as const) {
    g.save(); g.rotate(a);
    g.beginPath(); g.moveTo(0, 40); g.quadraticCurveTo(26, -l / 2, 0, -l); g.quadraticCurveTo(-26, -l / 2, 0, 40); outlined(g, "#4f9a2a", 3);
    g.strokeStyle = "#2f6a1a"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 30); g.lineTo(0, -l + 10); g.stroke();
    g.restore();
  }
  for (const [x, y, rot] of [[-20, 60, -0.5], [0, 66, 0], [22, 58, 0.5]] as const) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath(); g.ellipse(0, 0, 12, 22, 0, 0, Math.PI * 2); outlined(g, "#e0a020", 3);
    g.restore();
  }
};

/** Pongal served on a banana leaf with a piece of sugarcane and a banana. */
const leaf: Art = (g, accent) => {
  g.beginPath(); g.moveTo(-100, 30); g.quadraticCurveTo(0, -70, 100, 10); g.quadraticCurveTo(10, 90, -100, 30); outlined(g, "#3f8f2a");
  g.strokeStyle = "#7cc24a"; g.lineWidth = 3; g.beginPath(); g.moveTo(-96, 30); g.quadraticCurveTo(0, 6, 96, 12); g.stroke();
  g.beginPath(); g.arc(-10, 14, 30, Math.PI, 0); g.closePath(); outlined(g, "#fff6dc");
  g.fillStyle = "#8a4a16"; for (const [x, y] of [[-24, 2], [-4, -6], [6, 6]] as const) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.moveTo(34, -8); g.quadraticCurveTo(74, -30, 82, 6); g.quadraticCurveTo(60, -10, 36, 4); g.closePath(); outlined(g, "#ffd23d", 3);
  rounded(g, -70, 34, 40, 10, 4); outlined(g, accent, 2);
};

export const DIWALI_ART: Art[] = [pusvanam, chakkaram, rocket, sparkler, kandil, rangoli, crackerString];
export const PONGAL_ART: Art[] = [sugarcane, sun, cow, kolam, turmeric, leaf];
