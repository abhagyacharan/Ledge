import { z } from "zod";

/**
 * The languages voice capture can expect (docs/voice-multilingual-spec.md). Pure, so Settings,
 * the server and the tests share one list.
 */

export const VOICE_LANGUAGES = [
  { code: "en", english: "English", native: "English" },
  { code: "hi", english: "Hindi", native: "हिन्दी" },
  { code: "bn", english: "Bengali", native: "বাংলা" },
  { code: "mr", english: "Marathi", native: "मराठी" },
  { code: "te", english: "Telugu", native: "తెలుగు" },
  { code: "ta", english: "Tamil", native: "தமிழ்" },
  { code: "gu", english: "Gujarati", native: "ગુજરાતી" },
  { code: "ur", english: "Urdu", native: "اردو" },
  { code: "kn", english: "Kannada", native: "ಕನ್ನಡ" },
  { code: "or", english: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "ml", english: "Malayalam", native: "മലയാളം" },
] as const;

export type VoiceLanguageCode = (typeof VOICE_LANGUAGES)[number]["code"];

const CODES = VOICE_LANGUAGES.map((l) => l.code) as [VoiceLanguageCode, ...VoiceLanguageCode[]];

export const DEFAULT_VOICE_LANGUAGES: VoiceLanguageCode[] = ["en", "hi"];

/** One to eleven different language codes. */
export const voiceLanguagesSchema = z
  .array(z.enum(CODES))
  .min(1, "Pick at least one language.")
  .max(CODES.length)
  .refine((codes) => new Set(codes).size === codes.length, "Each language only once.");

/**
 * The language to force on Whisper: only English, or exactly one other language (with or without
 * English), forces it; anything else is left open so Whisper detects it.
 */
export function whisperLanguage(codes: readonly string[]): string | null {
  const others = [...new Set(codes)].filter((c) => c !== "en");
  if (others.length === 0) return codes.includes("en") ? "en" : null;
  return others.length === 1 ? others[0] : null;
}

/** English names for the prompt, in the order given; unknown codes are dropped. */
export function languageNames(codes: readonly string[]): string[] {
  return codes.flatMap((c) => VOICE_LANGUAGES.find((l) => l.code === c)?.english ?? []);
}

/** Native-script names of the chosen languages (not English), to nudge Whisper's spelling. */
export function nativeWords(codes: readonly string[]): string[] {
  return codes.flatMap((c) => {
    const lang = VOICE_LANGUAGES.find((l) => l.code === c);
    return lang && lang.code !== "en" ? [lang.native] : [];
  });
}
