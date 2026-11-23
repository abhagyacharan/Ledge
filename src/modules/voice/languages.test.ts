import { describe, expect, it } from "vitest";
import {
  languageNames,
  nativeWords,
  VOICE_LANGUAGES,
  voiceLanguagesSchema,
  whisperLanguage,
} from "./languages";

describe("whisperLanguage", () => {
  it("forces English only when English alone is chosen", () => {
    expect(whisperLanguage(["en"])).toBe("en");
  });
  it("forces the one other language, with or without English", () => {
    expect(whisperLanguage(["hi"])).toBe("hi");
    expect(whisperLanguage(["en", "te"])).toBe("te");
  });
  it("leaves it open for several languages", () => {
    expect(whisperLanguage(["en", "hi", "te"])).toBeNull();
    expect(whisperLanguage(["hi", "te"])).toBeNull();
    expect(whisperLanguage([])).toBeNull();
  });
});

describe("language list and schema", () => {
  it("has eleven languages with unique codes", () => {
    expect(VOICE_LANGUAGES).toHaveLength(11);
    expect(new Set(VOICE_LANGUAGES.map((l) => l.code)).size).toBe(11);
  });
  it("accepts 1 to 11 unique known codes only", () => {
    expect(voiceLanguagesSchema.safeParse(["en", "hi"]).success).toBe(true);
    expect(voiceLanguagesSchema.safeParse([]).success).toBe(false);
    expect(voiceLanguagesSchema.safeParse(["en", "en"]).success).toBe(false);
    expect(voiceLanguagesSchema.safeParse(["xx"]).success).toBe(false);
    expect(voiceLanguagesSchema.safeParse(VOICE_LANGUAGES.map((l) => l.code)).success).toBe(true);
  });
  it("names languages in English and native script", () => {
    expect(languageNames(["en", "te", "zz"])).toEqual(["English", "Telugu"]);
    expect(nativeWords(["en", "te"])).toEqual(["తెలుగు"]);
  });
});
