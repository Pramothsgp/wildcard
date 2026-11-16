import { googleEnabled } from "@repo/auth";
import { AuthForm } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// No sign-up here: admins are the verified emails in ADMIN_EMAILS (sign in with Google).
export default async function SignInPage() {
  if (await getSession(auth())) redirect("/");
  return <AuthForm mode="signin" google={googleEnabled()} allowSignup={false} />;
}
