"use client";

import { Delete } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The PIN pad (docs/new_design.md screens 7a to 7c, 7h). Phones: dots and a big on-screen
 * keypad under the thumb. Desktop: digit boxes, typed on the keyboard. It submits by itself on
 * the last digit. A wrong PIN turns the dots red, shakes once and clears; the message says how
 * many tries are left, so the error is never colour alone.
 */
export function PinPad({
  length,
  onComplete,
  error,
  busy = false,
  label,
}: {
  length: 4 | 6;
  onComplete: (pin: string) => void;
  /** A message to show; a new one shakes the dots and clears what was typed. */
  error: string | null;
  busy?: boolean;
  /** What screen readers hear for the field ("PIN", "New PIN"). */
  label: string;
}) {
  const [digits, setDigits] = useState("");
  // The latest digits, so quick taps in a row each build on the one before.
  const latest = useRef("");
  const [shaking, setShaking] = useState(false);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  // A new error: shake and show red now (set during render, React's pattern for state that
  // follows a prop), then clear for the next try.
  const [seenError, setSeenError] = useState(error);
  if (error !== seenError) {
    setSeenError(error);
    if (error) setShaking(true);
  }
  useEffect(() => {
    if (!shaking) return;
    const timer = window.setTimeout(() => {
      setShaking(false);
      setDigits("");
      latest.current = "";
      done.current = false;
    }, 450);
    return () => window.clearTimeout(timer);
  }, [shaking]);

  // With a mouse and keyboard, the boxes take typing straight away. On a touch screen the
  // keypad is used instead, so the system keyboard stays closed.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) input.current?.focus();
  }, []);

  function update(next: string) {
    if (busy || done.current) return;
    const clean = next.replace(/\D/g, "").slice(0, length);
    latest.current = clean;
    setDigits(clean);
    if (clean.length === length) {
      done.current = true;
      onComplete(clean);
    }
  }

  const red = Boolean(error) && shaking;

  return (
    <div className="flex w-full flex-col items-center">
      {/* The real field: keyboard typing, paste and screen readers. Invisible over the boxes. */}
      <div className="relative">
        <input
          ref={input}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={label}
          aria-invalid={error ? true : undefined}
          maxLength={length}
          value={digits}
          disabled={busy}
          onChange={(e) => update(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 max-md:pointer-events-none"
        />
        {/* Phones: dots. */}
        <div
          aria-hidden
          className={cn(
            "flex justify-center gap-5 py-2 md:hidden",
            shaking && "animate-[shake_300ms]",
          )}
        >
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={cn(
                "size-4 rounded-full border-2 transition-colors duration-150",
                red
                  ? "border-dash-bad bg-dash-bad"
                  : i < digits.length
                    ? "border-dash-ink bg-dash-ink"
                    : "border-dash-ink-soft",
              )}
            />
          ))}
        </div>
        {/* Desktop: boxes; the next one is outlined while the field has focus. */}
        <div
          aria-hidden
          className={cn("hidden gap-2.5 md:flex", shaking && "animate-[shake_300ms]")}
        >
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={cn(
                "grid size-12 place-items-center rounded-xl border-2 bg-dash-well transition-colors duration-150",
                red
                  ? "border-dash-bad"
                  : i === digits.length && focused
                    ? "border-dash-ink"
                    : "border-transparent",
              )}
            >
              {i < digits.length ? (
                <span className={cn("size-3 rounded-full", red ? "bg-dash-bad" : "bg-dash-ink")} />
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {digits.length} of {length} digits
      </p>

      {/* Phones: the keypad. */}
      <div className="mt-10 grid w-full max-w-xs grid-cols-3 gap-2.5 md:hidden">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((key) =>
          key === "" ? (
            <span key="blank" />
          ) : key === "back" ? (
            <button
              key="back"
              type="button"
              aria-label="Delete last digit"
              disabled={busy || digits.length === 0}
              onClick={() => update(latest.current.slice(0, -1))}
              className="grid h-14 place-items-center rounded-full text-dash-ink outline-none active:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
            >
              <Delete aria-hidden className="size-5" />
            </button>
          ) : (
            <button
              key={key}
              type="button"
              disabled={busy}
              onClick={() => update(latest.current + key)}
              className="h-14 rounded-full bg-dash-card font-display text-2xl font-medium text-dash-ink shadow-(--dash-card-shadow) outline-none transition-transform duration-100 active:scale-95 active:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
