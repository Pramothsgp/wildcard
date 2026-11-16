import { googleEnabled } from "@repo/auth";
import { AuthForm, AuthLayout } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function SignUpPage() {
  if (await getSession(auth())) redirect("/");
  return (
    <AuthLayout>
      <AuthForm mode="signup" google={googleEnabled()} />
    </AuthLayout>
  );
}
