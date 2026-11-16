"use client";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BanButton({ userId, banned }: { userId: string; banned: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const { error } = banned
      ? await authClient.admin.unbanUser({ userId })
      : await authClient.admin.banUser({ userId });
    setPending(false);
    if (error) {
      alert(error.message ?? "Could not update the user.");
      return;
    }
    router.refresh();
  }

  return (
    <Button size="sm" variant={banned ? "outline" : "destructive"} disabled={pending} onClick={toggle}>
      {banned ? "Unban" : "Ban"}
    </Button>
  );
}
