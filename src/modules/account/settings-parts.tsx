"use client";

import {
  Check,
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
  LogOut,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PeriodControl } from "@/modules/expenses/components/period-control";
import { periodLabel, type Period } from "@/modules/expenses/periods";
import { run } from "@/modules/todos/components/run-action";
import { deleteAccountAction, signOutEverywhereAction, updatePreferencesAction } from "./actions";
import { card, CardTitle } from "./card";
import { DELETE_PHRASE } from "./schema";

const row =
  "flex min-h-13 items-center justify-between gap-3 border-t border-dash-edge py-2 first:border-t-0";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;
type Theme = (typeof THEMES)[number]["value"];

/** A native select shown as a row value with a chevron: big, accessible, works everywhere. */
function SelectRow({
  label,
  value,
  shown,
  options,
  onChange,
}: {
  label: string;
  value: string;
  shown: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className={row}>
      <label htmlFor={id} className="text-[14px]">
        {label}
      </label>
      <div className="relative min-w-0">
        <span
          aria-hidden
          className="pointer-events-none inline-flex max-w-full items-center gap-1 truncate text-[14px] font-medium"
        >
          <span className="truncate">{shown}</span>
          <ChevronDown className="size-4 shrink-0 text-dash-ink-soft" />
        </span>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Preferences (docs/new_design.md screens 5f and 6g): theme as a segmented control, time zone and
 * the first day of the week as rows. Currency and locale are shown but fixed: changing them would
 * relabel money already stored in rupees.
 */
export function PreferencesCard({
  timezone,
  weekStartsOn,
  currencyLabel,
  localeLabel,
  voice,
}: {
  timezone: string;
  weekStartsOn: number;
  currencyLabel: string;
  localeLabel: string;
  /** Null when the server has no Groq key: the switch is not shown at all. */
  voice: { enabled: boolean } | null;
}) {
  const router = useRouter();
  const { theme = "system", setTheme } = useTheme();
  const [, startTransition] = useTransition();
  const [zone, setZone] = useState(timezone);
  const [week, setWeek] = useState(weekStartsOn);
  const [voiceOn, setVoiceOn] = useState(voice?.enabled ?? false);
  const zones = (() => {
    try {
      const all = Intl.supportedValuesOf("timeZone");
      return all.includes(timezone) ? all : [timezone, ...all];
    } catch {
      return [timezone];
    }
  })();

  function save(patch: Record<string, unknown>, undo: () => void) {
    startTransition(async () => {
      const result = await run(updatePreferencesAction(patch));
      if (!result.ok) undo();
      else router.refresh();
    });
  }

  return (
    <section id="preferences" aria-labelledby="preferences-title" className={card}>
      <CardTitle id="preferences-title">Preferences</CardTitle>
      <div className="flex flex-col">
        <div className={row}>
          <span id="theme-label" className="text-[14px]">
            Theme
          </span>
          <div
            role="radiogroup"
            aria-labelledby="theme-label"
            className="flex gap-0.5 rounded-full bg-dash-well p-1"
          >
            {THEMES.map((t) => {
              const on = theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    const before = theme as Theme;
                    setTheme(t.value);
                    save({ theme: t.value }, () => setTheme(before));
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8",
                    on
                      ? "bg-dash-raised font-semibold text-dash-ink shadow-(--dash-lift)"
                      : "text-dash-ink-soft hover:text-dash-ink",
                  )}
                >
                  {on ? <Check aria-hidden className="size-3.5" /> : null}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <SelectRow
          label="Timezone"
          value={zone}
          shown={zone}
          options={zones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }))}
          onChange={(next) => {
            const before = zone;
            setZone(next);
            save({ timezone: next }, () => setZone(before));
          }}
        />
        <SelectRow
          label="Week starts on"
          value={String(week)}
          shown={week === 7 ? "Sunday" : "Monday"}
          options={[
            { value: "1", label: "Monday" },
            { value: "7", label: "Sunday" },
          ]}
          onChange={(next) => {
            const before = week;
            setWeek(Number(next));
            save({ weekStartsOn: Number(next) }, () => setWeek(before));
          }}
        />
        {voice ? (
          <div className={cn(row, "items-start")}>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span id="voice-label" className="text-[14px]">
                Voice capture
              </span>
              <span id="voice-hint" className="text-[12px] leading-snug text-dash-ink-soft">
                Hold + and speak to add tasks and money. Your voice is sent to Groq to be turned
                into text and understood. Ledge keeps neither the audio nor the words.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={voiceOn}
              aria-labelledby="voice-label"
              aria-describedby="voice-hint"
              onClick={() => {
                const next = !voiceOn;
                setVoiceOn(next);
                save({ voiceEnabled: next }, () => setVoiceOn(!next));
              }}
              className={cn(
                "relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
                voiceOn ? "bg-dash-ink" : "bg-dash-track",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-6 rounded-full bg-dash-card shadow-(--dash-lift) transition-transform duration-150 ease-snap",
                  voiceOn && "translate-x-5",
                )}
              />
            </button>
          </div>
        ) : null}
        <div className={row}>
          <span className="text-[14px]">Currency</span>
          <span className="text-[14px] font-medium">{currencyLabel}</span>
        </div>
        <div className={row}>
          <span className="text-[14px]">Locale</span>
          <span className="text-right text-[14px] font-medium">{localeLabel}</span>
        </div>
      </div>
    </section>
  );
}

const pill =
  "inline-flex h-11 items-center gap-1.5 rounded-full bg-dash-well px-3.5 text-[13px] font-medium text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 [&_svg]:size-3.5";

/**
 * Reports and your data (screens 5f and 6g): the expense PDFs for a chosen month (the cash flow
 * covers its year), and the two exports so you can leave at any time.
 */
export function ReportsCard({ thisMonth }: { thisMonth: Period }) {
  const [period, setPeriod] = useState<Period>(thisMonth);
  return (
    <section id="reports" aria-labelledby="reports-title" className={cn(card, "pb-4")}>
      <CardTitle id="reports-title">Reports and your data</CardTitle>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PeriodControl
          period={period}
          fallback={thisMonth}
          onChange={setPeriod}
          compact
          label="Report period"
        />
        <a
          href={`/api/export/expense-breakdown?y=${period.year}&m=${period.month}`}
          download
          aria-label={`Expense breakdown PDF for ${periodLabel(period)}`}
          className={pill}
        >
          <Download aria-hidden /> Expense breakdown PDF
        </a>
        <a
          href={`/api/export/cash-flow?y=${period.year}`}
          download
          aria-label={`Cash flow PDF for ${period.year}`}
          className={pill}
        >
          <Download aria-hidden /> Cash flow PDF
        </a>
      </div>
      <div id="data" className="mt-2 flex scroll-mt-6 flex-wrap gap-2">
        <a href="/api/export/everything" download className={pill}>
          <FileJson aria-hidden /> Export everything (JSON)
        </a>
        <a href="/api/export/tasks" download className={pill}>
          <FileSpreadsheet aria-hidden /> Export tasks (CSV)
        </a>
      </div>
    </section>
  );
}

/**
 * Security (screen 5f): sign out of every device, and delete the account after typing the phrase.
 * The delete button only turns on once the phrase is typed.
 */
export function SecurityCard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const ready = typed.trim().toLowerCase() === DELETE_PHRASE;

  function signOutEverywhere() {
    startTransition(async () => {
      const result = await run(signOutEverywhereAction({}));
      if (!result.ok) return;
      router.replace("/sign-in");
      router.refresh();
    });
  }

  function deleteAccount() {
    startTransition(async () => {
      const result = await run(deleteAccountAction({ confirm: typed }));
      if (!result.ok) return;
      toast.success("Your account and everything in it are gone.");
      router.replace("/sign-in");
      router.refresh();
    });
  }

  return (
    <section id="security" aria-labelledby="security-title" className={cn(card, "pb-4")}>
      <CardTitle id="security-title">Security</CardTitle>
      <div className={row}>
        <span className="text-[14px]">Sign out of every device, including this one</span>
        <button
          type="button"
          disabled={pending}
          onClick={signOutEverywhere}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-dash-edge bg-dash-card px-4 text-[13px] font-semibold outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:h-9"
        >
          <LogOut aria-hidden className="size-3.5" />
          Sign out everywhere
        </button>
      </div>
      <div className="border-t border-dash-edge pt-3">
        <button
          type="button"
          aria-expanded={deleting}
          onClick={() => setDeleting((d) => !d)}
          className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-dash-bad outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
        >
          <TriangleAlert aria-hidden className="size-4" />
          Delete account
        </button>
        {deleting ? (
          <div className="mt-1">
            <p className="text-[13px] text-dash-ink-soft">
              This permanently deletes all tasks, money entries and journal pages, and skips Trash.
              Export your data first. Type{" "}
              <b className="font-mono text-dash-ink">{DELETE_PHRASE}</b> to confirm.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="delete-confirm" className="sr-only">
                Type {DELETE_PHRASE} to confirm
              </label>
              <input
                id="delete-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="h-11 min-w-0 flex-1 rounded-xl bg-dash-well px-3 font-mono text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10 md:text-sm"
              />
              <button
                type="button"
                disabled={!ready || pending}
                onClick={deleteAccount}
                className="h-11 shrink-0 rounded-full bg-dash-bad px-4 text-[14px] font-semibold text-white outline-none hover:bg-dash-bad/90 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-dash-well disabled:text-dash-ink-soft md:h-10 dark:text-dash-card"
              >
                Delete account
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** The in-page section list beside the cards with a mouse (screen 5f). */
export function SectionNav() {
  const items = [
    ["profile", "Profile"],
    ["preferences", "Preferences"],
    ["reports", "Reports"],
    ["data", "Your data"],
    ["security", "Security"],
    ["about", "About"],
  ];
  const [current, setCurrent] = useState("profile");
  return (
    <nav aria-label="Settings sections" className="sticky top-10 hidden self-start lg:block">
      <ul className="flex w-44 flex-col gap-1">
        {items.map(([id, label]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={() => setCurrent(id)}
              aria-current={current === id ? "true" : undefined}
              className={cn(
                "flex h-9 items-center rounded-full px-3 text-sm outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
                current === id
                  ? "bg-dash-card font-medium text-dash-ink shadow-(--dash-lift)"
                  : "text-dash-ink-soft hover:bg-dash-track hover:text-dash-ink",
              )}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
