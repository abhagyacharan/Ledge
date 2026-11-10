"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const ORDER = ["system", "light", "dark"] as const;
const LABEL = { system: "System theme", light: "Light theme", dark: "Dark theme" } as const;
const ICON = { system: Monitor, light: Sun, dark: Moon } as const;

const subscribe = () => () => {};

/** Cycles system, light, dark. Shows a neutral icon until mounted to avoid hydration mismatch. */
export function ThemeToggle() {
  const { theme = "system", setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const current = mounted && (theme === "light" || theme === "dark") ? theme : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICON[current];

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11 md:size-8"
      aria-label={`${LABEL[current]}. Switch to ${LABEL[next].toLowerCase()}.`}
      onClick={() => setTheme(next)}
    >
      <Icon />
    </Button>
  );
}
