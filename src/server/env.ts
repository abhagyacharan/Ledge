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
