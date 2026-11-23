import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/config/app";
import { RESET_LINK_MINUTES, resetPasswordEmail } from "@/modules/auth/reset-email";
import { db } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { sendEmail } from "@/server/email";
import { getEnv, getGoogleConfig, isSignupAllowed } from "@/server/env";
import { ensureUserDefaults } from "@/server/user-defaults";

const env = getEnv();
const isProduction = process.env.NODE_ENV === "production";
const google = getGoogleConfig();

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  // Development only: the dev server moves to another port when 3000 is taken (3001, 3200 for the
  // e2e copy), and Better Auth refuses sign-in and sign-out ("Invalid origin") from any address
  // but BETTER_AUTH_URL. Production trusts only BETTER_AUTH_URL.
  ...(isProduction ? {} : { trustedOrigins: ["http://localhost:*", "http://127.0.0.1:*"] }),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    autoSignIn: true,
    // Forgot password (docs/auth-google-reset-spec.md). The link opens /reset-password?token=...
    // An account that only has Google gets its first password this way too.
    resetPasswordTokenExpiresIn: RESET_LINK_MINUTES * 60,
    // Whoever asked for the reset may be locking someone else out: end every other sign-in.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendEmail({ to: user.email, ...resetPasswordEmail({ name: user.name, url }) });
      } catch (error) {
        // Swallowed so the page says the same thing whether or not the email exists (no account
        // enumeration). Only the reason is logged, never the link.
        console.error("Reset email failed:", error instanceof Error ? error.message : error);
      }
    },
    // Opening the emailed link proves the address is theirs. Google links only to verified
    // accounts (account.accountLinking below), so this is how an existing account gets Google.
    onPasswordReset: async ({ user }) => {
      await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, user.id));
    },
  },
  // "Continue with Google", only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
  ...(google
    ? {
        socialProviders: {
          google: {
            clientId: google.clientId,
            clientSecret: google.clientSecret,
            prompt: "select_account" as const,
          },
        },
      }
    : {}),
  account: {
    // Google with the same email lands in the existing account (O, 2026-11-23). Better Auth does
    // this only when the local account's email is verified, so nobody can sign up with someone
    // else's address first and catch their Google sign-in (see onPasswordReset).
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day
    // Remember the signed-in user in a signed cookie for 5 minutes, so most requests skip the
    // session lookup in the database (O, 2026-11-13: every query is a round trip on a phone).
    // Cost: signing out on another device takes up to 5 minutes to reach this one.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    // UUIDs everywhere (CLAUDE.md §9). Must match the generated schema.
    database: { generateId: "uuid" },
    // `secure` cookies need HTTPS. Production is served over HTTPS via the tunnel;
    // plain-http localhost development cannot use them.
    useSecureCookies: isProduction,
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    // Behind Cloudflare Tunnel every request comes from the tunnel, so rate limits would treat all
    // visitors as one. Read the real address from the header Cloudflare sets (CLIENT_IP_HEADER).
    // Only safe because the app port is not reachable except through the tunnel (docker-compose.yml).
    ...(env.CLIENT_IP_HEADER ? { ipAddress: { ipAddressHeaders: [env.CLIENT_IP_HEADER] } } : {}),
  },
  rateLimit: {
    enabled: true, // off by default in development; keep behaviour identical everywhere
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/sign-in/social": { window: 60, max: 10 },
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // ALLOW_SIGNUP=false also stops Google from creating accounts (O, 2026-11-23). The coded
        // error reaches the sign-in page as ?error=signup_disabled.
        before: async () => {
          if (!isSignupAllowed()) {
            throw new APIError("FORBIDDEN", {
              code: "signup_disabled",
              message: "Sign-ups are closed.",
            });
          }
        },
        // Every new account gets its settings row and its default list, General (CLAUDE.md §5).
        after: async (createdUser) => {
          await ensureUserDefaults(createdUser.id);
        },
      },
    },
  },
  hooks: {
    // ALLOW_SIGNUP is enforced here on the server, not only by hiding the UI.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && !isSignupAllowed()) {
        throw new APIError("FORBIDDEN", { message: "Sign-ups are closed." });
      }
    }),
  },
  plugins: [nextCookies()], // must stay last
});

export type Auth = typeof auth;
