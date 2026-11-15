"use client";

import { Mic } from "lucide-react";
import { dashButton } from "@/components/dash/dash-button";
import { sendVoice, useVoiceAvailable } from "./voice-events";

/**
 * "Speak instead" in a capture sheet's header (docs/voice-spec.md §3, desktop): closes that sheet
 * and starts listening in the voice sheet. Hidden when voice is off.
 */
export function MicButton({ onBeforeStart }: { onBeforeStart: () => void }) {
  const available = useVoiceAvailable();
  if (!available) return null;
  return (
    <button
      type="button"
      aria-label="Speak instead (v)"
      title="Speak instead (v)"
      onClick={() => {
        onBeforeStart();
        // Let the sheet start closing first, so the voice sheet opens on its own.
        window.setTimeout(() => sendVoice("toggle"), 120);
      }}
      className={dashButton({ variant: "well", size: "icon" })}
    >
      <Mic />
    </button>
  );
}
