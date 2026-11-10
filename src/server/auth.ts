import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/config/app";
import { db } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { getEnv, isSignupAllowed } from "@/server/env";
import { ensureUserDefaults } from "@/server/user-defaults";

const env = getEnv();
const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day
  },
  advanced: {
    // UUIDs everywhere (CLAUDE.md §9). Must match the generated schema.
    database: { generateId: "uuid" },
    // `secure` cookies need HTTPS. Production is served over HTTPS via the tunnel;
    // plain-http localhost development cannot use them.
    useSecureCookies: isProduction,
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    // TODO(Phase 7): behind Cloudflare Tunnel set
    // ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } so rate limits see real client IPs.
  },
  rateLimit: {
    enabled: true, // off by default in development; keep behaviour identical everywhere
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Every new account gets its settings row and its Inbox (CLAUDE.md §5).
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
