"use client";

import { authClient } from "@repo/auth/client";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Ban or unban a user. Asks first in our own dialog, and shows any error there too. */
export function BanButton({ userId, banned }: { userId: string; banned: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setPending(true);
    setError(null);
    const { error: err } = banned
      ? await authClient.admin.unbanUser({ userId })
      : await authClient.admin.banUser({ userId });
    setPending(false);
    if (err) {
      setError(err.message ?? "Could not update the user.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant={banned ? "outline" : "destructive"} disabled={pending} onClick={() => { setError(null); setOpen(true); }}>
        {banned ? "Unban" : "Ban"}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{banned ? "Unban this user?" : "Ban this user?"}</DialogTitle>
            <DialogDescription>
              {banned
                ? "They will be able to sign in and play again."
                : "They will be signed out and can't sign in or play until you unban them."}
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant={banned ? "default" : "destructive"} disabled={pending} onClick={apply}>
              {pending ? "Saving..." : banned ? "Unban" : "Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
