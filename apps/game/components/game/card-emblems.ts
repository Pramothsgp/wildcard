// Royal emblems of the three crowned Tamil dynasties, drawn as simple gold line art:
// the Chera bow, the Chola tiger and the Pandya twin fish. Historical symbols, our own drawings.
import { GOLD, type TempleStyle, photo } from "./card-themes";

type Ctx = CanvasRenderingContext2D;

/** Draw inside a local frame where the emblem spans about -84..84. */
function frame(g: Ctx, cx: number, cy: number, s: number, draw: () => void) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.lineJoin = "round";
  g.lineCap = "round";
  draw();
  g.restore();
}

function disc(g: Ctx, fill: string) {
  g.beginPath();
  g.arc(0, 0, 84, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = GOLD;
  g.stroke();
}

/** Chera: a strung bow drawn back with an arrow across it. */
export function bow(g: Ctx, cx: number, cy: number, s: number, fill: string) {
  frame(g, cx, cy, s, () => {
    disc(g, fill);
    g.strokeStyle = GOLD;
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(-18, -62);
    g.quadraticCurveTo(52, 0, -18, 62);
    g.stroke();
    // String, pulled back to the arrow's nock.
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(-18, -62);
    g.lineTo(-44, 0);
    g.lineTo(-18, 62);
    g.stroke();
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(-44, 0);
    g.lineTo(58, 0);
    g.stroke();
    g.fillStyle = GOLD;
    g.beginPath();
    g.moveTo(70, 0);
    g.lineTo(52, -10);
    g.lineTo(52, 10);
    g.fill();
    for (const y of [-7, 7]) {
      g.beginPath();
      g.moveTo(-44, 0);
      g.lineTo(-56, y);
      g.lineTo(-36, y * 0.6);
      g.fill();
    }
  });
}

/** Chola: a tiger's face with ears, stripes and whiskers. */
export function tiger(g: Ctx, cx: number, cy: number, s: number, fill: string) {
  frame(g, cx, cy, s, () => {
    disc(g, fill);
    g.fillStyle = GOLD;
    g.strokeStyle = GOLD;
    for (const x of [-1, 1]) {
      g.beginPath();
      g.arc(x * 38, -40, 15, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.ellipse(0, 4, 50, 46, 0, 0, Math.PI * 2);
    g.fill();
    // Stripes and features cut out in the background colour.
    g.strokeStyle = fill;
    g.fillStyle = fill;
    g.lineWidth = 5;
    for (const x of [-1, 1]) {
      g.beginPath(); g.arc(x * 38, -40, 6, 0, Math.PI * 2); g.fill();
      for (const y of [-6, 8, 22]) {
        g.beginPath();
        g.moveTo(x * 50, y);
        g.quadraticCurveTo(x * 38, y + 2, x * 30, y - 6);
        g.stroke();
      }
      g.beginPath();
      g.ellipse(x * 18, -6, 7, 5, x * 0.35, 0, Math.PI * 2);
      g.fill();
    }
    for (const dx of [-10, 0, 10]) {
      g.beginPath();
      g.moveTo(dx, -40);
      g.lineTo(dx * 0.6, -24);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-9, 14);
    g.lineTo(9, 14);
    g.lineTo(0, 24);
    g.fill();
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 24); g.lineTo(0, 32);
    g.moveTo(0, 32); g.quadraticCurveTo(-10, 40, -18, 34);
    g.moveTo(0, 32); g.quadraticCurveTo(10, 40, 18, 34);
    g.stroke();
  });
}

/** Pandya: two fish facing each other, nose to nose. */
export function twinFish(g: Ctx, cx: number, cy: number, s: number, fill: string) {
  frame(g, cx, cy, s, () => {
    disc(g, fill);
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      g.fillStyle = GOLD;
      g.beginPath();
      // Body from the nose near the centre out to the tail.
      g.moveTo(-8, 0);
      g.quadraticCurveTo(-30, -30, -58, -6);
      g.lineTo(-74, -22);
      g.lineTo(-68, 0);
      g.lineTo(-74, 22);
      g.lineTo(-58, 6);
      g.quadraticCurveTo(-30, 30, -8, 0);
      g.fill();
      g.fillStyle = fill;
      g.beginPath();
      g.arc(-22, -4, 4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = fill;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(-34, -14);
      g.quadraticCurveTo(-40, 0, -34, 14);
      g.stroke();
      g.restore();
    }
    // A crown-like tilaka above, the way the twin fish are shown on Pandya coins.
    g.fillStyle = GOLD;
    g.beginPath();
    g.moveTo(-14, -40);
    g.lineTo(0, -60);
    g.lineTo(14, -40);
    g.closePath();
    g.fill();
  });
}

export const CHERA: TempleStyle = { wild: ["#0f4a3a", "#082a22"], back: ["#14634d", "#062a20"], emblem: bow, title: "CHERA", photo: "/cards/dynasty/chera.jpg" };
export const CHOLA: TempleStyle = { wild: ["#5e0d10", "#2e0608"], back: ["#8a1418", "#3a0608"], emblem: tiger, title: "CHOLA", photo: "/cards/dynasty/chola.jpg", focus: [0.59, 0.45, 1.8] };
export const PANDYA: TempleStyle = { wild: ["#132a5e", "#0a1633"], back: ["#1d3f8a", "#0a1838"], emblem: twinFish, title: "PANDYA", photo: "/cards/dynasty/pandya.jpg" };

// Start loading the photos as soon as this module runs in the browser, so card backs and
// the lobby previews usually have them on first draw.
if (typeof window !== "undefined") for (const s of [CHERA, CHOLA, PANDYA]) photo(s.photo!);
