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

async function call(config: VoiceConfig, path: string, init: RequestInit): Promise<unknown> {
  if (!config.apiKey) throw new GroqError("unavailable", "No Groq API key");
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${config.apiKey}`, ...init.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new GroqError("unavailable", "Groq did not answer");
  }
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

const transcription = z.object({ text: z.string() });

/** Speech to text with Whisper. `prompt` lists words to spell right (max 224 tokens). */
export async function transcribe(
  config: VoiceConfig,
  audio: Blob,
  filename: string,
  prompt: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", config.transcribeModel);
  form.append("language", "en");
  form.append("temperature", "0");
  form.append("response_format", "json");
  if (prompt) form.append("prompt", prompt);
  const parsed = transcription.safeParse(
    await call(config, "/audio/transcriptions", { method: "POST", body: form }),
  );
  if (!parsed.success) throw new GroqError("bad_response", "Unexpected transcription reply");
  return parsed.data.text.trim();
}

const completion = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

/**
 * One chat completion with strict structured outputs. Returns the parsed JSON object; the caller
 * validates it with its own Zod schema.
 */
export async function completeJson(
  config: VoiceConfig,
  system: string,
  user: string,
  schemaName: string,
  schema: object,
): Promise<unknown> {
  const body = {
    model: config.parseModel,
    temperature: 0,
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
  const content = parsed.success ? parsed.data.choices[0]?.message.content : null;
  if (!content) throw new GroqError("bad_response", "Empty completion");
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new GroqError("bad_response", "Completion was not JSON");
  }
}
