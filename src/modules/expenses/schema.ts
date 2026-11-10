import { z } from "zod";
import { isIsoDate } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import { EMI_STATUSES } from "@/server/db/schema";
import {
  EMI_CATEGORIES,
  EMI_TYPES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INVESTMENT_TYPES,
  PAYMENT_METHODS,
} from "./categories";
import { MAX_EXTRA_MONTHS } from "./emi-series";

/** Zod schemas for the expense tracker, shared by the server actions and the forms. */

const id = z.uuid("Invalid id");
const date = z.string().refine(isIsoDate, "Enter a valid date");

const title = z.string().trim().min(1, "Enter a name").max(200, "Use at most 200 characters");

/** Optional text: blank becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const notes = optionalText(1000);

/** Typed amount ("1,234.50") to integer paise. Never goes through floating point. */
const amount = z.string().transform((value, ctx) => {
  const parsed = parseMoney(value);
  if (!parsed.ok) {
    ctx.addIssue({ code: "custom", message: parsed.error });
    return z.NEVER;
  }
  if (parsed.minor <= 0) {
    ctx.addIssue({ code: "custom", message: "Enter an amount above zero" });
    return z.NEVER;
  }
  return parsed.minor;
});

const oneOf = <const T extends readonly [string, ...string[]]>(list: T, message: string) =>
  z.enum(list, { error: message });

const incomeFields = {
  kind: z.literal("income"),
  entryDate: date,
  title,
  category: oneOf(INCOME_CATEGORIES, "Pick a category"),
  amount,
  notes,
};

const emiFields = {
  kind: z.literal("emi"),
  /** The due date; it decides which month the EMI belongs to. */
  entryDate: date,
  title,
  lender: optionalText(120),
  emiType: oneOf(EMI_TYPES, "Pick a type"),
  category: oneOf(EMI_CATEGORIES, "Pick a category"),
  amount,
  status: z.enum(EMI_STATUSES, { error: "Pick a status" }),
  paidOn: date.nullable().optional(),
  notes,
};

const expenseFields = {
  kind: z.literal("expense"),
  entryDate: date,
  title,
  category: oneOf(EXPENSE_CATEGORIES, "Pick a category"),
  paymentMethod: oneOf(PAYMENT_METHODS, "Pick a payment method"),
  amount,
  notes,
};

const investmentFields = {
  kind: z.literal("investment"),
  entryDate: date,
  title,
  category: oneOf(INVESTMENT_TYPES, "Pick a type"),
  platform: optionalText(120),
  amount,
  notes,
};

/** "Paid on" only makes sense for a paid EMI. */
function emiRules<T extends { status: string; paidOn?: string | null }>(
  value: T,
  ctx: z.RefinementCtx,
) {
  if (value.paidOn && value.status !== "paid") {
    ctx.addIssue({
      code: "custom",
      path: ["paidOn"],
      message: "Only a paid EMI has a paid-on date",
    });
  }
}

const emiCreate = z
  .object({
    ...emiFields,
    /** Also create this EMI for the next N months, as Scheduled. */
    repeatMonths: z.number().int().min(0).max(MAX_EXTRA_MONTHS).default(0),
  })
  .superRefine(emiRules);

export const createEntrySchema = z.discriminatedUnion("kind", [
  z.object(incomeFields),
  emiCreate,
  z.object(expenseFields),
  z.object(investmentFields),
]);

export const updateEntrySchema = z.discriminatedUnion("kind", [
  z.object({ id, ...incomeFields }),
  z.object({ id, ...emiFields }).superRefine(emiRules),
  z.object({ id, ...expenseFields }),
  z.object({ id, ...investmentFields }),
]);

export const entryIdSchema = z.object({ id });
export const markPaidSchema = z.object({ id, paidOn: date });

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

/** Flattens Zod issues to the first message per field, for forms. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export const SORTS = ["newest", "oldest", "highest", "lowest"] as const;
export type EntrySort = (typeof SORTS)[number];
export const SORT_LABELS: Record<EntrySort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  highest: "Highest amount",
  lowest: "Lowest amount",
};

/** Reads `?sort=`, `?cat=` and `?q=` for an entries tab, ignoring anything invalid. */
export function parseEntryFilters(
  params: Record<string, string | string[] | undefined>,
  categories: readonly string[],
): { sort: EntrySort; category: string | null; q: string } {
  const one = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key]);
  const sort = one("sort");
  const cat = one("cat");
  return {
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as EntrySort) : "newest",
    category: cat && categories.includes(cat) ? cat : null,
    q: (one("q") ?? "").trim().slice(0, 100),
  };
}
