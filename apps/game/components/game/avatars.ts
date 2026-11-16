// Avatar pictures for seat tags and the lobby picker, drawn once per id and cached as data URLs.
import type { AvatarId } from "@/game/help";
import { bow, tiger, twinFish } from "./card-emblems";
import { drawActionHero } from "./card-figures";
import { lotus } from "./card-themes";

const cache = new Map<string, string>();
const EMBLEMS = { bow, tiger, fish: twinFish, lotus } as const;

export function avatarUrl(id: AvatarId | string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d")!;
  g.beginPath();
  g.arc(48, 48, 46, 0, Math.PI * 2);
  g.fillStyle = "#1d150e";
  g.fill();
  g.save();
  g.clip();
  if (id.startsWith("hero")) {
    // Head and shoulders: the figure's head sits at about y = -72 in its own coordinates.
    g.translate(48, 112);
    g.scale(0.78, 0.78);
    drawActionHero(g, Number(id.slice(4)));
  } else if (id in EMBLEMS) {
    EMBLEMS[id as keyof typeof EMBLEMS](g, 48, 48, 0.5, "#3a0812");
  }
  g.restore();
  g.beginPath();
  g.arc(48, 48, 45, 0, Math.PI * 2);
  g.lineWidth = 3;
  g.strokeStyle = "#d4af60";
  g.stroke();
  const url = c.toDataURL();
  cache.set(id, url);
  return url;
}
