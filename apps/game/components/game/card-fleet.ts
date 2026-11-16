// "Space Fleet": an original starship on every card, painted in the card's colour.
import { type Face, SYMBOL, type Value } from "@/game/cards";
import { THEMES } from "@/game/themes";
import { H, HEX, W, WILD_COLS, base, isDarkFace, pinwheel, rounded, shade } from "./card-art";
import { INK, namePlate, outlined } from "./card-figures";

type Ctx = CanvasRenderingContext2D;
const HULL = "#e6ebf2";

function flame(g: Ctx, x: number, y: number, len: number) {
  const grad = g.createLinearGradient(x, y, x, y + len);
  grad.addColorStop(0, "#fff6c4");
  grad.addColorStop(0.4, "#ffb020");
  grad.addColorStop(1, "rgba(255,80,0,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(x - 8, y);
  g.quadraticCurveTo(x, y + len * 1.2, x + 8, y);
  g.fill();
}

/** Ships point up, centred on the origin, about 180 tall. */
const SHIPS: ((g: Ctx, accent: string) => void)[] = [
  // Rocket
  (g, a) => {
    flame(g, 0, 62, 60);
    g.beginPath(); g.moveTo(0, -90); g.quadraticCurveTo(30, -40, 24, 60); g.lineTo(-24, 60); g.quadraticCurveTo(-30, -40, 0, -90); outlined(g, HULL);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 22, 10); g.lineTo(s * 46, 66); g.lineTo(s * 22, 56); g.closePath(); outlined(g, a); }
    g.beginPath(); g.arc(0, -20, 12, 0, Math.PI * 2); outlined(g, "#7fd4ff");
    g.fillStyle = a; g.fillRect(-23, 30, 46, 8);
  },
  // Saucer
  (g, a) => {
    g.beginPath(); g.ellipse(0, -10, 34, 26, 0, Math.PI, 0); outlined(g, "#9fe3ff");
    g.beginPath(); g.ellipse(0, 0, 86, 22, 0, 0, Math.PI * 2); outlined(g, HULL);
    g.beginPath(); g.ellipse(0, 8, 56, 10, 0, 0, Math.PI * 2); outlined(g, a, 3);
    for (const x of [-60, -30, 0, 30, 60]) { g.beginPath(); g.arc(x, 2, 4, 0, Math.PI * 2); g.fillStyle = "#ffe08a"; g.fill(); }
    const beam = g.createLinearGradient(0, 20, 0, 90);
    beam.addColorStop(0, "rgba(160,240,255,0.5)"); beam.addColorStop(1, "rgba(160,240,255,0)");
    g.fillStyle = beam; g.beginPath(); g.moveTo(-20, 20); g.lineTo(20, 20); g.lineTo(40, 90); g.lineTo(-40, 90); g.fill();
  },
  // Delta fighter
  (g, a) => {
    for (const x of [-14, 14]) flame(g, x, 58, 40);
    g.beginPath(); g.moveTo(0, -90); g.lineTo(70, 56); g.lineTo(0, 40); g.lineTo(-70, 56); g.closePath(); outlined(g, HULL);
    g.beginPath(); g.moveTo(0, -60); g.lineTo(36, 40); g.lineTo(0, 30); g.lineTo(-36, 40); g.closePath(); outlined(g, a, 3);
    g.beginPath(); g.ellipse(0, -30, 8, 18, 0, 0, Math.PI * 2); outlined(g, "#7fd4ff");
  },
  // Shuttle
  (g, a) => {
    for (const x of [-12, 12]) flame(g, x, 70, 40);
    rounded(g, -24, -70, 48, 140, 22); outlined(g, HULL);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 24, -10); g.lineTo(s * 64, 50); g.lineTo(s * 64, 66); g.lineTo(s * 24, 60); g.closePath(); outlined(g, HULL); }
    g.fillStyle = INK; g.fillRect(-14, -54, 28, 10);
    g.fillStyle = a; g.fillRect(-24, 0, 48, 12);
  },
  // Cruiser
  (g, a) => {
    for (const x of [-20, 0, 20]) flame(g, x, 82, 30);
    g.beginPath(); g.moveTo(0, -96); g.lineTo(22, -40); g.lineTo(30, 82); g.lineTo(-30, 82); g.lineTo(-22, -40); g.closePath(); outlined(g, HULL);
    for (const s of [-1, 1]) { rounded(g, s * 30 - (s < 0 ? 22 : 0), 0, 22, 70, 8); outlined(g, a); }
    for (let y = -30; y < 70; y += 16) { g.fillStyle = "#ffe08a"; g.fillRect(-6, y, 12, 5); }
  },
];

const VALUES = Object.keys(SYMBOL) as Value[];

export function fleetFace(f: Face): HTMLCanvasElement {
  const dark = isDarkFace(f);
  const [c, g] = base(INK);
  const fill = f.color === "wild" ? "#1a1240" : HEX[f.color];
  rounded(g, 10, 10, W - 20, H - 20, 18);
  const grad = g.createRadialGradient(W / 2, 150, 20, W / 2, 150, 260);
  grad.addColorStop(0, shade(fill, -0.15));
  grad.addColorStop(1, "#05060f");
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  if (f.color === "wild") {
    g.globalAlpha = 0.45;
    pinwheel(g, W / 2, 150, 160, WILD_COLS(dark));
    g.globalAlpha = 1;
  }
  // Fixed star pattern per value, so the same card always looks the same.
  let seed = VALUES.indexOf(f.value) * 97 + 13;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = "#fff";
  for (let k = 0; k < 60; k++) g.fillRect(rnd() * W, rnd() * H, rnd() < 0.2 ? 2 : 1, rnd() < 0.2 ? 2 : 1);
  g.restore();

  const i = VALUES.indexOf(f.value) % 10;
  const accent = f.color === "wild" ? "#d4af60" : shade(HEX[f.color], 0.05);
  g.save();
  g.translate(W / 2, 150);
  g.rotate(i % 2 ? 0.25 : -0.25);
  g.lineJoin = "round";
  SHIPS[i % SHIPS.length](g, accent);
  g.restore();
  namePlate(g, f, THEMES.fleet.bots[i]);
  return c;
}

export function fleetBack(): HTMLCanvasElement {
  const [c, g] = base(INK);
  rounded(g, 10, 10, W - 20, H - 20, 18);
  const grad = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 240);
  grad.addColorStop(0, "#23306e");
  grad.addColorStop(1, "#04050e");
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = "#fff";
  for (let k = 0; k < 120; k++) g.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  g.restore();
  // Orbit rings round a small planet.
  g.strokeStyle = "#d4af60";
  g.lineWidth = 3;
  for (const r of [56, 80]) { g.beginPath(); g.ellipse(W / 2, H / 2, r, r * 0.38, -0.4, 0, Math.PI * 2); g.stroke(); }
  g.beginPath(); g.arc(W / 2, H / 2, 26, 0, Math.PI * 2); outlined(g, "#d4af60");
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#f4ecd8";
  g.font = "900 22px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillText("SPACE FLEET", W / 2, 64);
  g.fillText("WILDCARD", W / 2, H - 60);
  return c;
}
