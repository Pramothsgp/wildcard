import { requireSession } from "@repo/auth/next";
import { notFound } from "next/navigation";
import { GameClient } from "@/components/game/game-client";
import { auth } from "@/lib/auth";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  await requireSession(auth());
  const { code } = await params;
  if (!/^[A-Z0-9]{5}$/i.test(code)) notFound();
  return <GameClient code={code.toUpperCase()} />;
}
