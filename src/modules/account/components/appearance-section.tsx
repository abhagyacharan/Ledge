"use client";

import { ChevronDown, Lock, Monitor, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useId, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { switchTheme } from "@/lib/theme-transition";
import { cn } from "@/lib/utils";
import { updatePreferencesAction } from "../actions";
import { SavedMark } from "./saved-mark";
import { ChoiceRow, ErrorLine, GroupLabel, SectionHeader, settingsCard, Tick } from "./ui";
import { useSave } from "./use-save";

const THEMES = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

/** "UTC+5:30" and, where the zone has one, its short name ("IST"). */
function zoneLabel(zone: string): { offset: string; short: string | null } {
  const part = (style: "shortOffset" | "short") => {
    try {
      return (
        new Intl.DateTimeFormat("en-IN", { timeZone: zone, timeZoneName: style })
          .formatToParts(new Date())
          .find((p) => p.type === "timeZoneName")?.value ?? ""
      );
    } catch {
      return "";
    }
  };
  const offset = part("shortOffset").replace("GMT", "UTC").replace(/^UTC$/, "UTC+0");
  const short = part("short");
  return { offset, short: short && !/^(GMT|UTC)/.test(short) ? short : null };
}

/**
 * Settings › Appearance & time (screen 9j): the theme as three tiles (the chosen one filled, no
 * tick), the time zone as a searchable list with offsets, the first day of the week, and the
 * currency and locale shown but fixed for now (changing them would relabel money already saved).
 */
export function AppearanceSection({
  timezone,
  weekStartsOn,
  currency,
  locale,
}: {
  timezone: string;
  weekStartsOn: number;
  currency: { name: string; code: string };
  locale: { name: string; code: string; sample: string };
}) {
  const { theme = "system", setTheme } = useTheme();
  const themeSave = useSave();
  const zoneSave = useSave();
  const weekSave = useSave();
  const [zone, setZone] = useState(timezone);
  const [week, setWeek] = useState(weekStartsOn);

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader title="Appearance & time" />

      <div className="flex items-center">
        <GroupLabel id="theme-title">Theme</GroupLabel>
        <SavedMark at={themeSave.savedAt} />
      </div>
      <div role="radiogroup" aria-labelledby="theme-title" className="grid grid-cols-3 gap-2.5">
        {THEMES.map((t) => {
          const on = theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={(event) => {
                const before = theme;
                const origin = event.currentTarget;
                themeSave.save(() => updatePreferencesAction({ theme: t.value }), {
                  // The new colours spread out from this tile in a circle.
                  apply: () => switchTheme(t.value, origin, setTheme),
                  undo: () => setTheme(before),
                });
              }}
              className={cn(
                "flex h-[88px] flex-col items-center justify-center gap-2 rounded-2xl text-[14px] outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-5",
                on
                  ? "bg-dash-ink font-semibold text-dash-card"
                  : "border border-dash-edge bg-dash-card font-medium text-dash-ink hover:bg-dash-well",
              )}
            >
              <t.icon aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>
      {themeSave.retry ? (
        <ErrorLine onRetry={themeSave.retry}>Couldn&apos;t save.</ErrorLine>
      ) : null}

      <GroupLabel>Time</GroupLabel>
      <div className={settingsCard}>
        <div className="flex flex-col gap-2 border-dash-edge px-4 py-3 md:flex-row md:items-center md:gap-3">
          <span id="zone-label" className="flex flex-1 items-center text-[15px] font-medium">
            Timezone
            <SavedMark at={zoneSave.savedAt} />
          </span>
          <ZonePicker
            value={zone}
            onChange={(next) => {
              const before = zone;
              zoneSave.save(() => updatePreferencesAction({ timezone: next }), {
                apply: () => setZone(next),
                undo: () => setZone(before),
              });
            }}
          />
        </div>
        {zoneSave.retry ? (
          <div className="px-4 pb-3">
            <ErrorLine onRetry={zoneSave.retry}>Couldn&apos;t save.</ErrorLine>
          </div>
        ) : null}
        <div className="flex flex-col gap-1 border-t border-dash-edge px-4 pt-3 pb-1 md:flex-row md:gap-3">
          <span
            id="week-label"
            className="flex flex-1 items-center pt-0 text-[15px] font-medium md:pt-3"
          >
            Week starts on
            <SavedMark at={weekSave.savedAt} />
          </span>
          <div
            role="radiogroup"
            aria-labelledby="week-label"
            className="-mx-4 flex flex-col md:mx-0 md:w-[300px] [&>button]:border-t-0 [&>button]:md:px-0"
          >
            {[
              { value: 1, label: "Monday" },
              { value: 7, label: "Sunday" },
            ].map((option) => (
              <ChoiceRow
                key={option.value}
                checked={week === option.value}
                onSelect={() => {
                  if (week === option.value) return;
                  const before = week;
                  weekSave.save(
                    () => updatePreferencesAction({ weekStartsOn: option.value as 1 | 7 }),
                    { apply: () => setWeek(option.value), undo: () => setWeek(before) },
                  );
                }}
              >
                {option.label}
              </ChoiceRow>
            ))}
          </div>
        </div>
        {weekSave.retry ? (
          <div className="px-4 pb-3">
            <ErrorLine onRetry={weekSave.retry}>Couldn&apos;t save.</ErrorLine>
          </div>
        ) : null}
      </div>

      <GroupLabel>Money and formats</GroupLabel>
      <div className={settingsCard}>
        {[
          { label: "Currency", value: currency.name, mono: currency.code },
          { label: "Locale", value: locale.name, mono: `${locale.code} · ${locale.sample}` },
        ].map((row) => (
          <div
            key={row.label}
            className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 border-t border-dash-edge px-4 py-2.5 first:border-t-0"
          >
            <span className="flex-1 text-[15px] font-medium">{row.label}</span>
            <span className="text-[14px] font-medium">
              {row.value} <span className="font-mono text-dash-ink-soft">{row.mono}</span>
            </span>
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-dash-well px-2.5 text-[12px] font-medium text-dash-ink-soft">
              <Lock aria-hidden className="size-3" />
              Fixed for now
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The time zone: a button showing the zone that opens a searchable list (screen 9j). */
function ZonePicker({ value, onChange }: { value: string; onChange: (zone: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const zones = useMemo(() => {
    try {
      const all = Intl.supportedValuesOf("timeZone");
      return all.includes(value) ? all : [value, ...all];
    } catch {
      return [value];
    }
  }, [value]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "_");
    const found = q ? zones.filter((z) => z.toLowerCase().includes(q)) : zones;
    return found.slice(0, 60);
  }, [query, zones]);
  const shown = zoneLabel(value);

  function choose(zone: string) {
    setOpen(false);
    setQuery("");
    if (zone !== value) onChange(zone);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setActive(0);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-labelledby="zone-label zone-value"
          className="flex h-11 w-full items-center gap-2 rounded-2xl bg-dash-well px-4 text-left text-[15px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-dash-accent/60 md:w-[300px]"
        >
          <span id="zone-value" className="min-w-0 flex-1 truncate">
            {value.replace(/_/g, " ")}
            {shown.short ? ` (${shown.short})` : ""}
          </span>
          <ChevronDown aria-hidden className="size-4 text-dash-ink-soft" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(340px,calc(100vw-2rem))] p-2">
        <label className="mb-1.5 flex h-11 items-center gap-2 rounded-xl bg-dash-well px-3">
          <Search aria-hidden className="size-4 text-dash-ink-soft" />
          <input
            autoFocus
            value={query}
            placeholder="Search a city or zone"
            aria-label="Search timezones"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={matches[active] ? `${listId}-${active}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(matches.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && matches[active]) {
                e.preventDefault();
                choose(matches[active]);
              }
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none md:text-[14px]"
          />
        </label>
        <ul id={listId} role="listbox" aria-label="Timezone" className="max-h-72 overflow-y-auto">
          {matches.length === 0 ? (
            <li className="px-3 py-3 text-[13px] text-dash-ink-soft">No zone matches that.</li>
          ) : (
            matches.map((zone, i) => {
              const label = zoneLabel(zone);
              const selected = zone === value;
              return (
                <li
                  key={zone}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(zone)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-[14px]",
                    selected ? "font-semibold" : "font-medium",
                    i === active && "bg-dash-well",
                  )}
                >
                  {selected ? (
                    <Tick on className="size-[18px] [&_svg]:size-3" />
                  ) : (
                    <span aria-hidden className="w-[18px]" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{zone.replace(/_/g, " ")}</span>
                  <span className="shrink-0 font-mono text-[12px] text-dash-ink-soft">
                    {label.short ? `${label.short} · ` : ""}
                    {label.offset}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
