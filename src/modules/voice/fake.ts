import { addDaysIso } from "@/lib/dates";
import type { ModelAction, ModelReply } from "./schema";
import type { PromptEmi } from "./prompt";

/**
 * VOICE_FAKE=1 (docs/voice-spec.md §11): a small rule-based stand-in for Groq, so voice capture
 * can be tried and tested end to end without an API key or network. It understands the spec's
 * example sentences and simple variations; the real model handles everything else.
 */

export const FAKE_TRANSCRIPT =
  "Spent 500 on petrol today and create a task to make blueberry cheesecake";

const CATEGORY_WORDS: [RegExp, string, "need" | "want"][] = [
  [/petrol|diesel|fuel|uber|ola|auto|metro|bus|cab|train/i, "Transportation", "need"],
  [/swiggy|zomato|dinner|lunch|restaurant|movie|cafe|coffee/i, "Dining & Entertainment", "want"],
  [/grocer|vegetable|milk|red bull|snack|fruit|bread/i, "Food & Groceries", "want"],
  [/rent|electric|water bill|wifi|internet|gas/i, "Housing & Utilities", "need"],
  [/medicine|doctor|pharmacy|hospital/i, "Healthcare", "need"],
  [/netflix|spotify|subscription|icloud/i, "Subscriptions & Tech", "want"],
];

function dayFrom(text: string, today: string): string | null {
  if (/\btomorrow\b/i.test(text)) return addDaysIso(today, 1);
  if (/\byesterday\b/i.test(text)) return addDaysIso(today, -1);
  if (/\btoday\b|\btonight\b/i.test(text)) return today;
  return null;
}

const tidy = (text: string) =>
  text
    .replace(/\b(today|tomorrow|yesterday|tonight)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,]$/, "");

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function task(title: string, today: string, listRef: string | null = null): ModelAction {
  return {
    type: "create_task",
    title: capital(tidy(title)),
    list: null,
    listRef,
    dueDate: dayFrom(title, today),
    dueTime: null,
    priority: "none",
    notes: null,
  };
}

function clause(text: string, today: string, emis: PromptEmi[]): ModelAction[] {
  if (/\b(paid|pay)\b/i.test(text) && /\b(emi|loan|instalment)\b/i.test(text) && emis.length > 0) {
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !["emi", "loan", "the", "paid", "pay"].includes(w));
    const match = emis.find((e) => words.some((w) => e.title.toLowerCase().includes(w))) ?? emis[0];
    const amount = /([\d][\d,]*)/.exec(text)?.[1]?.replace(/,/g, "") ?? null;
    return [{ type: "mark_emi_paid", emi: match.ref, amount, paidOn: dayFrom(text, today) }];
  }

  const money =
    /(spent|paid|bought|got|received|invested)\s+(?:₹|rs\.?|\$)?\s*([\d,]+(?:\.\d+)?)\s*(rupees|dollars)?\s*(?:on|for|in|from)?\s*(.*)/i.exec(
      text,
    );
  if (money) {
    const verb = money[1].toLowerCase();
    const kind =
      verb === "invested"
        ? "investment"
        : verb === "got" || verb === "received"
          ? "income"
          : "expense";
    const what = tidy(money[4].replace(/\b(via|using|with|by)\s+\w+\b/i, "")) || "Expense";
    const hit = CATEGORY_WORDS.find(([pattern]) => pattern.test(what));
    const upi = /\b(upi|gpay|phonepe|paytm|upay)\b/i.test(text);
    const cash = /\bcash\b/i.test(text);
    return [
      {
        type: "log_entry",
        kind,
        amount: money[2].replace(/,/g, ""),
        title: capital(what),
        category:
          kind === "expense"
            ? (hit?.[1] ?? "Miscellaneous")
            : kind === "income"
              ? "Salary"
              : "Mutual fund",
        categoryGuessed: true,
        paymentMethod: upi ? "UPI" : cash ? "Cash" : null,
        spendLabel: kind === "expense" ? (hit?.[2] ?? null) : null,
        spendLabelGuessed: true,
        date: dayFrom(text, today),
        currencyWord:
          money[3]?.toLowerCase() === "dollars" || text.includes("$") ? "dollars" : null,
      },
    ];
  }

  const list = /create (?:a )?list (?:called|named) (.+?)(?:,|\band\b|$)(.*)/i.exec(text);
  if (list) {
    const actions: ModelAction[] = [
      { type: "create_list", ref: "L1", name: capital(tidy(list[1])) },
    ];
    const rest = list[2].replace(/^.*?tasks?\s*(?:such as|like|:)?\s*/i, "");
    for (const part of rest.split(/\s+and\s+|,\s*/)) {
      if (part.trim()) actions.push(task(part, today, "L1"));
    }
    return actions;
  }

  const newTask = /(?:create|add|make) (?:a )?(?:new )?task (?:to )?(.+)/i.exec(text);
  if (newTask) return [task(newTask[1], today)];

  return [{ type: "unclear", text: text.trim(), reason: "Not sure what to do with this" }];
}

// Romanised Hindi and Telugu: "kal" with a future verb and "repu" mean tomorrow.
const INDIAN_MARKERS = /\b(kal|repu|hai|lena|jaana|vellali|kharch|kiye|chesanu|pe|ki)\b/i;
const INDIAN_TASKS: [RegExp, string][] = [
  [/\b(doodh|dudh|milk)\b.*\b(lena|chahiye)\b/i, "Buy milk"],
  [/\bgym\b.*\b(vellali|jaana|jana)\b/i, "Go to the gym"],
];

/** A Hindi or Telugu sentence with a task and an amount ("450 lunch pe", "200 auto ki"). */
function indianReply(text: string, today: string): ModelAction[] | null {
  if (!INDIAN_MARKERS.test(text) || /\b(spent|paid|create|add)\b/i.test(text)) return null;
  const task = INDIAN_TASKS.find(([pattern]) => pattern.test(text));
  const spent = /(\d[\d,]*)\s+([a-z]+)\s+(?:pe|par|ki|ke liye)\b/i.exec(text);
  if (!task && !spent) return null;
  const actions: ModelAction[] = [];
  if (task) {
    actions.push({
      type: "create_task",
      title: task[1],
      list: null,
      listRef: null,
      dueDate: /\b(kal|repu)\b/i.test(text) ? addDaysIso(today, 1) : null,
      dueTime: null,
      priority: "none",
      notes: null,
    });
  }
  if (spent) {
    const what = spent[2];
    const hit = CATEGORY_WORDS.find(([pattern]) => pattern.test(what));
    actions.push({
      type: "log_entry",
      kind: "expense",
      amount: spent[1].replace(/,/g, ""),
      title: capital(what),
      category: hit?.[1] ?? "Miscellaneous",
      categoryGuessed: true,
      paymentMethod: null,
      spendLabel: hit?.[2] ?? null,
      spendLabelGuessed: true,
      date: null,
      currencyWord: null,
    });
  }
  return actions;
}

export function fakeReply(transcript: string, today: string, emis: PromptEmi[]): ModelReply {
  const indian = indianReply(transcript, today);
  if (indian) return { actions: indian };
  // "... and create a task ..." splits into two clauses; a list's own "and" stays with the list.
  const parts = /create (?:a )?list/i.test(transcript)
    ? [transcript]
    : transcript.split(/\s+and\s+(?=(?:create|add|spent|paid|got|received|invested)\b)/i);
  return { actions: parts.flatMap((part) => clause(part, today, emis)) };
}
