// Themed card art: Hero Squad (comic book) and the Tamil temple themes (gold, kolam, an emblem).
// Original drawings on a canvas, no images, characters or logos from anyone else.
import { type Face, SYMBOL } from "@/game/cards";
import { H, HEX, W, WILD_COLS, base, isDarkFace, pinwheel, repaintLater, rounded, shade, underline } from "./card-art";

const SANS = "system-ui, -apple-system, Segoe UI, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

function corners(g: CanvasRenderingContext2D, label: string, draw: (label: string, size: number) => void) {
  for (const [x, y, rot] of [[38, 46, 0], [W - 38, H - 46, Math.PI]] as const) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    draw(label, label.length > 2 ? 28 : 44);
    g.restore();
  }
}

function centreText(g: CanvasRenderingContext2D, sym: string, font: (px: number) => string, y = H / 2 + 4) {
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = font(sym.length > 2 ? 58 : sym.length > 1 ? 78 : 104);
  g.strokeText(sym, W / 2, y);
  g.fillText(sym, W / 2, y);
}

// ---------- Hero Squad: comic panel, speed burst, halftone dots and a shield badge ----------

function shieldPath(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  g.beginPath();
  g.moveTo(cx - w / 2, cy - h / 2);
  g.lineTo(cx + w / 2, cy - h / 2);
  g.lineTo(cx + w / 2, cy);
  g.quadraticCurveTo(cx + w / 2, cy + h * 0.35, cx, cy + h / 2);
  g.quadraticCurveTo(cx - w / 2, cy + h * 0.35, cx - w / 2, cy);
  g.closePath();
}

function burst(g: CanvasRenderingContext2D, color: string, alpha: number) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  const cx = W / 2;
  const cy = H / 2;
  for (let i = 0; i < 24; i += 2) {
    const a = (i / 24) * Math.PI * 2;
    const b = ((i + 1) / 24) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * 400, cy + Math.sin(a) * 400);
    g.lineTo(cx + Math.cos(b) * 400, cy + Math.sin(b) * 400);
    g.fill();
  }
  g.restore();
}

function halftone(g: CanvasRenderingContext2D, color: string, alpha: number) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  for (let y = 0; y < H; y += 12) {
    for (let x = (y / 12) % 2 ? 6 : 0; x < W; x += 12) {
      // Dots grow toward the bottom-right corner, like a printed comic.
      const r = 1 + 2.6 * ((x / W + y / H) / 2);
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

export function heroFace(f: Face): HTMLCanvasElement {
  const dark = isDarkFace(f);
  const [c, g] = base("#0d0d10");
  const fill = HEX[f.color];
  rounded(g, 10, 10, W - 20, H - 20, 18);
  g.fillStyle = f.color === "wild" ? (dark ? "#2a0f2e" : "#1b1f3a") : fill;
  g.fill();
  g.save();
  g.clip();
  burst(g, "#fff", 0.14);
  halftone(g, "#000", 0.18);
  g.restore();
  g.lineWidth = 5;
  g.strokeStyle = "#0d0d10";
  rounded(g, 10, 10, W - 20, H - 20, 18);
  g.stroke();

  const cx = W / 2;
  const cy = H / 2;
  shieldPath(g, cx, cy, 168, 196);
  g.fillStyle = dark ? "#16161c" : "#fffaf0";
  g.fill();
  if (f.color === "wild") {
    g.save();
    g.clip();
    pinwheel(g, cx, cy, 140, WILD_COLS(dark));
    g.restore();
  }
  g.lineWidth = 9;
  g.strokeStyle = "#0d0d10";
  g.stroke();
  shieldPath(g, cx, cy, 140, 168);
  g.lineWidth = 4;
  g.strokeStyle = f.color === "wild" ? "#fff" : shade(fill, -0.2);
  g.stroke();

  const sym = SYMBOL[f.value];
  g.lineWidth = 10;
  g.lineJoin = "round";
  g.strokeStyle = "#0d0d10";
  g.fillStyle = f.color === "wild" ? "#ffe14d" : fill;
  if (sym === "W") drawBolt(g, cx, cy, 1, "#ffe14d");
  else {
    centreText(g, sym, (px) => `italic 900 ${px}px ${SANS}`, cy - 6);
    if (sym === "6" || sym === "9") underline(g, cx, cy + 46, g.fillStyle as string);
  }

  g.fillStyle = "#fff";
  g.strokeStyle = "#0d0d10";
  g.lineWidth = 7;
  corners(g, sym === "W" ? "★" : sym, (label, px) => {
    g.font = `italic 900 ${px}px ${SANS}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.strokeText(label, 0, 0);
    g.fillText(label, 0, 0);
  });
  return c;
}

function drawBolt(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(14, -78);
  g.lineTo(-38, 8);
  g.lineTo(-4, 8);
  g.lineTo(-16, 78);
  g.lineTo(40, -14);
  g.lineTo(6, -14);
  g.closePath();
  g.fillStyle = color;
  g.lineWidth = 8;
  g.strokeStyle = "#0d0d10";
  g.stroke();
  g.fill();
  g.restore();
}

export function heroBack(): HTMLCanvasElement {
  const [c, g] = base("#0d0d10");
  rounded(g, 10, 10, W - 20, H - 20, 18);
  g.fillStyle = "#14215c";
  g.fill();
  g.save();
  g.clip();
  burst(g, "#d7263d", 0.75);
  halftone(g, "#000", 0.22);
  g.restore();
  g.beginPath();
  g.arc(W / 2, H / 2, 76, 0, Math.PI * 2);
  g.fillStyle = "#fffaf0";
  g.fill();
  g.lineWidth = 9;
  g.strokeStyle = "#0d0d10";
  g.stroke();
  drawBolt(g, W / 2, H / 2, 0.82, "#ffcf1f");
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `italic 900 30px ${SANS}`;
  g.lineWidth = 7;
  g.strokeStyle = "#0d0d10";
  g.fillStyle = "#ffcf1f";
  for (const [t, y] of [["WILD", 52], ["CARD", H - 52]] as const) {
    g.strokeText(t, W / 2, y);
    g.fillText(t, W / 2, y);
  }
  return c;
}

// ---------- Tamil Legends: gold frame, kolam dots and a temple arch with a kalasam ----------

export const GOLD = "#d4af60";

/** What changes between the Tamil temple themes: colours and the royal emblem. */
export type TempleStyle = {
  /** Panel colour of wild cards, light and dark side. */
  wild: [string, string];
  /** Card back gradient, centre to edge. */
  back: [string, string];
  /** Draws the emblem centred on (cx, cy), about 84 * s in radius. */
  emblem: (g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) => void;
  /** Small caption at the top of the back, e.g. "CHOLA". */
  title?: string;
  /** Public-domain photo shown in the arch on the card back (see public/cards/dynasty/CREDITS.md). */
  photo?: string;
  /** Point of the photo to centre in the arch (0..1 across and down) and how far to zoom in. */
  focus?: [number, number, number];
};

const photos = new Map<string, HTMLImageElement>();
/** Load once and share; the same element is reused by every card back. */
export function photo(url: string) {
  let img = photos.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    photos.set(url, img);
  }
  return img;
}

/** The photo, cropped to fill the arch window on a card back. */
function drawPhoto(g: CanvasRenderingContext2D, img: HTMLImageElement, style: TempleStyle) {
  const cx = W / 2;
  const cy = H / 2 - 6;
  g.save();
  archPath(g, cx, cy, 168, 236);
  g.clip();
  const [fx, fy, zoom] = style.focus ?? [0.5, 0.5, 1];
  const s = Math.max(168 / img.width, 236 / img.height) * zoom;
  const w = img.width * s;
  const h = img.height * s;
  // Centre the focus point, but never pull the photo's edge inside the window.
  const x = Math.min(cx - 84, Math.max(cx + 84 - w, cx - fx * w));
  const y = Math.min(cy - 118, Math.max(cy + 118 - h, cy - fy * h));
  g.drawImage(img, x, y, w, h);
  // A warm wash ties a black-and-white photo or an aquatint into the card's colours.
  g.fillStyle = "rgba(120,60,10,0.15)";
  g.fillRect(0, 0, W, H);
  g.restore();
  archPath(g, cx, cy, 168, 236);
  g.lineWidth = 6;
  g.strokeStyle = GOLD;
  g.stroke();
  // The emblem as a small seal at the foot of the arch.
  g.beginPath();
  g.arc(cx, cy + 108, 26, 0, Math.PI * 2);
  g.fillStyle = style.back[1];
  g.fill();
  g.lineWidth = 3;
  g.stroke();
  style.emblem(g, cx, cy + 108, 0.27, style.back[1]);
}

function kolam(g: CanvasRenderingContext2D, color: string, alpha: number) {
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 1.6;
  const step = 32;
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      g.beginPath();
      g.arc(x, y, 1.8, 0, Math.PI * 2);
      g.fill();
      // A loop around every other dot, the way a sikku kolam weaves round its grid.
      if (((x + y) / step) % 2 < 1) {
        g.beginPath();
        g.moveTo(x, y - step / 2);
        g.quadraticCurveTo(x + step / 2, y - step / 2, x + step / 2, y);
        g.quadraticCurveTo(x + step / 2, y + step / 2, x, y + step / 2);
        g.quadraticCurveTo(x - step / 2, y + step / 2, x - step / 2, y);
        g.quadraticCurveTo(x - step / 2, y - step / 2, x, y - step / 2);
        g.stroke();
      }
    }
  }
  g.restore();
}

/** Temple doorway: straight sides, a pointed arch and a kalasam finial on top. */
function archPath(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  const top = cy - h / 2 + 34;
  g.beginPath();
  g.moveTo(cx - w / 2, cy + h / 2);
  g.lineTo(cx - w / 2, top + 40);
  g.quadraticCurveTo(cx - w / 2, top - 6, cx, top - 22);
  g.quadraticCurveTo(cx + w / 2, top - 6, cx + w / 2, top + 40);
  g.lineTo(cx + w / 2, cy + h / 2);
  g.closePath();
}

function kalasam(g: CanvasRenderingContext2D, cx: number, y: number) {
  g.fillStyle = GOLD;
  g.beginPath();
  g.ellipse(cx, y, 13, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(cx - 5, y - 8);
  g.lineTo(cx, y - 30);
  g.lineTo(cx + 5, y - 8);
  g.fill();
  g.fillRect(cx - 16, y + 8, 32, 5);
}

export function legendFace(f: Face, style: TempleStyle = LEGENDS): HTMLCanvasElement {
  const dark = isDarkFace(f);
  const [c, g] = base(GOLD);
  const fill = HEX[f.color];
  rounded(g, 9, 9, W - 18, H - 18, 18);
  const col = f.color === "wild" ? style.wild[dark ? 1 : 0] : fill;
  const grad = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, H * 0.62);
  grad.addColorStop(0, shade(col, 0.08));
  grad.addColorStop(1, shade(col, -0.45));
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  kolam(g, "#fff3d6", 0.22);
  g.restore();
  rounded(g, 20, 20, W - 40, H - 40, 12);
  g.lineWidth = 2;
  g.strokeStyle = GOLD;
  g.stroke();

  const cx = W / 2;
  const cy = H / 2 + 12;
  archPath(g, cx, cy, 150, 210);
  g.fillStyle = dark ? "#1a0d08" : "#fdf3dc";
  g.fill();
  if (f.color === "wild") {
    g.save();
    g.clip();
    pinwheel(g, cx, cy, 170, WILD_COLS(dark));
    g.restore();
  }
  g.lineWidth = 7;
  g.strokeStyle = GOLD;
  g.stroke();
  archPath(g, cx, cy, 128, 186);
  g.lineWidth = 2;
  g.stroke();
  kalasam(g, cx, cy - 105 + 2);

  const sym = SYMBOL[f.value];
  g.lineWidth = 6;
  g.lineJoin = "round";
  g.strokeStyle = f.color === "wild" ? "#3a0b14" : GOLD;
  g.fillStyle = f.color === "wild" ? "#fdf3dc" : shade(fill, -0.15);
  if (sym === "W") style.emblem(g, cx, cy + 10, 0.62, "#fdf3dc");
  else {
    centreText(g, sym, (px) => `700 ${px}px ${SERIF}`, cy + 12);
    if (sym === "6" || sym === "9") underline(g, cx, cy + 60, g.fillStyle as string);
  }

  g.fillStyle = "#fdf3dc";
  corners(g, sym === "W" ? "✦" : sym, (label, px) => {
    g.font = `700 ${px - 4}px ${SERIF}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, 0, 0);
  });
  return c;
}

export function lotus(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.fillStyle = color;
  g.strokeStyle = GOLD;
  g.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    g.save();
    g.rotate((i / 8) * Math.PI * 2);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(26, -40, 0, -84);
    g.quadraticCurveTo(-26, -40, 0, 0);
    g.fill();
    g.stroke();
    g.restore();
  }
  g.beginPath();
  g.arc(0, 0, 18, 0, Math.PI * 2);
  g.fillStyle = GOLD;
  g.fill();
  g.restore();
}

export function legendBack(style: TempleStyle = LEGENDS): HTMLCanvasElement {
  const [c, g] = base(GOLD);
  rounded(g, 9, 9, W - 18, H - 18, 18);
  const grad = g.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, H * 0.6);
  grad.addColorStop(0, style.back[0]);
  grad.addColorStop(1, style.back[1]);
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  kolam(g, GOLD, 0.45);
  g.restore();
  rounded(g, 20, 20, W - 40, H - 40, 12);
  g.lineWidth = 2;
  g.strokeStyle = GOLD;
  g.stroke();
  const centre = () => {
    g.beginPath();
    g.arc(W / 2, H / 2, 70, 0, Math.PI * 2);
    g.fillStyle = style.back[1];
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = GOLD;
    g.stroke();
    style.emblem(g, W / 2, H / 2, 0.72, style.back[1]);
  };
  const img = style.photo ? photo(style.photo) : null;
  if (img?.complete && img.naturalWidth) drawPhoto(g, img, style);
  else {
    centre();
    // Emblem now, photo as soon as it arrives. A failed load just keeps the emblem.
    if (img) repaintLater.set(c, img.decode().then(() => drawPhoto(g, img, style), () => {}));
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = GOLD;
  g.font = `700 22px ${SERIF}`;
  g.fillText("W I L D C A R D", W / 2, H - 46);
  if (style.title) {
    g.font = `700 18px ${SERIF}`;
    g.fillText(style.title.split("").join(" "), W / 2, 48);
  }
  return c;
}

const LEGENDS: TempleStyle = { wild: ["#4a0f1c", "#2a0a14"], back: ["#7a1626", "#3a0812"], emblem: lotus };
