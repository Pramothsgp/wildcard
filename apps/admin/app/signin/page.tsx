import { googleEnabled } from "@repo/auth";
import { AuthForm, AuthLayout } from "@repo/auth/components";
import { getSession } from "@repo/auth/next";
import { redirect } from "next/navigation";
import { AdminAside } from "@/components/auth-brand";
import { auth } from "@/lib/auth";

// No sign-up here: admins are the verified emails in ADMIN_EMAILS (sign in with Google).
export default async function SignInPage() {
  if (await getSession(auth())) redirect("/");
  const google = googleEnabled();
  return (
    <AuthLayout aside={<AdminAside />}>
      <AuthForm
        mode="signin"
        google={google}
        allowSignup={false}
        title="Admin sign in"
        subtitle={google ? "Use the Google account with your approved admin email." : "Sign in with your admin account."}
        header={<p className="font-semibold lg:hidden">Wildcard Admin</p>}
      />
    </AuthLayout>
  );
}
