import { z } from "zod";
import { isIsoDate } from "@/lib/dates";

/**
 * Voice capture shapes (docs/voice-spec.md §6). Three layers:
 *  1. `modelReply`: what the language model must return (mirrors json-schema.ts, strict mode);
 *  2. `voicePlan`: what the review sheet shows and edits, after the server checked it;
 *  3. the same plan sent back to `applyVoicePlanAction`, validated again before anything is saved.
 */

export const ENTRY_KINDS_BY_VOICE = ["expense", "income", "investment"] as const;
export const PRIORITY_WORDS = ["none", "low", "medium", "high"] as const;
export const MAX_VOICE_ACTIONS = 10;
export const MAX_TRANSCRIPT = 2000;

const nullableString = z.string().nullable();

// ---------------------------------------------------------------------------------------------
// 1. The model's reply. Every field is present (strict structured outputs); null means "not said".

export const modelCreateList = z.object({
  type: z.literal("create_list"),
  ref: z.string(),
  name: z.string(),
});

export const modelCreateTask = z.object({
  type: z.literal("create_task"),
  title: z.string(),
  list: nullableString,
  listRef: nullableString,
  dueDate: nullableString,
  dueTime: nullableString,
  priority: z.enum(PRIORITY_WORDS),
  notes: nullableString,
});

export const modelLogEntry = z.object({
  type: z.literal("log_entry"),
  kind: z.enum(ENTRY_KINDS_BY_VOICE),
  amount: z.string(),
  title: z.string(),
  category: nullableString,
  categoryGuessed: z.boolean(),
  paymentMethod: nullableString,
  spendLabel: z.enum(["need", "want"]).nullable(),
  spendLabelGuessed: z.boolean(),
  date: nullableString,
  currencyWord: nullableString,
});

export const modelMarkEmiPaid = z.object({
  type: z.literal("mark_emi_paid"),
  emi: nullableString,
  amount: nullableString,
  paidOn: nullableString,
});

export const modelUnclear = z.object({
  type: z.literal("unclear"),
  text: z.string(),
  reason: z.string(),
});

export const modelAction = z.discriminatedUnion("type", [
  modelCreateList,
  modelCreateTask,
  modelLogEntry,
  modelMarkEmiPaid,
  modelUnclear,
]);

export const modelReply = z.object({ actions: z.array(modelAction) });

export type ModelAction = z.infer<typeof modelAction>;
export type ModelReply = z.infer<typeof modelReply>;

// ---------------------------------------------------------------------------------------------
// 2 and 3. The plan the review sheet shows, edits and sends back to be saved.

const key = z.string().min(1).max(40);
const isoDate = z.string().refine(isIsoDate, "Pick a valid date");
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a valid time")
  .nullable();

export const planList = z.object({
  type: z.literal("list"),
  key,
  name: z.string().trim().min(1, "Give the list a name").max(100),
});

export const planTask = z.object({
  type: z.literal("task"),
  key,
  title: z.string().trim().min(1, "Give the task a title").max(500),
  /** An existing list of the user's, or null when it goes into a list made in this plan. */
  listId: z.uuid().nullable(),
  /** The `key` of a `list` item in the same plan. */
  listKey: key.nullable(),
  dueDate: isoDate.nullable(),
  dueTime: time,
  priority: z.number().int().min(0).max(3),
  notes: z.string().max(10000).nullable(),
});

export const planEntry = z.object({
  type: z.literal("entry"),
  key,
  kind: z.enum(ENTRY_KINDS_BY_VOICE),
  amountMinor: z.number().int().positive("Enter an amount").max(1_000_000_000_00),
  title: z.string().trim().min(1, "Give it a name").max(200),
  category: z.string().min(1),
  paymentMethod: z.string().nullable(),
  spendLabel: z.enum(["need", "want"]).nullable(),
  entryDate: isoDate,
  /** Fields the AI filled in by itself; the review sheet marks them. */
  guessed: z.object({ category: z.boolean(), spendLabel: z.boolean() }),
  /** Short notes for the card, e.g. "Heard 'dollars', saved as ₹". Not saved. */
  hints: z.array(z.string().max(200)).max(5),
});

export const planEmiPaid = z.object({
  type: z.literal("emi_paid"),
  key,
  /** Null until O picks the EMI when none matched clearly. */
  emiId: z.uuid().nullable(),
  paidOn: isoDate,
  heardAmountMinor: z.number().int().nonnegative().nullable(),
  hints: z.array(z.string().max(200)).max(5),
});

export const planUnclear = z.object({
  type: z.literal("unclear"),
  key,
  text: z.string().max(MAX_TRANSCRIPT),
  reason: z.string().max(300),
});

export const planItem = z.discriminatedUnion("type", [
  planList,
  planTask,
  planEntry,
  planEmiPaid,
  planUnclear,
]);

export type PlanItem = z.infer<typeof planItem>;
export type PlanList = z.infer<typeof planList>;
export type PlanTask = z.infer<typeof planTask>;
export type PlanEntry = z.infer<typeof planEntry>;
export type PlanEmiPaid = z.infer<typeof planEmiPaid>;

/** An unpaid EMI the review sheet can offer in its picker. */
export type EmiChoice = {
  id: string;
  title: string;
  category: string;
  amountMinor: number;
  entryDate: string;
};

export type VoicePlan = {
  transcript: string;
  items: PlanItem[];
  /** For the EMI picker on an emi_paid card. */
  emis: EmiChoice[];
};

/** What `applyVoicePlanAction` accepts: the edited items (unclear ones are dropped first). */
export const applyVoicePlanInput = z
  .object({
    items: z
      .array(planItem)
      .min(1, "Nothing to add")
      .max(MAX_VOICE_ACTIONS * 2),
  })
  .superRefine((value, ctx) => {
    const keys = new Set<string>();
    const listKeys = new Set(value.items.filter((i) => i.type === "list").map((i) => i.key));
    value.items.forEach((item, index) => {
      if (keys.has(item.key)) {
        ctx.addIssue({ code: "custom", path: ["items", index], message: "Repeated item" });
      }
      keys.add(item.key);
      if (item.type === "task") {
        const target = (item.listId ? 1 : 0) + (item.listKey ? 1 : 0);
        if (target > 1 || (item.listKey && !listKeys.has(item.listKey))) {
          ctx.addIssue({ code: "custom", path: ["items", index], message: "Pick a list" });
        }
      }
      if (item.type === "emi_paid" && !item.emiId) {
        ctx.addIssue({ code: "custom", path: ["items", index], message: "Pick which EMI" });
      }
    });
  });

export type ApplyVoicePlanInput = z.infer<typeof applyVoicePlanInput>;

/** What a save returns, so one Undo can take the whole command back. */
export type VoiceReceipt = {
  listIds: string[];
  taskIds: string[];
  entryIds: string[];
  emis: { id: string; status: "scheduled" | "paid" | "delayed"; paidOn: string | null }[];
  summary: string;
};

export const undoVoiceInput = z.object({
  listIds: z.array(z.uuid()).max(MAX_VOICE_ACTIONS * 2),
  taskIds: z.array(z.uuid()).max(MAX_VOICE_ACTIONS * 2),
  entryIds: z.array(z.uuid()).max(MAX_VOICE_ACTIONS * 2),
  emis: z
    .array(
      z.object({
        id: z.uuid(),
        status: z.enum(["scheduled", "paid", "delayed"]),
        paidOn: isoDate.nullable(),
      }),
    )
    .max(MAX_VOICE_ACTIONS * 2),
});

/** The body of POST /api/voice/understand. */
export const understandInput = z.object({
  text: z.string().trim().min(1, "Say or type something").max(MAX_TRANSCRIPT),
  lastPaymentMethod: z.string().max(40).nullable().optional(),
});
