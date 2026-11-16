import { googleEnabled } from "@repo/auth";
import { AuthForm, AuthLayout } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import { redirect } from "next/navigation";
import { GameAside, Wordmark } from "@/components/auth-brand";
import { auth } from "@/lib/auth";

export default async function SignUpPage() {
  if (await getSession(auth())) redirect("/");
  return (
    <AuthLayout aside={<GameAside />}>
      <AuthForm
        mode="signup"
        google={googleEnabled()}
        subtitle="Pick a name and start playing. Your points follow you to the leaderboard."
        header={<Wordmark className="block text-3xl lg:hidden" />}
      />
    </AuthLayout>
  );
}
