"use client";
// Your name, with a button to change it. Works for guests and accounts alike; the server checks it
// (2 to 40 characters) and the table you're sitting at picks up the new name straight away.
import { authClient } from "@repo/auth/client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { send } from "@/lib/socket";

const field = "min-w-0 rounded-lg bg-white/10 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-amber-300";
const btn = "rounded-lg px-2.5 py-1 text-xs font-bold transition disabled:opacity-40";

export function NameEdit({ name, guest = false }: { name: string; guest?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    const next = value.trim().replace(/\s+/g, " ");
    if (next === name) return setEditing(false);
    setBusy(true);
    const r = await authClient.updateUser({ name: next });
    setBusy(false);
    if (r.error) return setError(r.error.message ?? "Couldn't change your name. Try again.");
    setError(null);
    setEditing(false);
    send({ t: "rename" });
    router.refresh();
  }

  if (!editing) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-sm text-white/70">
        <span>Playing as <b className="text-white">{name}</b>{guest ? " (guest)" : ""}</span>
        <button type="button" className={`${btn} bg-white/10 text-white hover:bg-white/20`} onClick={() => { setValue(name); setEditing(true); }}>
          Change name
        </button>
      </span>
    );
  }
  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2">
      <input autoFocus aria-label="Your name" value={value} minLength={2} maxLength={40} required onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)} className={field} />
      <button type="submit" disabled={busy || value.trim().length < 2} className={`${btn} bg-amber-400 text-black hover:bg-amber-300`}>{busy ? "Saving..." : "Save"}</button>
      <button type="button" className={`${btn} bg-white/10 text-white hover:bg-white/20`} onClick={() => setEditing(false)}>Cancel</button>
      {error && <span role="alert" className="w-full text-xs text-red-300">{error}</span>}
    </form>
  );
}
