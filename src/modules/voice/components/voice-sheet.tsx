"use client";

import { Keyboard, Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { DashButton } from "@/components/dash/dash-button";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/dash/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { run, undoToast } from "@/modules/todos/components/run-action";
import { useTodos } from "@/modules/todos/components/todos-provider";
import { applyVoicePlanAction, undoVoicePlanAction } from "../actions";
import { MAX_TRANSCRIPT, type PlanItem, type VoicePlan } from "../schema";
import { ReviewCard, type ReviewContext } from "./review-cards";
import { useRecorder } from "./use-recorder";
import { VOICE_EVENT, VoiceAvailable, type VoiceCommand } from "./voice-events";

/**
 * Voice capture (docs/voice-spec.md §3, §4): one sheet that listens, shows the words, then the
 * cards to check. Nothing is saved until Add all. Mounted once in the app layout, it answers the
 * round + button's long press, the desktop mic button and `v`.
 */

type Phase =
  | { name: "closed" }
  | { name: "listening"; hold: boolean }
  | { name: "working"; label: string; transcript?: string }
  | { name: "review"; plan: VoicePlan; items: PlanItem[]; transcript: string }
  | { name: "type"; text: string }
  | { name: "error"; message: string; transcript?: string };

const ERRORS = {
  denied: "Ledge needs the microphone for voice. Allow it in your browser's site settings.",
  unsupported: "This browser can't record audio. Type it instead.",
  empty: "Didn't catch that. Hold the button and speak.",
  failed: "The microphone didn't start. Try again, or type it.",
  offline: "You're offline. Type it instead.",
} as const;

function lastPaymentMethod(): string | null {
  try {
    const raw = window.localStorage.getItem("ledge:last-expense");
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && "paymentMethod" in parsed) {
      const method = (parsed as { paymentMethod?: unknown }).paymentMethod;
      return typeof method === "string" ? method : null;
    }
  } catch {
    // A private window or blocked storage: no memory, the default is used.
  }
  return null;
}

async function postJson<T>(
  url: string,
  body: BodyInit,
  headers?: HeadersInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, { method: "POST", body, headers });
    const json: unknown = await response.json().catch(() => null);
    if (json && typeof json === "object" && "ok" in json) {
      return (json as { ok: boolean }).ok
        ? { ok: true, data: json as T }
        : {
            ok: false,
            error: String((json as { error?: unknown }).error ?? "Something went wrong."),
          };
    }
    return { ok: false, error: "Voice is unavailable right now. Type it instead." };
  } catch {
    return {
      ok: false,
      error: navigator.onLine ? "Voice is unavailable right now." : ERRORS.offline,
    };
  }
}

function Meter({ level, active }: { level: number; active: boolean }) {
  // Seven bars that follow the loudness, the middle ones most; still when reduced motion is on.
  const shape = [0.35, 0.6, 0.85, 1, 0.85, 0.6, 0.35];
  return (
    <div aria-hidden className="flex h-16 items-center justify-center gap-1.5">
      {shape.map((weight, i) => (
        <span
          key={i}
          className="w-2 rounded-full bg-dash-ink transition-[height] duration-75 motion-reduce:transition-none"
          style={{
            height: `${active ? Math.max(8, Math.min(64, 8 + level * 220 * weight)) : 8}px`,
          }}
        />
      ))}
    </div>
  );
}

export function VoiceRoot({
  available,
  currency,
  locale,
  children,
}: {
  available: boolean;
  currency: string;
  locale: string;
  children: ReactNode;
}) {
  return (
    <VoiceAvailable value={available}>
      {children}
      {available ? <VoiceSheet currency={currency} locale={locale} /> : null}
    </VoiceAvailable>
  );
}

function VoiceSheet({ currency, locale }: { currency: string; locale: string }) {
  const { lists, inboxId } = useTodos();
  const [phase, setPhase] = useState<Phase>({ name: "closed" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hitLimit, setHitLimit] = useState(false);
  // The window listeners read the latest phase through this ref.
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const nextKey = useRef(0);
  /** Moves to a new phase at once, so a quick release is never missed. */
  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  /** Bumps when a run is abandoned, so a late answer from Groq is ignored. */
  const runId = useRef(0);

  const onLimit = useCallback(() => setHitLimit(true), []);
  const recorder = useRecorder({ onLimit });

  const understand = useCallback(
    async (text: string, id: number) => {
      go({ name: "working", label: "Understanding…", transcript: text });
      const result = await postJson<{ plan: VoicePlan }>(
        "/api/voice/understand",
        JSON.stringify({ text, lastPaymentMethod: lastPaymentMethod() }),
        { "Content-Type": "application/json" },
      );
      if (id !== runId.current) return;
      if (!result.ok) {
        go({ name: "error", message: result.error, transcript: text });
        return;
      }
      const plan = result.data.plan;
      setSaveError(null);
      go({ name: "review", plan, items: plan.items, transcript: plan.transcript });
    },
    [go],
  );

  const listen = useCallback(
    async (hold: boolean) => {
      const id = ++runId.current;
      setHitLimit(false);
      setSaveError(null);
      go({ name: "listening", hold });
      const clip = await recorder.start();
      if (id !== runId.current) return;
      if (!clip) return;
      if (!clip.ok) {
        // A cancel closes the sheet without a message.
        if (phaseRef.current.name === "closed") return;
        go({ name: "error", message: ERRORS[clip.reason] });
        return;
      }
      go({ name: "working", label: "Listening back…" });
      const form = new FormData();
      const extension = clip.blob.type.includes("mp4")
        ? "m4a"
        : clip.blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      form.append("audio", clip.blob, `voice.${extension}`);
      const heard = await postJson<{ text: string }>("/api/voice/transcribe", form);
      if (id !== runId.current) return;
      if (!heard.ok) {
        go({ name: "error", message: heard.error });
        return;
      }
      await understand(heard.data.text, id);
    },
    [go, recorder, understand],
  );

  const close = useCallback(() => {
    runId.current += 1;
    recorder.cancel();
    go({ name: "closed" });
  }, [go, recorder]);

  useEffect(() => {
    function onCommand(event: Event) {
      const command = (event as CustomEvent<VoiceCommand>).detail;
      const current = phaseRef.current;
      if (command === "hold-start") {
        if (current.name !== "listening") void listen(true);
      } else if (command === "toggle") {
        if (current.name === "listening") recorder.stop();
        else if (current.name !== "working") void listen(false);
      } else if (command === "type") {
        runId.current += 1;
        recorder.cancel();
        go({ name: "type", text: "" });
      }
    }
    // v starts listening and v (or Enter) finishes; outside text fields and other dialogs.
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (typing) return;
      const current = phaseRef.current;
      if (current.name === "listening" && (event.key === "v" || event.key === "Enter")) {
        event.preventDefault();
        recorder.stop();
      } else if (event.key === "v" && current.name === "closed") {
        if (document.querySelector("[role=dialog]")) return;
        event.preventDefault();
        void listen(false);
      }
    }
    window.addEventListener(VOICE_EVENT, onCommand);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(VOICE_EVENT, onCommand);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, go, listen, recorder]);

  function typeInstead(text = "") {
    runId.current += 1;
    recorder.cancel();
    go({ name: "type", text: text.slice(0, MAX_TRANSCRIPT) });
  }

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = ++runId.current;
    void understand(trimmed, id);
  }

  function updateItem(index: number, next: PlanItem) {
    setPhase((p) => {
      if (p.name !== "review") return p;
      const items = [...p.items];
      items[index] = next;
      return { ...p, items };
    });
  }

  function removeItem(index: number) {
    setPhase((p) => {
      if (p.name !== "review") return p;
      const removed = p.items[index];
      let items = p.items.filter((_, i) => i !== index);
      // A removed new list sends its tasks to General.
      if (removed?.type === "list") {
        items = items.map((i) =>
          i.type === "task" && i.listKey === removed.key
            ? { ...i, listKey: null, listId: inboxId }
            : i,
        );
      }
      return { ...p, items };
    });
  }

  function makeTask(index: number, text: string) {
    updateItem(index, {
      type: "task",
      key: `added-${++nextKey.current}`,
      title: text.slice(0, 500),
      listId: inboxId,
      listKey: null,
      dueDate: null,
      dueTime: null,
      priority: 0,
      notes: null,
    });
  }

  async function addAll() {
    if (phase.name !== "review") return;
    const items = phase.items.filter((i) => i.type !== "unclear");
    if (items.length === 0) return;
    setSaving(true);
    setSaveError(null);
    const result = await applyVoicePlanAction({ items });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    const receipt = result.data;
    go({ name: "closed" });
    undoToast(receipt.summary, () => {
      void run(undoVoicePlanAction(receipt), { success: "Undone" });
    });
  }

  const open = phase.name !== "closed";
  const review = phase.name === "review" ? phase : null;
  const toAdd = review ? review.items.filter((i) => i.type !== "unclear").length : 0;
  const context: ReviewContext | null = review
    ? {
        currency,
        locale,
        lists: lists.map((l) => ({ id: l.id, name: l.name })),
        emis: review.plan.emis,
        newLists: review.items
          .filter((i): i is Extract<PlanItem, { type: "list" }> => i.type === "list")
          .map((l) => ({ key: l.key, name: l.name })),
      }
    : null;

  const title =
    phase.name === "listening"
      ? "Listening…"
      : phase.name === "review"
        ? "Check and add"
        : phase.name === "type"
          ? "Type it"
          : phase.name === "error"
            ? "Voice"
            : "Working…";

  const seconds = Math.floor(recorder.elapsed / 1000);

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : close())} initialFocus={false}>
      <div className="flex min-h-0 flex-1 flex-col">
        <SheetHeader
          title={title}
          description={
            phase.name === "listening"
              ? phase.hold
                ? "You can let go. Press Done when you're finished"
                : "Say what to add, then press Done"
              : phase.name === "review"
                ? "Nothing is saved until you add it."
                : undefined
          }
        />
        <SheetBody>
          {/* Screen readers hear each step as it changes. */}
          <p className="sr-only" aria-live="polite">
            {title}
          </p>

          {phase.name === "listening" ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Meter level={recorder.level} active={recorder.state === "recording"} />
              <p className="font-mono text-[13px] text-dash-ink-soft tabular-nums">
                {recorder.state === "recording"
                  ? `0:${String(seconds).padStart(2, "0")} / 1:00`
                  : "Starting the microphone…"}
              </p>
              <p className="max-w-xs text-center text-[13px] text-dash-ink-soft">
                Try &ldquo;spent 500 on petrol today&rdquo; or &ldquo;add a task to call the bank
                tomorrow&rdquo;.
              </p>
            </div>
          ) : null}

          {phase.name === "working" ? (
            <div className="flex flex-col items-center gap-3 py-8" role="status">
              <Loader2
                aria-hidden
                className="size-6 animate-spin text-dash-ink-soft motion-reduce:animate-none"
              />
              <p className="text-[14px] font-medium">{phase.label}</p>
              {phase.transcript ? (
                <p dir="auto" className="max-w-sm text-center text-[14px] text-dash-ink-soft">
                  &ldquo;{phase.transcript}&rdquo;
                </p>
              ) : null}
            </div>
          ) : null}

          {phase.name === "error" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
              <p className="max-w-sm text-[14px] font-medium">{phase.message}</p>
              {phase.transcript ? (
                <p dir="auto" className="max-w-sm text-[13px] text-dash-ink-soft">
                  &ldquo;{phase.transcript}&rdquo;
                </p>
              ) : null}
            </div>
          ) : null}

          {phase.name === "type" ? (
            <form
              id="voice-type-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitText(phase.text);
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor="voice-text" className="text-[13px] font-medium">
                What to add
              </label>
              <Textarea
                id="voice-text"
                autoFocus
                rows={4}
                maxLength={MAX_TRANSCRIPT}
                value={phase.text}
                onChange={(e) => go({ name: "type", text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submitText(phase.text);
                  }
                }}
                placeholder="Spent 500 on petrol today, and add a task to call the bank tomorrow"
                className="rounded-xl text-base"
              />
              <p className="text-[12px] text-dash-ink-soft">
                Write it the way you would say it. Several things at once are fine.
              </p>
            </form>
          ) : null}

          {review && context ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-dash-well px-3 py-2.5">
                <p className="text-[12px] text-dash-ink-soft">You said</p>
                <p dir="auto" className="text-[14px]">
                  &ldquo;{review.transcript}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => typeInstead(review.transcript)}
                  className="mt-1 inline-flex min-h-9 items-center gap-1 text-[12px] font-medium text-dash-ink-soft underline-offset-2 outline-none hover:text-dash-ink hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <RotateCcw aria-hidden className="size-3" />
                  Fix the words and try again
                </button>
              </div>
              {saveError ? (
                <p
                  role="alert"
                  className="rounded-xl bg-dash-bad-bg px-3 py-2 text-[13px] font-medium text-dash-bad"
                >
                  {saveError}
                </p>
              ) : null}
              {review.items.length === 0 ? (
                <p className="py-6 text-center text-[14px] text-dash-ink-soft">
                  Everything was removed. Close, or fix the words and try again.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {review.items.map((item, index) => (
                    <ReviewCard
                      key={item.key}
                      item={item}
                      context={context}
                      onChange={(next) => updateItem(index, next)}
                      onRemove={() => removeItem(index)}
                      onMakeTask={(text) => makeTask(index, text)}
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {hitLimit && phase.name !== "listening" ? (
            <p className="mt-3 text-center text-[12px] text-dash-ink-soft">
              Recording stops after a minute.
            </p>
          ) : null}
        </SheetBody>

        <SheetFooter>
          {phase.name === "listening" ? (
            <>
              <DashButton
                variant="secondary"
                onClick={() => typeInstead()}
                className="h-12! max-md:flex-1 md:h-10!"
              >
                <Keyboard /> Type instead
              </DashButton>
              <div className="hidden flex-1 md:block" />
              <DashButton
                onClick={() => recorder.stop()}
                disabled={recorder.state !== "recording"}
                className="h-12! font-semibold max-md:flex-1 md:h-10!"
              >
                <Square /> Done
              </DashButton>
            </>
          ) : phase.name === "review" ? (
            <>
              <DashButton
                variant="secondary"
                onClick={close}
                className="h-12! max-md:flex-1 md:h-10!"
              >
                {toAdd === 0 ? "Close" : "Cancel"}
              </DashButton>
              <div className="hidden flex-1 md:block" />
              <DashButton
                onClick={() => void addAll()}
                disabled={saving || toAdd === 0}
                className="h-12! font-semibold max-md:flex-1 md:h-10!"
              >
                {saving ? "Adding…" : `Add ${toAdd === 1 ? "1 thing" : `${toAdd} things`}`}
              </DashButton>
            </>
          ) : phase.name === "type" ? (
            <>
              <DashButton
                variant="secondary"
                onClick={() => void listen(false)}
                className="h-12! max-md:flex-1 md:h-10!"
              >
                <Mic /> Speak instead
              </DashButton>
              <div className="hidden flex-1 md:block" />
              <DashButton
                type="submit"
                form="voice-type-form"
                disabled={!phase.text.trim()}
                className="h-12! font-semibold max-md:flex-1 md:h-10!"
              >
                Continue
              </DashButton>
            </>
          ) : phase.name === "error" ? (
            <>
              <DashButton
                variant="secondary"
                onClick={() => typeInstead(phase.transcript ?? "")}
                className="h-12! max-md:flex-1 md:h-10!"
              >
                <Keyboard /> Type instead
              </DashButton>
              <div className="hidden flex-1 md:block" />
              <DashButton
                onClick={() => void listen(false)}
                className="h-12! font-semibold max-md:flex-1 md:h-10!"
              >
                <Mic /> Try again
              </DashButton>
            </>
          ) : (
            <DashButton
              variant="secondary"
              onClick={close}
              className={cn("h-12! w-full md:h-10! md:w-auto")}
            >
              Cancel
            </DashButton>
          )}
        </SheetFooter>
      </div>
    </Sheet>
  );
}
