import { notFound, redirect } from "next/navigation";
import { kindOf, roomPath } from "@/game/party-meta";
import { roomMode } from "@/game/store";

/** Old /room/<code> links (shared before games had their own paths) go to the right game. */
export default async function OldRoomLink({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(code)) notFound();
  const mode = await roomMode(code);
  redirect(roomPath(mode ? kindOf(mode) : "wildcard", code));
}
