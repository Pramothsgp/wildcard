import { googleEnabled } from "@repo/auth";
import { AuthForm } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function SignUpPage() {
  if (await getSession(auth())) redirect("/");
  return <AuthForm mode="signup" google={googleEnabled()} />;
}
