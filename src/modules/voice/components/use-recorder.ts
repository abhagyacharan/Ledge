"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Records one voice clip with MediaRecorder (docs/voice-spec.md §5): Opus in WebM on Android
 * Chrome, AAC in MP4 on iPhone Safari. Gives a live level for the meter, stops by itself after 60
 * seconds, and reports clips that are too short or silent so they are never sent.
 */

export const MAX_RECORDING_MS = 60_000;
const MIN_RECORDING_MS = 600;
/** Peak loudness (0 to 1) below which a clip counts as silence. */
const SILENCE_PEAK = 0.04;

export type RecorderState = "idle" | "starting" | "recording";
export type Clip =
  | { ok: true; blob: Blob; durationMs: number }
  | { ok: false; reason: "denied" | "unsupported" | "empty" | "failed" };

const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function useRecorder({ onLimit }: { onLimit: () => void }) {
  const [state, setState] = useState<RecorderState>("idle");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const chunks = useRef<Blob[]>([]);
  const peak = useRef(0);
  const startedAt = useRef(0);
  const frame = useRef<number | null>(null);
  const limit = useRef<number | null>(null);
  const wantStop = useRef<"stop" | "cancel" | null>(null);

  const teardown = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (limit.current !== null) window.clearTimeout(limit.current);
    frame.current = null;
    limit.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audio.current?.close().catch(() => undefined);
    audio.current = null;
    recorder.current = null;
    setLevel(0);
    setState("idle");
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(async (): Promise<Clip | null> => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return { ok: false, reason: "unsupported" };
    }
    if (typeof MediaRecorder === "undefined") return { ok: false, reason: "unsupported" };
    setState("starting");
    wantStop.current = null;
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch (error) {
      setState("idle");
      const name = error instanceof DOMException ? error.name : "";
      return {
        ok: false,
        reason: name === "NotAllowedError" || name === "SecurityError" ? "denied" : "failed",
      };
    }
    // Let go before the microphone was ready: nothing to record.
    if (wantStop.current) {
      media.getTracks().forEach((t) => t.stop());
      setState("idle");
      return { ok: false, reason: "empty" };
    }
    stream.current = media;
    const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(media, type ? { mimeType: type } : undefined);
    recorder.current = rec;
    chunks.current = [];
    peak.current = 0;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    // The level meter: loudness of the last few milliseconds, sampled every frame.
    try {
      const context = new AudioContext();
      audio.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(media).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let max = 0;
        for (const s of samples) max = Math.max(max, Math.abs(s - 128) / 128);
        peak.current = Math.max(peak.current, max);
        setLevel(max);
        setElapsed(Date.now() - startedAt.current);
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    } catch {
      // No meter is fine; the silence check then trusts the clip.
      peak.current = 1;
    }

    return new Promise<Clip>((resolve) => {
      rec.onstop = () => {
        const durationMs = Date.now() - startedAt.current;
        const mimeType = rec.mimeType || type || "audio/webm";
        const blob = new Blob(chunks.current, { type: mimeType });
        const cancelled = wantStop.current === "cancel";
        teardown();
        if (cancelled) return resolve({ ok: false, reason: "empty" });
        if (durationMs < MIN_RECORDING_MS || peak.current < SILENCE_PEAK || blob.size === 0) {
          return resolve({ ok: false, reason: "empty" });
        }
        resolve({ ok: true, blob, durationMs });
      };
      startedAt.current = Date.now();
      setElapsed(0);
      rec.start(250);
      setState("recording");
      limit.current = window.setTimeout(() => {
        onLimit();
        if (rec.state === "recording") rec.stop();
      }, MAX_RECORDING_MS);
    });
  }, [onLimit, teardown]);

  /** Finish: the clip comes back through start()'s promise. */
  const stop = useCallback(() => {
    wantStop.current = "stop";
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  /** Throw the clip away. */
  const cancel = useCallback(() => {
    wantStop.current = "cancel";
    if (recorder.current?.state === "recording") recorder.current.stop();
    else teardown();
  }, [teardown]);

  return { state, level, elapsed, start, stop, cancel };
}
