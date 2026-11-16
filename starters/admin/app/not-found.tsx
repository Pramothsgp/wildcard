import { SignOutButton } from "@repo/auth/components";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-muted-foreground">This page doesn&apos;t exist or you don&apos;t have access.</p>
      <SignOutButton />
    </main>
  );
}
