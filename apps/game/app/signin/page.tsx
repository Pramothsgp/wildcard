import { googleEnabled, isGuest } from "@repo/auth";
import { AuthForm, AuthLayout, GuestForm } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import { redirect } from "next/navigation";
import { GameAside, Wordmark } from "@/components/auth-brand";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
  // Guests can still come here to sign in or make an account.
  const session = await getSession(auth());
  if (session && !isGuest(session.user)) redirect("/");
  return (
    <AuthLayout aside={<GameAside />}>
      <AuthForm
        mode="signin"
        google={googleEnabled()}
        subtitle="Sign in to get back to your tables."
        header={<Wordmark className="block text-3xl lg:hidden" />}
      />
      {!session && <GuestForm />}
    </AuthLayout>
  );
}
