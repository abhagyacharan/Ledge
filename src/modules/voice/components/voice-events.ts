"use client";

import { createContext, use, useRef, type PointerEvent as ReactPointerEvent } from "react";

/**
 * How the rest of the app talks to the voice sheet (docs/voice-spec.md §3): window events, like
 * quick add and Log a transaction. `useHoldToTalk` gives the round + button its long press.
 */

export const VOICE_EVENT = "ledge:voice";

export type VoiceCommand =
  | "hold-start"
  | "hold-end"
  | "hold-cancel"
  /** Desktop: the mic button or `v` starts, and again stops. */
  | "toggle"
  | "type";

export function sendVoice(command: VoiceCommand) {
  window.dispatchEvent(new CustomEvent<VoiceCommand>(VOICE_EVENT, { detail: command }));
}

/** Whether voice can be used here (a Groq key on the server and the Settings switch on). */
export const VoiceAvailable = createContext(false);
export const useVoiceAvailable = () => use(VoiceAvailable);

const HOLD_MS = 400;
const MOVE_TOLERANCE = 10;
/** Sliding the finger this far down before letting go cancels the recording. */
const CANCEL_DISTANCE = 60;

/**
 * Long press for the round + button: hold for 400 ms to start recording, let go to finish, slide
 * down to cancel. A plain tap still clicks. While holding, it listens on the whole window, so
 * letting go still counts after the sheet slides up over the button.
 */
export function useHoldToTalk(available: boolean) {
  const timer = useRef<number | null>(null);
  const holding = useRef(false);
  const swallowClick = useRef(false);

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!available || event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    swallowClick.current = false;

    const onMove = (e: PointerEvent) => {
      if (!holding.current && Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_TOLERANCE) {
        clear();
        detach();
      }
    };
    const onUp = (e: PointerEvent) => {
      clear();
      detach();
      if (!holding.current) return;
      holding.current = false;
      sendVoice(e.clientY - startY > CANCEL_DISTANCE ? "hold-cancel" : "hold-end");
    };
    const onCancel = () => {
      clear();
      detach();
      if (!holding.current) return;
      holding.current = false;
      sendVoice("hold-cancel");
    };
    const detach = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);

    clear();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      holding.current = true;
      swallowClick.current = true;
      // A short buzz where phones allow it (Android; iPhones ignore it).
      navigator.vibrate?.(15);
      sendVoice("hold-start");
    }, HOLD_MS);
  }

  return {
    handlers: {
      onPointerDown,
      // Long-pressing a button on a phone would otherwise open a menu or select its label.
      onContextMenu: (event: React.MouseEvent) => {
        if (available) event.preventDefault();
      },
    },
    /** Call first in the button's onClick: true means the press was a hold, so skip the click. */
    consumeHold(): boolean {
      if (!swallowClick.current) return false;
      swallowClick.current = false;
      return true;
    },
  };
}
