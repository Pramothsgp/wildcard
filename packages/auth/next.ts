import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Auth } from "./server.ts";

export async function getSession(auth: Auth) {
  return auth.api.getSession({ headers: await headers() });
}

/** Server components / actions: signed-in user or redirect to /signin. */
export async function requireSession(auth: Auth) {
  const session = await getSession(auth);
  if (!session) redirect("/signin");
  return session;
}

/** Admin-only pages: non-admins get a 404, so the page's existence isn't revealed. */
export async function requireAdmin(auth: Auth) {
  const session = await requireSession(auth);
  if (session.user.role !== "admin") notFound();
  return session;
}
