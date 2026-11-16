"use client";

import { createContext, use, useRef, type PointerEvent as ReactPointerEvent } from "react";

/**
 * How the rest of the app talks to the voice sheet (docs/voice-spec.md §3): window events, like
 * quick add and Log a transaction. `useHoldToTalk` gives the round + button its long press.
 */

export const VOICE_EVENT = "ledge:voice";

export type VoiceCommand =
  | "hold-start"
  /** Desktop: the mic button or `v` starts, and again stops. */
  | "toggle"
  | "type";

export function sendVoice(command: VoiceCommand) {
  window.dispatchEvent(new CustomEvent<VoiceCommand>(VOICE_EVENT, { detail: command }));
}

/** Whether voice can be used here (a Groq key on the server and the Settings switch on). */
export const VoiceAvailable = createContext(false);
export const useVoiceAvailable = () => use(VoiceAvailable);

/** How long to hold the + before it starts listening (O, 2026-11-16: two seconds). */
export const HOLD_MS = 2000;
/** A finger drifting further than this before the hold fires counts as a scroll, not a hold. */
const MOVE_TOLERANCE = 24;

/**
 * Long press for the round + button: hold for two seconds and it buzzes once and starts
 * listening. After that you can let go and put the phone down: it keeps listening until you
 * press Done. A plain tap still clicks. While the finger is down the button grows a ring so you
 * can see it is working, and `touch-action: none` stops the browser turning a small drift of
 * the finger into a scroll (which would cancel the press).
 */
export function useHoldToTalk(available: boolean) {
  const timer = useRef<number | null>(null);
  const swallowClick = useRef(false);
  const element = useRef<HTMLElement | null>(null);

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    if (element.current) delete element.current.dataset.holding;
  };

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!available || event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    swallowClick.current = false;
    element.current = event.currentTarget;
    event.currentTarget.dataset.holding = "1";

    const detach = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
    // Only before the hold fires: too much drift, a lifted finger or a cancel ends the attempt.
    // Once listening has started, the finger is free to move or lift.
    const onMove = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_TOLERANCE) {
        clear();
        detach();
      }
    };
    const onEnd = () => {
      clear();
      detach();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);

    clear();
    element.current.dataset.holding = "1";
    timer.current = window.setTimeout(() => {
      timer.current = null;
      swallowClick.current = true;
      if (element.current) delete element.current.dataset.holding;
      detach();
      // One short buzz where phones allow it (Android; iPhones ignore it).
      navigator.vibrate?.(60);
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
      style: available ? ({ touchAction: "none" } as const) : undefined,
    },
    /** Call first in the button's onClick: true means the press was a hold, so skip the click. */
    consumeHold(): boolean {
      if (!swallowClick.current) return false;
      swallowClick.current = false;
      return true;
    },
  };
}
