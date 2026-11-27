"use client";

import { Button, Input, Label } from "@repo/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";
import { authClient } from "./client.ts";

type Mode = "signin" | "signup";

/** Auth page: the app's brand panel on the left (hidden on phones), the form on the right. No panel: just the centred form. */
export function AuthLayout({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <main className={`grid min-h-dvh bg-background text-foreground ${aside ? "lg:grid-cols-[1.1fr_1fr]" : ""}`}>
      {aside && <aside className="relative hidden overflow-hidden lg:flex">{aside}</aside>}
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">{children}</section>
    </main>
  );
}

function Spinner() {
  return <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

export function AuthForm({
  mode,
  google,
  allowSignup = true,
  title,
  subtitle,
  header,
}: {
  mode: Mode;
  google: boolean;
  allowSignup?: boolean;
  title?: string;
  subtitle?: string;
  /** Shown above the title, e.g. the app's logo on phones where the brand panel is hidden. */
  header?: ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"form" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const signin = mode === "signin";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    setPending("form");
    setError(null);
    const result = signin
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ email, password, name: String(form.get("name")).trim() });
    if (result.error) {
      setPending(null);
      setError(result.error.message ?? "Something went wrong. Try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-7">
      {header}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{title ?? (signin ? "Welcome back" : "Create your account")}</h1>
        <p className="text-sm text-muted-foreground">{subtitle ?? (signin ? "Sign in to continue." : "It takes less than a minute.")}</p>
      </div>

      {google && (
        <div className="space-y-5">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full text-[15px]"
            disabled={pending !== null}
            onClick={() => {
              setPending("google");
              void authClient.signIn.social({ provider: "google", callbackURL: "/" });
            }}
          >
            {pending === "google" && <Spinner />}
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {!signin && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" name="name" required minLength={2} maxLength={40} autoComplete="nickname" placeholder="What other players see" className="h-11" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" autoFocus={signin} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={signin ? "current-password" : "new-password"}
              aria-describedby={signin ? undefined : "password-hint"}
              className="h-11 pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {!signin && <p id="password-hint" className="text-xs text-muted-foreground">At least 8 characters.</p>}
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-red-400/40 dark:text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" className="h-11 w-full text-[15px] font-semibold" disabled={pending !== null}>
          {pending === "form" && <Spinner />}
          {pending === "form" ? (signin ? "Signing in..." : "Creating account...") : signin ? "Sign in" : "Create account"}
        </Button>
      </form>

      {allowSignup && (
        <p className="text-center text-sm text-muted-foreground">
          {signin ? "New here? " : "Already have an account? "}
          <Link href={signin ? "/signup" : "/signin"} className="font-semibold text-foreground underline-offset-4 hover:underline">
            {signin ? "Create an account" : "Sign in"}
          </Link>
        </p>
      )}
    </div>
  );
}

/** Play without an account. The guest is kept by the session cookie for later games. */
export function GuestForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("guestName")).trim();
    setPending(true);
    setError(null);
    const result = await authClient.signIn.anonymous();
    const named = !result.error && name ? await authClient.updateUser({ name }) : null;
    const failed = result.error ?? named?.error;
    if (failed) {
      setPending(false);
      setError(failed.message ?? "Something went wrong. Try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 rounded-xl border border-border p-4">
      <div className="space-y-1">
        <Label htmlFor="guestName">Just want to play?</Label>
        <p className="text-xs text-muted-foreground">No account needed. This browser remembers you for next time.</p>
      </div>
      <Input id="guestName" name="guestName" minLength={2} maxLength={40} autoComplete="nickname" placeholder="Your name (optional)" className="h-11" />
      {error && <p role="alert" className="text-sm text-destructive dark:text-red-300">{error}</p>}
      <Button type="submit" variant="outline" className="h-11 w-full text-[15px] font-semibold" disabled={pending}>
        {pending && <Spinner />}
        Play as guest
      </Button>
    </form>
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
