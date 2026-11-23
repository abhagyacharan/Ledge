import "server-only";
import { addDaysIso, todayIn } from "@/lib/dates";
import { minorToInput } from "@/lib/money";
import { fakeReply, FAKE_TRANSCRIPT } from "@/modules/voice/fake";
import { VOICE_JSON_SCHEMA } from "@/modules/voice/json-schema";
import {
  buildUserMessage,
  buildWhisperPrompt,
  type PromptEmi,
  VOICE_SYSTEM_PROMPT,
} from "@/modules/voice/prompt";
import { languageNames, whisperLanguage } from "@/modules/voice/languages";
import { resolvePlan, type ResolveEmi, unclearPlan } from "@/modules/voice/resolve";
import { modelReply, type VoicePlan } from "@/modules/voice/schema";
import { recordAiUsage } from "@/server/data/ai-usage";
import { frequentEntryTitles, listUnpaidEmis } from "@/server/data/finance";
import { listLists } from "@/server/data/lists";
import { getUserSettings } from "@/server/data/settings";
import { getVoiceConfig, type VoiceConfig } from "@/server/env";
import { completeJson, GroqError, transcribe } from "@/server/groq";
import { takeVoiceRequest } from "@/server/voice-limit";

/**
 * Voice capture on the server (docs/voice-spec.md §5, §6, §9): checks that voice is allowed for
 * this user, builds the context, calls Groq (or the fake), and resolves the reply into a plan.
 * Nothing here saves; nothing here logs audio or words.
 */

export type VoiceFailure =
  "off" | "limit_minute" | "limit_day" | "unavailable" | "rate_limited" | "empty";

export const VOICE_MESSAGES: Record<VoiceFailure, string> = {
  off: "Voice capture is off.",
  limit_minute: "That's a lot of voice in a minute. Wait a moment, or type it.",
  limit_day: "That's a lot of voice today. Try again tomorrow, or type it.",
  unavailable: "Voice is unavailable right now. Type it instead.",
  rate_limited: "Voice is busy right now. Try again in a minute, or type it.",
  empty: "Didn't catch that. Hold the button and speak.",
};

export type VoiceOutcome<T> = { ok: true; data: T } | { ok: false; failure: VoiceFailure };

/** Checks the switch and the limit, and returns the config to use. */
async function admit(userId: string): Promise<VoiceOutcome<VoiceConfig>> {
  const config = getVoiceConfig();
  if (!config.enabled) return { ok: false, failure: "off" };
  const settings = await getUserSettings(userId);
  if (!settings.voiceEnabled) return { ok: false, failure: "off" };
  const taken = takeVoiceRequest(userId, config.dailyLimit);
  if (!taken.ok)
    return { ok: false, failure: taken.reason === "day" ? "limit_day" : "limit_minute" };
  return { ok: true, data: config };
}

function fromGroq(error: unknown): VoiceFailure {
  if (error instanceof GroqError) {
    if (error.kind === "rate_limited") return "rate_limited";
    console.error(`Voice: Groq ${error.kind}: ${error.message}`);
    return "unavailable";
  }
  console.error("Voice: unexpected failure");
  return "unavailable";
}

/** Is voice usable for this user right now (for showing or hiding the buttons)? */
export async function voiceAvailable(userId: string): Promise<boolean> {
  if (!getVoiceConfig().enabled) return false;
  const settings = await getUserSettings(userId);
  return settings.voiceEnabled;
}

export async function transcribeForUser(
  userId: string,
  audio: Blob,
  filename: string,
): Promise<VoiceOutcome<string>> {
  const admitted = await admit(userId);
  if (!admitted.ok) return admitted;
  const config = admitted.data;
  if (config.fake) {
    await recordAiUsage(userId, { feature: "voice_transcribe", model: "fake" });
    return { ok: true, data: FAKE_TRANSCRIPT };
  }
  try {
    const [lists, titles, settings] = await Promise.all([
      listLists(userId),
      frequentEntryTitles(userId),
      getUserSettings(userId),
    ]);
    const heard = await transcribe(
      config,
      audio,
      filename,
      buildWhisperPrompt(
        lists.map((l) => l.name),
        titles,
        settings.voiceLanguages,
      ),
      whisperLanguage(settings.voiceLanguages),
    );
    await recordAiUsage(userId, {
      feature: "voice_transcribe",
      model: heard.model,
      audioSeconds: heard.audioSeconds,
    });
    return heard.text ? { ok: true, data: heard.text } : { ok: false, failure: "empty" };
  } catch (error) {
    return { ok: false, failure: fromGroq(error) };
  }
}

export async function understandForUser(
  userId: string,
  transcript: string,
  lastPaymentMethod: string | null,
): Promise<VoiceOutcome<VoicePlan>> {
  const admitted = await admit(userId);
  if (!admitted.ok) return admitted;
  const config = admitted.data;

  const settings = await getUserSettings(userId);
  const today = todayIn(settings.timezone);
  const [lists, unpaid] = await Promise.all([
    listLists(userId),
    listUnpaidEmis(userId, addDaysIso(today, -60), addDaysIso(today, 45)),
  ]);
  const emis: ResolveEmi[] = unpaid.map((e, i) => ({
    ref: `E${i + 1}`,
    id: e.id,
    title: e.title,
    category: e.category,
    amountMinor: e.amountMinor,
    entryDate: e.entryDate,
  }));
  const promptEmis: PromptEmi[] = emis.map((e) => ({
    ref: e.ref,
    title: e.title,
    category: e.category,
    amount: minorToInput(e.amountMinor, settings.currency),
    dueDate: e.entryDate,
  }));
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${today}T00:00:00Z`),
  );

  let raw: unknown;
  if (config.fake) {
    raw = fakeReply(transcript, today, promptEmis);
    await recordAiUsage(userId, { feature: "voice_understand", model: "fake" });
  } else {
    try {
      const completed = await completeJson(
        config,
        VOICE_SYSTEM_PROMPT,
        buildUserMessage(
          {
            today,
            weekday,
            timeZone: settings.timezone,
            currency: settings.currency,
            lists: lists.map((l) => l.name),
            emis: promptEmis,
            languages: languageNames(settings.voiceLanguages),
            titleLanguage: settings.voiceTitleLanguage,
          },
          transcript,
        ),
        "ledge_voice_actions",
        VOICE_JSON_SCHEMA,
      );
      raw = completed.data;
      await recordAiUsage(userId, {
        feature: "voice_understand",
        model: completed.usage.model,
        inputTokens: completed.usage.inputTokens,
        outputTokens: completed.usage.outputTokens,
      });
    } catch (error) {
      const failure = fromGroq(error);
      if (failure !== "unavailable") return { ok: false, failure };
      // Keep the words: the sheet offers them for typing instead.
      return {
        ok: true,
        data: { transcript, items: unclearPlan(transcript, VOICE_MESSAGES.unavailable), emis: [] },
      };
    }
  }

  const reply = modelReply.safeParse(raw);
  const items = reply.success
    ? resolvePlan(reply.data, {
        today,
        currency: settings.currency,
        locale: settings.locale,
        lists: lists.map((l) => ({ id: l.id, name: l.name, isInbox: l.isInbox })),
        emis,
        lastPaymentMethod,
      })
    : unclearPlan(transcript, "Couldn't work out what to add");

  return {
    ok: true,
    data: {
      transcript,
      items: items.length > 0 ? items : unclearPlan(transcript, "Nothing to add was found"),
      emis: emis.map(({ id, title, category, amountMinor, entryDate }) => ({
        id,
        title,
        category,
        amountMinor,
        entryDate,
      })),
    },
  };
}
