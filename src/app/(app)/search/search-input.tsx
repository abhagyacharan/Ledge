"use client";

import { CircleX, History, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isTouchDevice } from "@/lib/touch";

const RECENT_KEY = "ledge:recent-searches";
const RECENT_MAX = 5;
const subscribe = () => () => {};

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * The search bar (docs/new_design.md screen 5a): a white pill with the words, a clear button and
 * Cancel, which goes back Home. With a mouse the cursor starts in it; on a phone the keyboard
 * stays closed until you tap it (O, 2026-11-13). A finished search is remembered on this device.
 */
export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (!isTouchDevice()) ref.current?.focus();
  }, []);

  // Remember this search (a per-device convenience: the list can be empty and nothing breaks).
  useEffect(() => {
    const q = defaultValue.trim();
    if (!q) return;
    try {
      const next = [q, ...readRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())];
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_MAX)));
    } catch {
      // Storage blocked: nothing to remember.
    }
  }, [defaultValue]);

  return (
    <form action="/search" role="search" className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <label htmlFor="search-input" className="sr-only">
          Search everything
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-dash-ink-soft"
        />
        <input
          ref={ref}
          id="search-input"
          name="q"
          type="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search tasks and money"
          autoComplete="off"
          maxLength={200}
          className="h-12 w-full rounded-full border border-dash-edge bg-dash-card pr-11 pl-11 text-base text-dash-ink shadow-(--dash-card-shadow) outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/50 md:h-11 md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              ref.current?.focus();
            }}
            className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:size-9"
          >
            <CircleX aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      <Link
        href="/"
        className="inline-flex h-11 shrink-0 items-center rounded-full px-2 text-[14px] font-semibold text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Cancel
      </Link>
    </form>
  );
}

/** The searches made on this device, newest first, as chips (screen 5b). */
export function RecentSearches() {
  const router = useRouter();
  // Read from this device's storage after hydration (the server has none: empty).
  const raw = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(readRecent()),
    () => "[]",
  );
  const recent = JSON.parse(raw) as string[];
  if (recent.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[13px] text-dash-ink-soft">Recent</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {recent.map((q) => (
          <li key={q}>
            <button
              type="button"
              onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-dash-well px-3.5 text-[14px] font-medium text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-[13px]"
            >
              <History aria-hidden className="size-3.5" />
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
