import * as chrono from "chrono-node";
import { formatDue, type IsoDate, type IsoTime } from "@/lib/dates";

/**
 * Natural-language quick add (CLAUDE.md §6.2): "pay rent tomorrow 5pm #home p1".
 * Pure and client-safe. It finds, in this order of meaning:
 *   p1 p2 p3        priority (p1 = high, p2 = medium, p3 = low)
 *   #list           a list, matched by name (case, spaces and dashes ignored)
 *   a date / time   by chrono-node ("tomorrow", "next friday", "25 dec", "in 3 days 6pm")
 * Whatever is left is the title. Only words that really were understood become tokens, so
 * "#unknown" or "p4" stay in the title. A token the person removed (`ignored`) is plain text again.
 */

export type TokenKind = "date" | "priority" | "list";

export type QuickAddToken = {
  kind: TokenKind;
  /** The exact text in the input, e.g. "tomorrow 5pm". */
  raw: string;
  start: number;
  end: number;
  /** Human text for the chip, e.g. "Tomorrow, 5:00 pm". */
  label: string;
};

export type ParsedQuickAdd = {
  title: string;
  dueDate: IsoDate | null;
  dueTime: IsoTime | null;
  /** 0 to 3, or null when no priority was typed. */
  priority: number | null;
  listId: string | null;
  tokens: QuickAddToken[];
};

export type ParseContext = {
  today: IsoDate;
  timeNow: IsoTime;
  locale?: string;
  lists: { id: string; name: string }[];
  /** Keys from `tokenKey` for tokens the person removed. */
  ignored?: ReadonlySet<string>;
};

export const tokenKey = (token: Pick<QuickAddToken, "kind" | "raw">) =>
  `${token.kind}:${token.raw.toLowerCase()}`;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

const PRIORITY_BY_WORD: Record<string, number> = { p1: 3, p2: 2, p3: 1 };
const PRIORITY_NAMES = ["None", "Low", "Medium", "High"];

type Span = { start: number; end: number };
const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;
const pad = (n: number) => String(n).padStart(2, "0");

function findList(name: string, lists: ParseContext["lists"]) {
  const wanted = normalize(name);
  if (!wanted) return undefined;
  const exact = lists.find((l) => normalize(l.name) === wanted);
  if (exact) return exact;
  // A unique prefix is enough ("#open" for "Open source").
  const prefixed = lists.filter((l) => normalize(l.name).startsWith(wanted));
  return prefixed.length === 1 ? prefixed[0] : undefined;
}

export function parseQuickAdd(input: string, ctx: ParseContext): ParsedQuickAdd {
  const ignored = ctx.ignored ?? new Set<string>();
  const tokens: QuickAddToken[] = [];
  let priority: number | null = null;
  let listId: string | null = null;

  const add = (token: QuickAddToken) => {
    if (ignored.has(tokenKey(token))) return false;
    tokens.push(token);
    return true;
  };

  // Words that start a token must follow the start of the text or a space.
  for (const m of input.matchAll(/(?<=^|\s)p([1-3])(?=\s|$)/gi)) {
    const raw = m[0];
    const value = PRIORITY_BY_WORD[raw.toLowerCase()] ?? 0;
    const start = m.index ?? 0;
    // The first priority word wins; any later one stays in the title.
    if (
      priority === null &&
      add({
        kind: "priority",
        raw,
        start,
        end: start + raw.length,
        label: `Priority: ${PRIORITY_NAMES[value]}`,
      })
    ) {
      priority = value;
    }
  }

  for (const m of input.matchAll(/(?<=^|\s)#([\p{L}\p{N}_-]+)/gu)) {
    const list = findList(m[1], ctx.lists);
    if (!list || listId) continue;
    const start = m.index ?? 0;
    if (
      add({ kind: "list", raw: m[0], start, end: start + m[0].length, label: `List: ${list.name}` })
    ) {
      listId = list.id;
    }
  }

  // Dates: look only at text that is not already part of another token.
  let masked = input;
  for (const t of tokens)
    masked = masked.slice(0, t.start) + " ".repeat(t.end - t.start) + masked.slice(t.end);

  let dueDate: IsoDate | null = null;
  let dueTime: IsoTime | null = null;
  const [year, month, day] = ctx.today.split("-").map(Number);
  const [hour, minute] = ctx.timeNow.split(":").map(Number);
  // Built from numbers, so the machine's own timezone cannot shift the date.
  const reference = new Date(year, month - 1, day, hour, minute);
  const parser = (ctx.locale ?? "en-IN") === "en-US" ? chrono.en.casual : chrono.en.GB;
  for (const result of parser.parse(masked, reference, { forwardDate: true })) {
    const span = { start: result.index, end: result.index + result.text.length };
    const raw = input.slice(span.start, span.end);
    if (tokens.some((t) => overlaps(t, span))) continue;
    const date = `${result.start.get("year")}-${pad(result.start.get("month") ?? 1)}-${pad(result.start.get("day") ?? 1)}`;
    const time = result.start.isCertain("hour")
      ? `${pad(result.start.get("hour") ?? 0)}:${pad(result.start.get("minute") ?? 0)}`
      : null;
    const label = formatDue(date, time, ctx.today, ctx.locale);
    if (add({ kind: "date", raw, start: span.start, end: span.end, label })) {
      dueDate = date;
      dueTime = time;
    }
    break; // one due date per task
  }

  // The title is what is left once the understood words are cut out.
  let title = input;
  for (const t of [...tokens].sort((a, b) => b.start - a.start)) {
    title = title.slice(0, t.start) + " " + title.slice(t.end);
  }
  title = title.replace(/\s+/g, " ").trim();

  // Nothing but tokens ("tomorrow"): keep the words as the title instead of an empty task.
  if (title === "" && tokens.length > 0) {
    return {
      title: input.trim(),
      dueDate: null,
      dueTime: null,
      priority: null,
      listId: null,
      tokens: [],
    };
  }

  return {
    title,
    dueDate,
    dueTime,
    priority,
    listId,
    tokens: tokens.sort((a, b) => a.start - b.start),
  };
}
