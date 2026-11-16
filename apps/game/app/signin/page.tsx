import { googleEnabled } from "@repo/auth";
import { AuthForm, AuthLayout } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import { redirect } from "next/navigation";
import { GameAside, Wordmark } from "@/components/auth-brand";
import { auth } from "@/lib/auth";

export default async function SignInPage() {
  if (await getSession(auth())) redirect("/");
  return (
    <AuthLayout aside={<GameAside />}>
      <AuthForm
        mode="signin"
        google={googleEnabled()}
        subtitle="Sign in to get back to your tables."
        header={<Wordmark className="block text-3xl lg:hidden" />}
      />
    </AuthLayout>
  );
}
