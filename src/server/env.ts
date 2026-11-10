import "server-only";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((v) => v === "true");

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  ALLOW_SIGNUP: booleanString,
  TZ: z.string().default("Asia/Kolkata"),
  // Name of a request header that the proxy in front of the app sets to the visitor's address
  // (Cloudflare: "cf-connecting-ip"). Leave empty when nothing sits in front of the app.
  CLIENT_IP_HEADER: z
    .string()
    .optional()
    .transform((value) => value?.trim().toLowerCase() || undefined),
});

export type Env = z.infer<typeof schema>;

/**
 * Read fresh on every call (not cached) so flipping ALLOW_SIGNUP and restarting is the only
 * step needed, and tests can toggle it. Anything other than the literal "false" allows sign-up.
 */
export function isSignupAllowed(): boolean {
  return process.env.ALLOW_SIGNUP !== "false";
}

let cached: Env | undefined;

/** Validated environment. Throws a readable error on first access if misconfigured. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${problems}`);
  }
  cached = parsed.data;
  return cached;
}
