import { SignOutButton } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import { Button } from "@repo/ui";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await getSession(auth());

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-16">
      <h1 className="text-3xl font-bold">game</h1>
      {session ? (
        <div className="flex items-center justify-between gap-4">
          <p>
            Signed in as <strong>{session.user.name}</strong> ({session.user.email})
          </p>
          <SignOutButton />
        </div>
      ) : (
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
