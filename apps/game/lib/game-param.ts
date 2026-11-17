import { notFound } from "next/navigation";
import { type GameKind, isGameKind } from "@/game/party-meta";

/** The `[game]` segment of a URL, or a 404 for anything that isn't one of our games. */
export async function gameParam(params: Promise<{ game: string }>): Promise<GameKind> {
  const { game } = await params;
  if (!isGameKind(game)) notFound();
  return game;
}
