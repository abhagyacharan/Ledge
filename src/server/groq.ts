import "server-only";
import { z } from "zod";
import type { VoiceConfig } from "@/server/env";

/**
 * A tiny client for Groq's OpenAI-compatible API (docs/voice-spec.md §5, §6), with plain fetch
 * and Zod instead of an SDK (CLAUDE.md §2 item 5). It never logs audio, words or keys.
 */

const BASE = "https://api.groq.com/openai/v1";
const TIMEOUT_MS = 15_000;

export type GroqErrorKind = "unavailable" | "rate_limited" | "bad_response";

export class GroqError extends Error {
  constructor(
    readonly kind: GroqErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GroqError";
  }
}

/** Groq's "try again in N" for a rate limit: retry-after (seconds) or x-ratelimit-reset-tokens ("1.5s", "577ms"). */
function waitFor(response: Response): number | null {
  const after = Number(response.headers.get("retry-after"));
  if (Number.isFinite(after) && after > 0) return after * 1000;
  const reset = response.headers.get("x-ratelimit-reset-tokens") ?? "";
  const match = /^(?:(\d+)m)?(?:([\d.]+)s)?(?:([\d.]+)ms)?$/.exec(reset);
  if (!match || !reset) return null;
  return Number(match[1] ?? 0) * 60_000 + Number(match[2] ?? 0) * 1000 + Number(match[3] ?? 0);
}

/** A rate-limit wait up to this long is sat out once instead of failing. */
const MAX_WAIT_MS = 10_000;
/** Used when Groq rate-limits without saying how long to wait. */
const NO_HINT_WAIT_MS = 3_000;

async function call(config: VoiceConfig, path: string, init: RequestInit): Promise<unknown> {
  if (!config.apiKey) throw new GroqError("unavailable", "No Groq API key");
  let response: Response | null = null;
  // Two tries: a dropped first connection, or a short rate-limit wait, gets one more go.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(`${BASE}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${config.apiKey}`, ...init.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      // Only the error's name and code go in the log (never the request, which holds the key).
      const cause = error instanceof Error ? error.cause : undefined;
      const code =
        cause && typeof cause === "object" && "code" in cause ? String(cause.code) : undefined;
      const name = error instanceof Error ? error.name : "unknown";
      if (attempt === 0 && name !== "TimeoutError") continue;
      throw new GroqError(
        "unavailable",
        `Groq did not answer (${[name, code].filter(Boolean).join(" ")})`,
      );
    }
    if (response.status !== 429 || attempt === 1) break;
    // Groq gave a wait: sit it out if it is short. No wait given: try again after a short pause.
    const wait = waitFor(response) ?? NO_HINT_WAIT_MS;
    if (wait > MAX_WAIT_MS) break;
    await new Promise((resolve) => setTimeout(resolve, wait + 250));
  }
  if (!response) throw new GroqError("unavailable", "Groq did not answer");
  if (response.status === 429) throw new GroqError("rate_limited", "Groq rate limit");
  if (!response.ok) {
    // The body can echo the request; keep only the status in logs.
    throw new GroqError("unavailable", `Groq answered ${response.status}`);
  }
  try {
    return await response.json();
  } catch {
    throw new GroqError("bad_response", "Groq sent something that is not JSON");
  }
}

const transcription = z.object({ text: z.string(), duration: z.number().optional() });

export type TranscribeResult = { text: string; audioSeconds: number; model: string };

/** Speech to text with Whisper. `prompt` lists words to spell right (max 224 tokens). */
export async function transcribe(
  config: VoiceConfig,
  audio: Blob,
  filename: string,
  prompt: string,
  /** ISO 639-1 code to force, or null to let Whisper detect the language. */
  language: string | null,
): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", config.transcribeModel);
  if (language) form.append("language", language);
  form.append("temperature", "0");
  // verbose_json also returns the length of the audio, which is what Whisper is billed by.
  form.append("response_format", "verbose_json");
  if (prompt) form.append("prompt", prompt);
  const parsed = transcription.safeParse(
    await call(config, "/audio/transcriptions", { method: "POST", body: form }),
  );
  if (!parsed.success) throw new GroqError("bad_response", "Unexpected transcription reply");
  return {
    text: parsed.data.text.trim(),
    audioSeconds: Math.max(0, Math.round(parsed.data.duration ?? 0)),
    model: config.transcribeModel,
  };
}

const completion = z.object({
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).optional(),
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

/** What one chat completion used, for the usage table (counts only). */
export type CompletionUsage = { model: string; inputTokens: number; outputTokens: number };

/**
 * One chat completion with strict structured outputs. Returns the parsed JSON object, which the
 * caller validates with its own Zod schema, and the tokens used.
 */
export async function completeJson(
  config: VoiceConfig,
  system: string,
  user: string,
  schemaName: string,
  schema: object,
): Promise<{ data: unknown; usage: CompletionUsage }> {
  const body = {
    model: config.parseModel,
    temperature: 0,
    // The gpt-oss models think before answering; short commands need little, and every thinking
    // token counts against the free plan's 8,000 tokens a minute.
    reasoning_effort: "low",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: schemaName, strict: true, schema },
    },
  };
  const parsed = completion.safeParse(
    await call(config, "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const counted = parsed.success ? parsed.data.usage : undefined;
  const usage: CompletionUsage = {
    model: config.parseModel,
    inputTokens: counted?.prompt_tokens ?? 0,
    outputTokens: counted?.completion_tokens ?? 0,
  };
  if (counted && process.env.NODE_ENV !== "production") {
    console.info(`Groq: ${usage.inputTokens} + ${usage.outputTokens} tokens`);
  }
  const content = parsed.success ? parsed.data.choices[0]?.message.content : null;
  if (!content) throw new GroqError("bad_response", "Empty completion");
  try {
    return { data: JSON.parse(content) as unknown, usage };
  } catch {
    throw new GroqError("bad_response", "Completion was not JSON");
  }
}
