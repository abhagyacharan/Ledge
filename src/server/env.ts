import "server-only";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((v) => v === "true");

const optionalText = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);

const schema = z
  .object({
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
    // Web Push for task reminders (docs/reminders-spec.md §11): all three set, or none.
    VAPID_PUBLIC_KEY: optionalText,
    VAPID_PRIVATE_KEY: optionalText,
    VAPID_SUBJECT: optionalText,
  })
  .superRefine((value, ctx) => {
    const set = [value.VAPID_PUBLIC_KEY, value.VAPID_PRIVATE_KEY, value.VAPID_SUBJECT].filter(
      Boolean,
    );
    if (set.length !== 0 && set.length !== 3) {
      ctx.addIssue({
        code: "custom",
        path: ["VAPID_PUBLIC_KEY"],
        message:
          "Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT together, or none of them",
      });
    }
  });

export type Env = z.infer<typeof schema>;

/** Voice capture settings (docs/voice-spec.md §9). Read fresh, like ALLOW_SIGNUP. */
export type VoiceConfig = {
  /** No key and no fake mode: voice is off everywhere. */
  enabled: boolean;
  /** VOICE_FAKE=1 answers from fixtures instead of calling Groq (tests and local trials). */
  fake: boolean;
  apiKey: string | null;
  transcribeModel: string;
  parseModel: string;
  dailyLimit: number;
};

/**
 * Voice and planner requests per person per day. Each spoken command is two requests (hearing it,
 * then understanding it), so 30 is about 15 commands or planner runs a day. Kept low because sign-up
 * is open and every request is paid for on the owner's Groq key (O, 2026-11-23).
 */
export const DEFAULT_VOICE_DAILY_LIMIT = 30;

export function getVoiceConfig(): VoiceConfig {
  const apiKey = process.env.GROQ_API_KEY?.trim() || null;
  const fake = process.env.VOICE_FAKE === "1";
  const limit = Number.parseInt(process.env.VOICE_DAILY_LIMIT ?? "", 10);
  return {
    enabled: fake || apiKey !== null,
    fake,
    apiKey,
    transcribeModel: process.env.GROQ_TRANSCRIBE_MODEL?.trim() || "whisper-large-v3-turbo",
    parseModel: process.env.GROQ_PARSE_MODEL?.trim() || "openai/gpt-oss-120b",
    dailyLimit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_VOICE_DAILY_LIMIT,
  };
}

/** Web Push keys for task reminders. All three set, or reminders are off. Read fresh. */
export function getPushConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

/** "Continue with Google" (docs/auth-google-reset-spec.md). Both values set, or the button is hidden. */
export function getGoogleConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export type EmailConfig =
  /** Sends through Resend's HTTP API. */
  | { mode: "resend"; apiKey: string; from: string }
  /** Development and tests without a key: kept in memory and printed to the server console. */
  | { mode: "outbox" }
  /** Production without a key: no email, so "Forgot password?" is hidden. */
  | { mode: "off" };

/** Email for password-reset links. Read fresh, like ALLOW_SIGNUP. */
export function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (apiKey && from) return { mode: "resend", apiKey, from };
  return process.env.NODE_ENV === "production" ? { mode: "off" } : { mode: "outbox" };
}

export function isPasswordResetEnabled(): boolean {
  return getEmailConfig().mode !== "off";
}

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
