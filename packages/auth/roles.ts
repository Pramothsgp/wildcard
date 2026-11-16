/**
 * Role for a user being created. Admin emails only get admin when the provider verified
 * the email (Google). An unverified sign-up with an admin email is refused, so nobody can
 * squat an admin address with a password before the real owner signs in.
 */
export function roleForNewUser(
  user: { email: string; emailVerified?: boolean | null },
  adminEmails: Set<string>,
): "admin" | "user" | "refuse" {
  if (!adminEmails.has(user.email.trim().toLowerCase())) return "user";
  return user.emailVerified ? "admin" : "refuse";
}
