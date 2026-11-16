// "Mythic Warriors": original warriors in Greek, Norse and Tamil style, drawn on the shared
// action-figure body with their own helmets, hair and weapons.
import { THEMES } from "@/game/themes";
import { type Cast, type HeadFn, type Hero, INK, eyes, outlined } from "./card-figures";

const BRONZE = "#b8863b";

/** Greek helmet: bronze bowl with a cheek guard and a horsehair crest in the card colour. */
const crest: HeadFn = (g, _h, accent) => {
  eyes(g);
  g.beginPath();
  g.arc(0, -76, 33, Math.PI, 0);
  g.lineTo(33, -56); g.lineTo(18, -56); g.lineTo(14, -78); g.lineTo(-14, -78); g.lineTo(-18, -56); g.lineTo(-33, -56);
  g.closePath();
  outlined(g, BRONZE);
  g.beginPath();
  g.moveTo(-34, -104); g.quadraticCurveTo(0, -140, 34, -104); g.quadraticCurveTo(0, -122, -34, -104);
  outlined(g, accent, 3);
};

const laurel: HeadFn = (g) => {
  eyes(g);
  g.fillStyle = "#3a2a1a";
  g.beginPath(); g.arc(0, -82, 30, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.05 + i * 0.1);
    g.beginPath();
    g.ellipse(Math.cos(a) * 31, -76 + Math.sin(a) * 31, 7, 3.5, a + Math.PI / 2, 0, Math.PI * 2);
    outlined(g, "#6aa84f", 2);
  }
};

const braids: HeadFn = (g, _h, accent) => {
  eyes(g);
  g.beginPath(); g.arc(0, -80, 31, Math.PI, 0); g.closePath(); outlined(g, "#e0b25a", 3);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      g.beginPath(); g.ellipse(s * 30, -64 + k * 12, 6, 7, 0, 0, Math.PI * 2); outlined(g, "#e0b25a", 2);
    }
    g.fillStyle = accent; g.fillRect(s * 30 - 5, -20, 10, 4);
  }
};

const winged: HeadFn = (g) => {
  eyes(g);
  g.beginPath(); g.arc(0, -82, 32, Math.PI, 0); g.closePath(); outlined(g, "#b8c2cc");
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * 26, -92); g.quadraticCurveTo(s * 60, -120, s * 56, -96); g.quadraticCurveTo(s * 52, -106, s * 44, -100);
    g.quadraticCurveTo(s * 50, -92, s * 30, -86); g.closePath();
    outlined(g, "#f4ecd8", 3);
  }
  g.beginPath(); g.moveTo(-26, -60); g.quadraticCurveTo(0, -24, 26, -60); g.quadraticCurveTo(0, -46, -26, -60); outlined(g, "#a0522d", 3);
};

/** Tamil warrior: a wrapped turban in the card colour and a proud moustache. */
const wrap: HeadFn = (g, _h, accent) => {
  eyes(g);
  g.beginPath(); g.ellipse(0, -96, 34, 16, 0, 0, Math.PI * 2); outlined(g, accent);
  g.lineWidth = 3; g.strokeStyle = INK;
  for (const y of [-100, -92]) { g.beginPath(); g.moveTo(-28, y + 4); g.quadraticCurveTo(0, y - 6, 28, y + 4); g.stroke(); }
  g.beginPath(); g.moveTo(-18, -56); g.quadraticCurveTo(-8, -64, 0, -58); g.quadraticCurveTo(8, -64, 18, -56); g.quadraticCurveTo(8, -58, 0, -54); g.quadraticCurveTo(-8, -58, -18, -56);
  outlined(g, INK, 2);
};

/** Tamil warrior: hair tied in a side knot, gold earrings. */
const topknot: HeadFn = (g) => {
  eyes(g);
  g.beginPath(); g.arc(0, -80, 31, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); outlined(g, "#1d1410", 3);
  g.beginPath(); g.arc(22, -108, 12, 0, Math.PI * 2); outlined(g, "#1d1410", 3);
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 31, -64, 5, 0, Math.PI * 2); outlined(g, "#d4af60", 2); }
};

const greek = { skin: "#e2b48c", suit: "#7a3b2e", trim: BRONZE };
const norse = { skin: "#f0c8a6", suit: "#4a5a6a", trim: "#8a5a2b" };
const tamil = { skin: "#9a6440", suit: "#f2e6c8", trim: "#d4af60" };
const heroes: Hero[] = [
  { ...greek, head: crest, prop: "spear" },
  { ...greek, head: laurel, prop: "bow", cape: true },
  { ...greek, head: crest, prop: "sword" },
  { ...norse, head: braids, prop: "shield" },
  { ...norse, head: winged, prop: "axe" },
  { ...norse, head: braids, prop: "spear", cape: true },
  { ...tamil, head: wrap, prop: "spear" },
  { ...tamil, head: topknot, prop: "bow" },
  { ...tamil, head: wrap, prop: "shield" },
  { ...tamil, head: topknot, prop: "sword", cape: true },
];

export const MYTHIC: Cast = { heroes, names: THEMES.mythic.bots, back: ["#5a3a14", "#1e1206"], title: "MYTHIC" };
