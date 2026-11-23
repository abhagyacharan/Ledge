"use client";

import { useCallback, useState } from "react";
import { useRecorder } from "@/modules/voice/components/use-recorder";

const MESSAGES = {
  denied: "Ledge needs the microphone. Allow it in your browser's site settings.",
  unsupported: "This browser can't record audio. Type your goal instead.",
  empty: "Didn't catch that. Tap the microphone and speak.",
  failed: "The microphone didn't start. Try again, or type it.",
} as const;

export type GoalVoiceState = "idle" | "listening" | "working";

/**
 * Speaks the goal into the box: records with the app's recorder, sends the clip to
 * `/api/voice/transcribe` (the same route voice capture uses) and hands the words back.
 */
export function useGoalVoice(onText: (text: string) => void) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tooLong, setTooLong] = useState(false);
  const onLimit = useCallback(() => setTooLong(true), []);
  const recorder = useRecorder({ onLimit });

  const toggle = useCallback(async () => {
    if (working) return;
    if (recorder.state === "recording") {
      recorder.stop();
      return;
    }
    if (recorder.state === "starting") return;
    setMessage(null);
    setTooLong(false);
    const clip = await recorder.start();
    if (!clip) return;
    if (!clip.ok) {
      setMessage(MESSAGES[clip.reason]);
      return;
    }
    setWorking(true);
    try {
      const form = new FormData();
      const extension = clip.blob.type.includes("mp4")
        ? "m4a"
        : clip.blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      form.append("audio", clip.blob, `voice.${extension}`);
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const json: unknown = await response.json().catch(() => null);
      if (json && typeof json === "object" && (json as { ok?: unknown }).ok === true) {
        const text = String((json as { text?: unknown }).text ?? "").trim();
        if (text) onText(text);
        else setMessage(MESSAGES.empty);
      } else {
        const error =
          json && typeof json === "object" ? (json as { error?: unknown }).error : undefined;
        setMessage(typeof error === "string" ? error : "Voice is unavailable right now.");
      }
    } catch {
      setMessage(navigator.onLine ? "Voice is unavailable right now." : "You're offline. Type it.");
    } finally {
      setWorking(false);
    }
  }, [onText, recorder, working]);

  const state: GoalVoiceState = working
    ? "working"
    : recorder.state === "recording"
      ? "listening"
      : "idle";
  return { state, toggle, message, tooLong, cancel: recorder.cancel };
}
