"use client";
// Reactions and avatars: small social touches on top of the table.
import { useState } from "react";
import { AVATARS, REACTIONS } from "@/game/help";
import type { RoomView } from "@/game/protocol";
import { send } from "@/lib/socket";
import { avatarUrl } from "./avatars";
import { sound, type Pack } from "./sound";

/** "React" button that opens a palette of quick reactions; each shows as a bubble over your seat. */
export function ReactionBar({ pack }: { pack: Pack }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-20 left-3 z-10 flex flex-col items-start gap-2 sm:bottom-16">
      {open && (
        <div role="menu" aria-label="Reactions" className="grid max-w-[220px] grid-cols-5 gap-1 rounded-2xl border border-amber-300/25 bg-[#120d09]/90 p-2 shadow-2xl backdrop-blur-md">
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              role="menuitem"
              className={`rounded-lg px-1.5 py-1 text-amber-50 transition hover:bg-amber-300/15 ${r.length > 2 ? "col-span-5 text-left text-xs font-bold sm:col-span-5" : "text-xl"}`}
              onClick={() => {
                send({ t: "react", text: r });
                sound("react", pack);
                setOpen(false);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="rounded-xl border border-amber-300/25 bg-black/40 px-3 py-2 text-sm font-bold text-amber-50 transition hover:border-amber-300/60 hover:bg-amber-300/10"
      >
        React
      </button>
    </div>
  );
}

/** Pick the picture shown on your seat tag. */
export function AvatarPicker({ room }: { room: RoomView }) {
  const mine = room.players.find((p) => p.id === room.you)?.avatar;
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Your avatar">
      {AVATARS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={mine === id}
          aria-label={`Avatar ${id}`}
          onClick={() => send({ t: "avatar", id })}
          className={`rounded-full transition ${mine === id ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-black" : "opacity-70 hover:opacity-100"}`}
        >
          <img src={avatarUrl(id)} alt="" className="size-11 rounded-full" />
        </button>
      ))}
    </div>
  );
}
