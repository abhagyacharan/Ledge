import { addDaysIso, isIsoDate, isIsoTime } from "@/lib/dates";
import { formatMoney, parseMoney } from "@/lib/money";
import { CATEGORIES_BY_KIND, PAYMENT_METHODS } from "@/modules/expenses/categories";
import {
  MAX_VOICE_ACTIONS,
  type ModelAction,
  type ModelReply,
  type PlanItem,
  PRIORITY_WORDS,
} from "./schema";

/**
 * Turns the model's reply into the plan the review sheet shows (docs/voice-spec.md §6, "the
 * resolver"). Pure: the server passes in the user's lists and unpaid EMIs. The model never sees
 * ids; anything it returns that does not match the user's real data falls back to a default or
 * asks O to choose. Nothing here saves; `applyVoicePlanAction` checks everything again.
 */

export type ResolveList = { id: string; name: string; isInbox: boolean };
export type ResolveEmi = {
  ref: string;
  id: string;
  title: string;
  category: string;
  amountMinor: number;
  entryDate: string;
};
export type ResolveContext = {
  today: string;
  currency: string;
  locale: string;
  lists: ResolveList[];
  emis: ResolveEmi[];
  lastPaymentMethod?: string | null;
};

const DEFAULT_CATEGORY = {
  expense: "Miscellaneous",
  income: "Other income",
  investment: "Other",
} as const;

/** How far from today a spoken date may be before it is treated as a mishearing. */
const DATE_WINDOW_DAYS = 366;

const fold = (text: string) => text.normalize("NFKD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function dateWithin(value: string | null, today: string): string | null {
  if (!value || !isIsoDate(value)) return null;
  if (value < addDaysIso(today, -DATE_WINDOW_DAYS) || value > addDaysIso(today, DATE_WINDOW_DAYS)) {
    return null;
  }
  return value;
}

function hhmm(value: string | null): string | null {
  if (!value || !isIsoTime(value)) return null;
  return value.slice(0, 5);
}

function amountFrom(text: string | null, currency: string): number | null {
  if (!text) return null;
  const parsed = parseMoney(text, currency);
  return parsed.ok && parsed.minor > 0 ? parsed.minor : null;
}

function currencySymbol(currency: string, locale: string): string {
  const part = new Intl.NumberFormat(locale, { style: "currency", currency })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? currency;
}

const RUPEE_WORDS = new Set(["rupee", "rupees", "rs", "inr", "₹", "rupaye", "rupiya"]);

export function resolvePlan(reply: ModelReply, context: ResolveContext): PlanItem[] {
  const items: PlanItem[] = [];
  let counter = 0;
  const nextKey = () => `v${++counter}`;

  const inbox = context.lists.find((l) => l.isInbox) ?? context.lists[0];
  const existingByName = new Map(context.lists.map((l) => [fold(l.name), l.id]));
  /** create_list refs and spoken new names, pointing at a new list's key or an existing id. */
  const listTargets = new Map<string, { listKey: string } | { listId: string }>();
  const newListByName = new Map<string, string>();

  const newList = (name: string): string => {
    const folded = fold(name);
    const known = newListByName.get(folded);
    if (known) return known;
    const key = nextKey();
    items.push({ type: "list", key, name: name.trim().slice(0, 100) });
    newListByName.set(folded, key);
    return key;
  };

  const actions: ModelAction[] = reply.actions.slice(0, MAX_VOICE_ACTIONS);

  for (const action of actions) {
    switch (action.type) {
      case "create_list": {
        const name = action.name.trim();
        if (!name) break;
        const existing = existingByName.get(fold(name));
        listTargets.set(action.ref, existing ? { listId: existing } : { listKey: newList(name) });
        break;
      }

      case "create_task": {
        const title = action.title.trim();
        if (!title) break;
        let listId: string | null = null;
        let listKey: string | null = null;
        const byRef = action.listRef ? listTargets.get(action.listRef) : undefined;
        if (byRef) {
          if ("listKey" in byRef) listKey = byRef.listKey;
          else listId = byRef.listId;
        } else if (action.list?.trim()) {
          const existing = existingByName.get(fold(action.list));
          if (existing) listId = existing;
          else listKey = newList(action.list);
        }
        if (!listId && !listKey) listId = inbox?.id ?? null;

        let dueDate = dateWithin(action.dueDate, context.today);
        const dueTime = hhmm(action.dueTime);
        if (dueTime && !dueDate) dueDate = context.today;
        items.push({
          type: "task",
          key: nextKey(),
          title: title.slice(0, 500),
          listId,
          listKey,
          dueDate,
          dueTime: dueDate ? dueTime : null,
          priority: Math.max(0, PRIORITY_WORDS.indexOf(action.priority)),
          notes: action.notes?.trim() || null,
        });
        break;
      }

      case "log_entry": {
        const hints: string[] = [];
        const amountMinor = amountFrom(action.amount, context.currency);
        if (amountMinor === null) hints.push(`Couldn't read the amount ("${action.amount}")`);

        const allowed = CATEGORIES_BY_KIND[action.kind];
        const categoryOk = action.category !== null && allowed.includes(action.category);
        const category =
          categoryOk && action.category ? action.category : DEFAULT_CATEGORY[action.kind];

        const isExpense = action.kind === "expense";
        const methods: readonly string[] = PAYMENT_METHODS;
        const paymentMethod = !isExpense
          ? null
          : action.paymentMethod && methods.includes(action.paymentMethod)
            ? action.paymentMethod
            : context.lastPaymentMethod && methods.includes(context.lastPaymentMethod)
              ? context.lastPaymentMethod
              : "UPI";

        const spoken = dateWithin(action.date, context.today);
        const entryDate = spoken ?? context.today;
        if (entryDate > context.today) hints.push("This is in the future");

        const word = action.currencyWord ? fold(action.currencyWord) : null;
        if (word && !RUPEE_WORDS.has(word)) {
          hints.push(
            `Heard "${action.currencyWord}", saved as ${currencySymbol(context.currency, context.locale)}`,
          );
        }

        items.push({
          type: "entry",
          key: nextKey(),
          kind: action.kind,
          amountMinor: amountMinor ?? 0,
          title: (action.title.trim() || category).slice(0, 200),
          category,
          paymentMethod,
          spendLabel: isExpense ? action.spendLabel : null,
          entryDate,
          guessed: {
            category: !categoryOk || action.categoryGuessed,
            spendLabel: isExpense && action.spendLabel !== null && action.spendLabelGuessed,
          },
          hints,
        });
        break;
      }

      case "mark_emi_paid": {
        if (context.emis.length === 0) {
          items.push({
            type: "unclear",
            key: nextKey(),
            text: action.amount ? `Paid an EMI of ${action.amount}` : "Paid an EMI",
            reason: "There are no unpaid EMIs to mark paid",
          });
          break;
        }
        const hints: string[] = [];
        const heard = amountFrom(action.amount, context.currency);
        const match = action.emi ? context.emis.find((e) => e.ref === action.emi) : undefined;
        let emiId: string | null = match?.id ?? null;
        if (match && heard !== null) {
          const gap = Math.abs(heard - match.amountMinor);
          if (gap * 100 > match.amountMinor) {
            emiId = null;
            hints.push(
              `Heard ${formatMoney(heard, context.currency, context.locale)}, but ${match.title} is ${formatMoney(match.amountMinor, context.currency, context.locale)}. Pick the EMI.`,
            );
          }
        }
        if (!match) hints.push("Pick which EMI you paid");
        items.push({
          type: "emi_paid",
          key: nextKey(),
          emiId,
          paidOn: dateWithin(action.paidOn, context.today) ?? context.today,
          heardAmountMinor: heard,
          hints,
        });
        break;
      }

      case "unclear": {
        if (!action.text.trim()) break;
        items.push({
          type: "unclear",
          key: nextKey(),
          text: action.text.trim(),
          reason: action.reason.trim() || "Not sure what to do with this",
        });
        break;
      }
    }
  }

  if (reply.actions.length > MAX_VOICE_ACTIONS) {
    items.push({
      type: "unclear",
      key: nextKey(),
      text: `${reply.actions.length - MAX_VOICE_ACTIONS} more things`,
      reason: "Too many things at once; try the rest in a second go",
    });
  }

  return items;
}

/** When the model's reply is unusable, the whole transcript becomes one card. */
export function unclearPlan(transcript: string, reason: string): PlanItem[] {
  return [{ type: "unclear", key: "v1", text: transcript, reason }];
}
