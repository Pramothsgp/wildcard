import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { randomInt } from "node:crypto";
import { admin, anonymous } from "better-auth/plugins";
import { db } from "@repo/data";
import * as schema from "@repo/data/schema";
import { cleanName } from "./names.ts";
import { roleForNewUser } from "./roles.ts";

export { cleanName, roleForNewUser };
export { toNextJsHandler } from "better-auth/next-js";

/**
 * One auth instance per app. Env:
 *   BETTER_AUTH_URL     public URL of this app (also the only trusted origin)
 *   BETTER_AUTH_SECRET  signing secret
 *   ADMIN_EMAILS        comma-separated; these get the admin role, but only when the
 *                       email is verified (Google sign-in). Password sign-up with one is refused.
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   optional; enables "Sign in with Google"
 *
 * `guests` lets people play without an account. A guest is a normal user row (so leaderboards
 * and history work) that lives as long as its session cookie.
 */
function build(serviceName: string, guests: boolean) {
  const baseURL = process.env.BETTER_AUTH_URL;
  const adminEmails = parseEmails(process.env.ADMIN_EMAILS);
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

  return betterAuth({
    appName: serviceName,
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: baseURL ? [baseURL] : [],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    socialProviders:
      googleId && googleSecret
        ? { google: { clientId: googleId, clientSecret: googleSecret } }
        : undefined,
    plugins: [
      admin(),
      // Guest rows are kept when a guest later signs in, so their past results stay valid.
      ...(guests ? [anonymous({ emailDomainName: "guest.invalid", disableDeleteAnonymousUser: true, generateName: () => `Guest ${randomInt(1000, 10000)}` })] : []),
      nextCookies(),
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const role = roleForNewUser(user, adminEmails);
            if (role === "refuse") {
              throw new APIError("FORBIDDEN", {
                message: "This email must sign in with Google.",
              });
            }
            // A name from Google can be long or odd: shorten it rather than refuse the sign-in.
            return { data: { ...user, name: cleanName(String(user.name ?? "").trim().slice(0, 40)) ?? "Player", role } };
          },
        },
        // Anyone can change their name at any time (updateUser); the same rules apply as at sign-up.
        update: {
          before: async (user) => ({ data: "name" in user && user.name !== undefined ? { ...user, name: checkedName(user.name) } : user }),
        },
      },
    },
    // Each app on its own cookie, so two apps on one domain (e.g. localhost) don't collide.
    advanced: { cookiePrefix: serviceName },
  });
}

function checkedName(name: unknown) {
  const clean = cleanName(name);
  if (!clean) throw new APIError("BAD_REQUEST", { message: "Names are 2 to 40 characters." });
  return clean;
}

export type Auth = ReturnType<typeof build>;

const instances = new Map<string, Auth>();

/** Lazy, so `next build` works without runtime env. */
export function getAuth(serviceName: string, opts: { guests?: boolean } = {}): Auth {
  let auth = instances.get(serviceName);
  if (!auth) {
    auth = build(serviceName, opts.guests ?? false);
    instances.set(serviceName, auth);
  }
  return auth;
}

/** True for a guest (anonymous plugin). The plugin is optional per app, so its field isn't in the shared type. */
export const isGuest = (user: object) => (user as { isAnonymous?: boolean | null }).isAnonymous === true;

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function parseEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
