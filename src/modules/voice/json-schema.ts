import { ENTRY_KINDS_BY_VOICE, PRIORITY_WORDS } from "./schema";

/**
 * The JSON schema sent to Groq with `response_format: { type: "json_schema", strict: true }`
 * (docs/voice-spec.md §6). Strict mode needs every property listed in `required`,
 * `additionalProperties: false` on every object, and `null` unions for "not said". It mirrors
 * `modelReply` in schema.ts; json-schema.test.ts keeps the two in step.
 */

const str = { type: "string" } as const;
const strOrNull = { type: ["string", "null"] } as const;
const bool = { type: "boolean" } as const;

function variant(type: string, properties: Record<string, unknown>, description: string) {
  const all = { type: { type: "string", enum: [type] }, ...properties };
  return {
    type: "object",
    description,
    properties: all,
    required: Object.keys(all),
    additionalProperties: false,
  };
}

export const VOICE_ACTION_VARIANTS = {
  create_list: variant(
    "create_list",
    { ref: str, name: str },
    "A new list. `ref` is a short label such as L1 that tasks in the same command use in listRef.",
  ),
  create_task: variant(
    "create_task",
    {
      title: str,
      list: strOrNull,
      listRef: strOrNull,
      dueDate: strOrNull,
      dueTime: strOrNull,
      priority: { type: "string", enum: [...PRIORITY_WORDS] },
      notes: strOrNull,
    },
    "A new task. `list` is an existing list name exactly as given, or null; `listRef` points at a create_list in this command. Dates YYYY-MM-DD, times HH:MM (24h).",
  ),
  log_entry: variant(
    "log_entry",
    {
      kind: { type: "string", enum: [...ENTRY_KINDS_BY_VOICE] },
      amount: str,
      title: str,
      category: strOrNull,
      categoryGuessed: bool,
      paymentMethod: strOrNull,
      spendLabel: { type: ["string", "null"], enum: ["need", "want", null] },
      spendLabelGuessed: bool,
      date: strOrNull,
      currencyWord: strOrNull,
    },
    "Money spent (expense), received (income) or invested (investment). `amount` is digits in major units, e.g. 7000 or 499.50.",
  ),
  mark_emi_paid: variant(
    "mark_emi_paid",
    { emi: strOrNull, amount: strOrNull, paidOn: strOrNull },
    "Marks one of the listed unpaid EMIs paid. `emi` is its reference (E1, E2, ...) or null when none matches.",
  ),
  unclear: variant(
    "unclear",
    { text: str, reason: str },
    "Words that could not be turned into an action.",
  ),
} as const;

export const VOICE_JSON_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: { anyOf: Object.values(VOICE_ACTION_VARIANTS) },
    },
  },
  required: ["actions"],
  additionalProperties: false,
} as const;
