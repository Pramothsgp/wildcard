// "Action Heroes" theme: a cast of original action-figure characters, one per card value.
// Generic action archetypes drawn from simple shapes; no existing franchise characters.
import { type Face, SYMBOL, type Value } from "@/game/cards";
import { THEMES } from "@/game/themes";
import { H, HEX, W, WILD_COLS, base, isDarkFace, pinwheel, rounded, shade } from "./card-art";

type Head = "headband" | "mask" | "visor" | "dome" | "hat" | "kabuto" | "robot" | "luchador" | "hood" | "horns";
/** A custom head, drawn over a plain face, for casts defined in other files. */
export type HeadFn = (g: CanvasRenderingContext2D, h: Hero, accent: string) => void;
type Prop = "sword" | "bow" | "axe" | "staff" | "spear" | "shield" | "bat" | "ball" | "gloves" | null;
export type Hero = { head: Head | HeadFn; skin: string; suit: string; trim: string; prop: Prop; cape?: boolean; jetpack?: boolean };

/** Ten heroes, in the same order as their names in THEMES.action.bots. */
const HEROES: Hero[] = [
  { head: "headband", skin: "#e8b48a", suit: "#f4f1e8", trim: "#1b1b1f", prop: "staff" },
  { head: "mask", skin: "#d9a07a", suit: "#1d1f2b", trim: "#3a3f55", prop: "sword" },
  { head: "visor", skin: "#c68a5c", suit: "#f4f4f4", trim: "#1b1b1f", prop: null },
  { head: "dome", skin: "#f1c6a0", suit: "#e9eef7", trim: "#5c6b84", prop: null, jetpack: true },
  { head: "hat", skin: "#a8714a", suit: "#6b7a3c", trim: "#3f2c17", prop: "bow" },
  { head: "kabuto", skin: "#e2b089", suit: "#3a2a2a", trim: "#d4af60", prop: "sword" },
  { head: "robot", skin: "#b8c2cc", suit: "#8f9aa6", trim: "#2c3440", prop: null },
  { head: "luchador", skin: "#c98d63", suit: "#1b1b1f", trim: "#f4f4f4", prop: null, cape: true },
  { head: "hood", skin: "#b67a50", suit: "#c9a46a", trim: "#6b4a26", prop: "bow", cape: true },
  { head: "horns", skin: "#f0c09a", suit: "#5a4632", trim: "#b8c2cc", prop: "axe" },
];

/** A set of characters with their names and card back colours. */
export type Cast = { heroes: Hero[]; names: string[]; back: [string, string]; title: string };
const ACTION: Cast = { heroes: HEROES, names: THEMES.action.bots, back: ["#2a1458", "#0b1030"], title: "ACTION" };

const VALUES = Object.keys(SYMBOL) as Value[];
const heroIndex = (v: Value, n: number) => VALUES.indexOf(v) % n;

export const INK = "#111114";

export function limb(g: CanvasRenderingContext2D, pts: number[], color: string, w: number) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.lineWidth = w + 7;
  g.strokeStyle = INK;
  g.stroke();
  g.lineWidth = w;
  g.strokeStyle = color;
  g.stroke();
}

export function outlined(g: CanvasRenderingContext2D, fill: string, width = 4) {
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = width;
  g.strokeStyle = INK;
  g.stroke();
}

/** Action hero n in its default gold trim, for avatars. */
export const drawActionHero = (g: CanvasRenderingContext2D, n: number) => drawHero(g, HEROES[n % HEROES.length], "#d4af60");

/** One hero in a fighting stance, centred on the origin, about 220 tall. `accent` is the card colour. */
export function drawHero(g: CanvasRenderingContext2D, h: Hero, accent: string) {
  g.lineCap = "round";
  g.lineJoin = "round";
  if (h.cape) {
    g.beginPath();
    g.moveTo(-30, -40);
    g.quadraticCurveTo(-70, 40, -54, 96);
    g.lineTo(46, 90);
    g.quadraticCurveTo(58, 20, 30, -40);
    g.closePath();
    outlined(g, shade(accent, -0.25));
  }
  if (h.jetpack) {
    for (const x of [-30, 14]) {
      rounded(g, x, -48, 16, 56, 6);
      outlined(g, "#9aa6b8");
      g.beginPath();
      g.moveTo(x + 2, 8);
      g.lineTo(x + 8, 34);
      g.lineTo(x + 14, 8);
      outlined(g, "#ffb020", 2);
    }
  }
  // Legs in a wide stance, boots in the trim colour.
  limb(g, [-14, 28, -30, 66, -38, 98], h.suit, 17);
  limb(g, [14, 28, 28, 64, 42, 98], h.suit, 17);
  for (const [x, y] of [[-40, 100], [44, 100]]) {
    g.beginPath();
    g.ellipse(x, y, 13, 7, 0, 0, Math.PI * 2);
    outlined(g, h.trim, 3);
  }
  // Torso with a belt in the card colour.
  g.beginPath();
  g.moveTo(-32, -44);
  g.lineTo(32, -44);
  g.lineTo(24, 32);
  g.lineTo(-24, 32);
  g.closePath();
  outlined(g, h.head === "visor" ? accent : h.suit);
  if (h.head === "visor") {
    // A suit stripe so every card colour gets a matching trooper.
    g.beginPath();
    g.moveTo(-10, -44); g.lineTo(0, -20); g.lineTo(10, -44);
    outlined(g, "#f4f4f4", 3);
  }
  rounded(g, -26, 12, 52, 10, 3);
  outlined(g, h.head === "visor" ? INK : accent, 3);
  rounded(g, -6, 11, 12, 12, 2);
  outlined(g, "#d4af60", 2);
  // Arms: one fist raised, one guarding low.
  const sleeve = h.head === "visor" ? accent : h.suit;
  limb(g, [-30, -38, -54, -62, -46, -96], sleeve, 14);
  limb(g, [30, -38, 52, -10, 42, 18], sleeve, 14);
  for (const [x, y] of [[-46, -100], [42, 22]]) {
    g.beginPath();
    g.arc(x, y, 10, 0, Math.PI * 2);
    outlined(g, h.skin, 3);
  }
  prop(g, h.prop);
  head(g, h, accent);
}

function prop(g: CanvasRenderingContext2D, p: Prop) {
  if (p === "sword") {
    limb(g, [-46, -100, -20, -150], "#dfe6ee", 6);
    limb(g, [-54, -96, -38, -104], "#d4af60", 5);
  } else if (p === "staff") {
    limb(g, [-70, -60, -24, -140], "#8a5a2b", 6);
  } else if (p === "axe") {
    limb(g, [-46, -100, -40, -150], "#8a5a2b", 6);
    g.beginPath();
    g.moveTo(-40, -150);
    g.quadraticCurveTo(-10, -160, -12, -128);
    g.quadraticCurveTo(-26, -136, -40, -132);
    outlined(g, "#c9d1da", 3);
  } else if (p === "bat") {
    // Willow blade held up over the shoulder, grip in the raised fist.
    limb(g, [-46, -100, -40, -124], "#2a2a2a", 5);
    g.save(); g.translate(-38, -126); g.rotate(-0.12);
    rounded(g, -9, -78, 18, 78, 6); outlined(g, "#e9d7a8", 3);
    g.fillStyle = "#c9a46a"; g.fillRect(-2, -74, 4, 70);
    g.restore();
  } else if (p === "ball") {
    g.beginPath(); g.arc(-46, -112, 10, 0, Math.PI * 2); outlined(g, "#c8102e", 3);
    g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.arc(-46, -112, 6, -0.6, 0.6); g.stroke();
  } else if (p === "gloves") {
    for (const [x, y] of [[-46, -100], [42, 22]]) { g.beginPath(); g.ellipse(x, y, 15, 13, 0, 0, Math.PI * 2); outlined(g, "#f2f2f2", 3); }
  } else if (p === "spear") {
    limb(g, [-46, -60, -46, -160], "#8a5a2b", 5);
    g.beginPath(); g.moveTo(-46, -176); g.lineTo(-54, -156); g.lineTo(-38, -156); g.closePath(); outlined(g, "#d9dee6", 3);
  } else if (p === "shield") {
    g.beginPath(); g.arc(46, 14, 26, 0, Math.PI * 2); outlined(g, "#b0703a");
    g.beginPath(); g.arc(46, 14, 8, 0, Math.PI * 2); outlined(g, "#d4af60", 3);
  } else if (p === "bow") {
    g.beginPath();
    g.arc(-46, -100, 44, Math.PI * 0.62, Math.PI * 1.38);
    g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
    g.lineWidth = 5; g.strokeStyle = "#8a5a2b"; g.stroke();
    g.beginPath();
    g.moveTo(-46 + 44 * Math.cos(Math.PI * 0.62), -100 + 44 * Math.sin(Math.PI * 0.62));
    g.lineTo(-46 + 44 * Math.cos(Math.PI * 1.38), -100 + 44 * Math.sin(Math.PI * 1.38));
    g.lineWidth = 1.5; g.strokeStyle = "#f4f4f4"; g.stroke();
  }
}

export function eyes(g: CanvasRenderingContext2D, color = INK, y = -72) {
  g.fillStyle = color;
  for (const x of [-11, 11]) {
    g.beginPath();
    g.ellipse(x, y, 4, 5, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Determined brows.
  g.lineWidth = 3;
  g.strokeStyle = INK;
  g.beginPath();
  g.moveTo(-17, y - 10); g.lineTo(-5, y - 6);
  g.moveTo(17, y - 10); g.lineTo(5, y - 6);
  g.stroke();
}

function head(g: CanvasRenderingContext2D, h: Hero, accent: string) {
  const face = () => { g.beginPath(); g.arc(0, -72, 30, 0, Math.PI * 2); };
  if (typeof h.head === "function") {
    face(); outlined(g, h.skin);
    h.head(g, h, accent);
    return;
  }
  switch (h.head) {
    case "robot": {
      rounded(g, -30, -104, 60, 58, 12);
      outlined(g, h.skin);
      rounded(g, -22, -84, 44, 14, 7);
      outlined(g, INK, 2);
      g.fillStyle = accent;
      g.fillRect(-18, -80, 36, 6);
      limb(g, [0, -104, 0, -120], "#8f9aa6", 4);
      g.beginPath(); g.arc(0, -124, 6, 0, Math.PI * 2); outlined(g, accent, 2);
      return;
    }
    case "visor": {
      face(); outlined(g, accent);
      g.beginPath();
      g.moveTo(-24, -80); g.lineTo(24, -80); g.lineTo(18, -62); g.lineTo(6, -62); g.lineTo(0, -52); g.lineTo(-6, -62); g.lineTo(-18, -62);
      g.closePath();
      outlined(g, INK, 2);
      g.beginPath(); g.arc(0, -72, 30, Math.PI * 1.15, Math.PI * 1.45); g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke();
      return;
    }
    case "luchador": {
      face(); outlined(g, accent);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 4, -78); g.quadraticCurveTo(s * 26, -92, s * 24, -66); g.quadraticCurveTo(s * 12, -64, s * 4, -78);
        outlined(g, "#f4f4f4", 2);
        g.beginPath(); g.ellipse(s * 14, -74, 4, 4, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
      }
      g.beginPath(); g.moveTo(0, -102); g.lineTo(-6, -84); g.lineTo(6, -84); g.closePath(); outlined(g, "#d4af60", 2);
      g.beginPath(); g.ellipse(0, -52, 10, 6, 0, 0, Math.PI * 2); outlined(g, h.skin, 2);
      return;
    }
  }
  face(); outlined(g, h.skin);
  switch (h.head) {
    case "headband": {
      eyes(g);
      rounded(g, -30, -96, 60, 10, 4); outlined(g, accent, 3);
      limb(g, [28, -92, 50, -100, 62, -88], accent, 6);
      break;
    }
    case "mask": {
      g.save(); face(); g.clip();
      g.fillStyle = h.suit; g.fillRect(-40, -110, 80, 30); g.fillRect(-40, -66, 80, 40);
      g.restore();
      face(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
      eyes(g, INK, -73);
      limb(g, [26, -84, 52, -92, 60, -80], accent, 5);
      break;
    }
    case "dome": {
      eyes(g);
      g.beginPath(); g.arc(0, -74, 40, 0, Math.PI * 2);
      g.fillStyle = "rgba(190,225,255,0.25)"; g.fill();
      g.lineWidth = 4; g.strokeStyle = "#e9eef7"; g.stroke();
      g.beginPath(); g.arc(0, -74, 32, Math.PI * 1.15, Math.PI * 1.4); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke();
      rounded(g, -30, -40, 60, 10, 5); outlined(g, accent, 3);
      break;
    }
    case "hat": {
      eyes(g);
      g.beginPath(); g.ellipse(0, -94, 46, 10, 0, 0, Math.PI * 2); outlined(g, "#a8844a");
      g.beginPath(); g.moveTo(-24, -94); g.quadraticCurveTo(-22, -124, 0, -122); g.quadraticCurveTo(22, -124, 24, -94); g.closePath(); outlined(g, "#a8844a");
      g.fillStyle = accent; g.fillRect(-24, -102, 48, 7);
      break;
    }
    case "kabuto": {
      eyes(g);
      g.beginPath(); g.arc(0, -78, 33, Math.PI, 0); g.lineTo(38, -70); g.lineTo(-38, -70); g.closePath(); outlined(g, h.suit);
      g.beginPath(); g.moveTo(-6, -110); g.quadraticCurveTo(-30, -130, -34, -150); g.quadraticCurveTo(-14, -128, 0, -118);
      g.quadraticCurveTo(14, -128, 34, -150); g.quadraticCurveTo(30, -130, 6, -110); g.closePath(); outlined(g, h.trim, 3);
      g.beginPath(); g.arc(0, -108, 5, 0, Math.PI * 2); outlined(g, accent, 2);
      break;
    }
    case "hood": {
      eyes(g, INK, -70);
      g.beginPath(); g.moveTo(-36, -50); g.quadraticCurveTo(-42, -112, 0, -116); g.quadraticCurveTo(42, -112, 36, -50);
      g.quadraticCurveTo(26, -90, 0, -92); g.quadraticCurveTo(-26, -90, -36, -50); outlined(g, h.suit);
      g.beginPath(); g.moveTo(-20, -58); g.lineTo(20, -58); g.lineTo(14, -46); g.lineTo(-14, -46); g.closePath(); outlined(g, accent, 2);
      break;
    }
    case "horns": {
      eyes(g);
      g.beginPath(); g.arc(0, -82, 32, Math.PI, 0); g.closePath(); outlined(g, h.trim);
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(s * 28, -92); g.quadraticCurveTo(s * 54, -100, s * 52, -128); g.quadraticCurveTo(s * 44, -106, s * 22, -102); g.closePath();
        outlined(g, "#f4ecd8", 3);
      }
      g.beginPath(); g.moveTo(-26, -62); g.quadraticCurveTo(0, -20, 26, -62); g.quadraticCurveTo(0, -48, -26, -62); outlined(g, "#c8732f", 3);
      g.fillStyle = accent; g.fillRect(-30, -88, 60, 6);
      break;
    }
  }
}

export function figureFace(f: Face, cast: Cast = ACTION): HTMLCanvasElement {
  const dark = isDarkFace(f);
  const [c, g] = base(INK);
  const fill = f.color === "wild" ? (dark ? "#3a1450" : "#1d2550") : HEX[f.color];
  rounded(g, 10, 10, W - 20, H - 20, 18);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, shade(fill, 0.15));
  grad.addColorStop(1, shade(fill, -0.35));
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  if (f.color === "wild") {
    g.globalAlpha = 0.55;
    pinwheel(g, W / 2, 150, 150, WILD_COLS(dark));
    g.globalAlpha = 1;
  }
  // Speed lines behind the hero.
  g.strokeStyle = "rgba(255,255,255,0.16)";
  g.lineWidth = 3;
  for (let i = 0; i < 18; i++) {
    const y = 30 + i * 14;
    g.beginPath();
    g.moveTo(i % 2 ? 10 : 30, y + 40);
    g.lineTo(W - (i % 3) * 20, y - 30);
    g.stroke();
  }
  g.restore();

  const i = heroIndex(f.value, cast.heroes.length);
  // Yellow would vanish on a yellow card, so its heroes wear a deeper gold.
  const accent = f.color === "wild" ? "#d4af60" : f.color === "yellow" ? "#b87f00" : shade(HEX[f.color], 0.1);
  g.save();
  g.translate(W / 2, 178);
  g.scale(0.82, 0.82);
  drawHero(g, cast.heroes[i], accent);
  g.restore();

  namePlate(g, f, cast.names[i]);
  return c;
}

/** Bottom plate with the card's value (big enough to read across the table) and a name, plus a top-left index. */
export function namePlate(g: CanvasRenderingContext2D, f: Face, name: string) {
  const fill = f.color === "wild" ? "#d4af60" : HEX[f.color];
  const sym = SYMBOL[f.value] === "W" ? "★" : SYMBOL[f.value];
  rounded(g, 26, 272, W - 52, 74, 14);
  g.fillStyle = "rgba(10,10,14,0.85)";
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = "#d4af60";
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${sym.length > 2 ? 34 : 46}px system-ui, -apple-system, Segoe UI, sans-serif`;
  g.fillStyle = f.color === "wild" ? "#ffe08a" : shade(fill, 0.35);
  g.fillText(sym, W / 2, 302);
  g.font = "700 13px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillStyle = "#f4ecd8";
  g.fillText(name.toUpperCase(), W / 2, 333);
  g.font = `900 ${sym.length > 2 ? 22 : 32}px system-ui, -apple-system, Segoe UI, sans-serif`;
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.fillStyle = "#fff";
  // Top-left index only: the plate already shows the value at the bottom.
  g.strokeText(sym, 34, 40);
  g.fillText(sym, 34, 40);
}

export function figureBack(cast: Cast = ACTION): HTMLCanvasElement {
  const [c, g] = base(INK);
  rounded(g, 10, 10, W - 20, H - 20, 18);
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, cast.back[0]);
  grad.addColorStop(1, cast.back[1]);
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = "rgba(212,175,96,0.25)";
  g.lineWidth = 10;
  for (let x = -H; x < W + H; x += 36) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke();
  }
  g.restore();
  // Five-point star badge.
  g.save();
  g.translate(W / 2, H / 2 - 10);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 34 : 84;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  outlined(g, "#d4af60", 6);
  g.restore();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#f4ecd8";
  g.font = "900 24px system-ui, -apple-system, Segoe UI, sans-serif";
  g.fillText(cast.title, W / 2, 72);
  g.fillText("WILDCARD", W / 2, H - 64);
  return c;
}
