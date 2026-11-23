"use client";

import { Info, Plus, X } from "lucide-react";
import { useId, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseRupees, rupeesText } from "@/modules/planner/plan-view";
import { VOICE_LANGUAGES, type VoiceLanguageCode } from "@/modules/voice/languages";
import { updatePreferencesAction } from "../actions";
import { SavedMark } from "./saved-mark";
import { ChoiceRow, ErrorLine, GroupLabel, Notice, settingsCard, Sub, Switch } from "./ui";
import { useSave } from "./use-save";

/**
 * Settings › Voice & AI (screen 9k), the part above the AI usage card: the voice capture switch
 * with its privacy line, the languages you speak (removable chips and Add), how titles are
 * written, and the rupee rate used for AI costs. `voice` is null when the server has no Groq key.
 */
export function VoiceSettings({
  voice,
}: {
  voice: {
    enabled: boolean;
    languages: string[];
    titleLanguage: "english" | "as_spoken";
  } | null;
}) {
  const switchSave = useSave();
  const langSave = useSave();
  const titleSave = useSave();
  const [on, setOn] = useState(voice?.enabled ?? false);
  const [langs, setLangs] = useState<VoiceLanguageCode[]>(
    (voice?.languages ?? ["en"]).filter((c): c is VoiceLanguageCode =>
      VOICE_LANGUAGES.some((l) => l.code === c),
    ),
  );
  const [title, setTitle] = useState(voice?.titleLanguage ?? "english");

  if (!voice) {
    return (
      <Notice icon={<Info aria-hidden />}>
        Voice capture is off on this server. It turns on once the owner adds a Groq key.
      </Notice>
    );
  }

  const byCode = new Map(VOICE_LANGUAGES.map((l) => [l.code, l]));
  const others = VOICE_LANGUAGES.filter((l) => !langs.includes(l.code));

  function setLanguages(next: VoiceLanguageCode[]) {
    const before = langs;
    langSave.save(() => updatePreferencesAction({ voiceLanguages: next }), {
      apply: () => setLangs(next),
      undo: () => setLangs(before),
    });
  }

  return (
    <>
      <div className={settingsCard}>
        <div className="flex items-start gap-3 p-4">
          <span className="min-w-0 flex-1">
            <span id="voice-label" className="flex items-center text-[15px] font-semibold">
              Voice capture
              <SavedMark at={switchSave.savedAt} />
            </span>
            <Sub className="mt-0.5">
              <span id="voice-hint">
                Hold + to speak a task or expense. The recording goes to Groq to be written out, and
                Ledge keeps only the words.
              </span>
            </Sub>
          </span>
          <Switch
            on={on}
            labelledBy="voice-label"
            describedBy="voice-hint"
            onChange={(next) =>
              switchSave.save(() => updatePreferencesAction({ voiceEnabled: next }), {
                apply: () => setOn(next),
                undo: () => setOn(!next),
              })
            }
          />
        </div>
        {switchSave.retry ? (
          <div className="px-4 pb-3">
            <ErrorLine onRetry={switchSave.retry}>Couldn&apos;t save.</ErrorLine>
          </div>
        ) : null}
      </div>

      {on ? (
        <>
          <div className="flex items-center">
            <GroupLabel id="langs-title">Languages I speak</GroupLabel>
            <SavedMark at={langSave.savedAt} />
          </div>
          <div role="group" aria-labelledby="langs-title" className="flex flex-wrap gap-2">
            {langs.map((code) => {
              const lang = byCode.get(code);
              if (!lang) return null;
              return (
                <span
                  key={code}
                  className="inline-flex h-11 items-center gap-0.5 rounded-full border border-dash-edge bg-dash-card pr-1 pl-3.5 text-[14px] font-medium"
                >
                  {lang.english}
                  <button
                    type="button"
                    aria-label={`Remove ${lang.english}`}
                    // At least one language stays.
                    disabled={langs.length === 1}
                    onClick={() => setLanguages(langs.filter((c) => c !== code))}
                    className="grid size-9 place-items-center rounded-full text-dash-ink-soft outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </span>
              );
            })}
            {others.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-1.5 rounded-full bg-dash-well px-3.5 text-[14px] font-medium outline-none hover:bg-dash-track focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Plus aria-hidden className="size-4" />
                    Add
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
                  {others.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onSelect={() => setLanguages([...langs, lang.code])}
                      className="min-h-10"
                    >
                      {lang.english}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {langSave.retry ? (
            <ErrorLine onRetry={langSave.retry}>Couldn&apos;t save.</ErrorLine>
          ) : (
            <p className="px-1 text-[13px] leading-snug text-dash-ink-soft">
              Speak these, mixed or not. Keep to the ones you use for the best hearing.
            </p>
          )}

          <div className="flex items-center">
            <GroupLabel id="titles-title">Write titles in</GroupLabel>
            <SavedMark at={titleSave.savedAt} />
          </div>
          <div role="radiogroup" aria-labelledby="titles-title" className={settingsCard}>
            {(
              [
                { value: "english", label: "English", sub: null },
                {
                  value: "as_spoken",
                  label: "The language I spoke",
                  sub: "Hindi stays Hindi, Telugu stays Telugu",
                },
              ] as const
            ).map((option) => (
              <ChoiceRow
                key={option.value}
                checked={title === option.value}
                sub={option.sub}
                onSelect={() => {
                  if (title === option.value) return;
                  const before = title;
                  titleSave.save(
                    () => updatePreferencesAction({ voiceTitleLanguage: option.value }),
                    { apply: () => setTitle(option.value), undo: () => setTitle(before) },
                  );
                }}
              >
                {option.label}
              </ChoiceRow>
            ))}
          </div>
          {titleSave.retry ? (
            <ErrorLine onRetry={titleSave.retry}>Couldn&apos;t save.</ErrorLine>
          ) : null}
        </>
      ) : null}
    </>
  );
}

/** The rupee rate under the AI usage card: only used to show AI costs in rupees. */
export function RupeeRate({ usdToInr }: { usdToInr: number }) {
  const id = useId();
  const [rate, setRate] = useState(rupeesText(usdToInr));
  const [error, setError] = useState<string | null>(null);
  const { save, savedAt, retry } = useSave();
  return (
    <div className={`${settingsCard} flex flex-col gap-1.5 p-4`}>
      <div className="flex items-center">
        <label htmlFor={id} className="text-[13px] font-medium text-dash-ink-soft">
          Rupee rate
        </label>
        <SavedMark at={savedAt} />
      </div>
      <span className="flex h-12 items-center gap-1.5 rounded-2xl bg-dash-well px-4 focus-within:ring-3 focus-within:ring-dash-accent/60">
        <span aria-hidden className="font-mono text-[14px] font-medium text-dash-ink-soft">
          ₹
        </span>
        <input
          id={id}
          value={rate}
          inputMode="decimal"
          aria-describedby={`${id}-hint`}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setRate(e.target.value);
            setError(null);
          }}
          onBlur={() => {
            const paise = parseRupees(rate);
            if (paise === null) {
              setError("Enter a rate from 1 to 1,000.");
              return;
            }
            if (paise === usdToInr) {
              setRate(rupeesText(paise));
              return;
            }
            const before = rate;
            save(() => updatePreferencesAction({ usdToInr: paise }), {
              apply: () => setRate(rupeesText(paise)),
              undo: () => setRate(before),
            });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-full w-24 bg-transparent font-mono text-base font-medium outline-none md:text-[15px]"
        />
        <span className="ml-auto text-[13px] text-dash-ink-soft">per US dollar</span>
      </span>
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      {retry ? <ErrorLine onRetry={retry}>Couldn&apos;t save.</ErrorLine> : null}
      <span id={`${id}-hint`} className="text-[12px] text-dash-ink-soft">
        Only used to show AI costs in rupees.
      </span>
    </div>
  );
}
