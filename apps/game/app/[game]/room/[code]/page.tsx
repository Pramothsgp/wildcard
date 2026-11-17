import { requireSession } from "@repo/auth/next";
import { notFound } from "next/navigation";
import { GameClient } from "@/components/game/game-client";
import { auth } from "@/lib/auth";
import { gameParam } from "@/lib/game-param";

export default async function RoomPage({ params }: { params: Promise<{ game: string; code: string }> }) {
  await requireSession(auth());
  const kind = await gameParam(params);
  const { code } = await params;
  if (!/^[A-Z0-9]{5}$/i.test(code)) notFound();
  return <GameClient code={code.toUpperCase()} kind={kind} />;
}
