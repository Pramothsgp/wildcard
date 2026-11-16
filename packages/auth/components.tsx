"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@repo/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "./client.ts";

type Mode = "signin" | "signup";

export function AuthForm({
  mode,
  google,
  allowSignup = true,
}: {
  mode: Mode;
  google: boolean;
  allowSignup?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setPending(true);
    setError(null);
    const { error } =
      mode === "signin"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(form.get("name")) });
    setPending(false);
    if (error) {
      setError(error.message ?? "Something went wrong. Try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="mx-auto mt-16 w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mode === "signin" ? "Sign in" : "Create an account"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {google && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
            >
              Continue with Google
            </Button>
            <p className="text-center text-xs text-muted-foreground">or</p>
          </>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required minLength={2} autoComplete="name" />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        {allowSignup && (
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                No account? <Link href="/signup" className="underline">Sign up</Link>
              </>
            ) : (
              <>
                Have an account? <Link href="/signin" className="underline">Sign in</Link>
              </>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await authClient.signOut();
        router.push("/signin");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
