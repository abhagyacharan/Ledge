import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INVESTMENT_TYPES,
  PAYMENT_METHODS,
} from "@/modules/expenses/categories";

/**
 * What the language model is told (docs/voice-spec.md §6). Pure, so it can be tested and so the
 * fixed system prompt stays byte-identical between requests.
 */

export type PromptEmi = {
  ref: string;
  title: string;
  category: string;
  amount: string;
  dueDate: string;
};

export type PromptContext = {
  today: string;
  weekday: string;
  timeZone: string;
  currency: string;
  lists: string[];
  emis: PromptEmi[];
};

export const VOICE_SYSTEM_PROMPT = `You turn what a person said into actions for Ledge, their personal task list and expense tracker. The words come from speech recognition, so expect small mishearings and fix obvious ones.

Return every action they asked for, in the order they said them. Never invent anything they did not say. Ignore greetings and filler.

Tasks (create_task)
- title: a short, clean task in their words, first letter capital, without the date, time, list or priority words ("Make blueberry cheesecake").
- list: one of their existing list names exactly as given in the context, when they name it. If they name a list that does not exist and do not ask to create it, still put the name they said. Otherwise null (it goes to General).
- When they ask to create a list, add a create_list first with ref L1 (then L2...), and give each task meant for it listRef L1 and list null.
- dueDate and dueTime only when they say when (today, tonight, tomorrow 5pm, next Friday, on the 5th). Work dates out from today in the context; "tonight" or "this evening" without a time is 20:00. A weekday means the next one after today.
- priority: high for "urgent", "important", "p1", "high priority"; medium for "p2"; low for "p3", "low priority"; otherwise none.
- notes only when they add details meant as notes.

Money (log_entry)
- kind: expense for spent, paid, bought, ordered; income for got, received, salary, refund; investment for invested, SIP, put into, bought shares or gold as savings.
- amount: digits only in major units. "7k" is 7000, "1.5 lakh" is 150000, "two fifty" is 250. Never round.
- currencyWord: the currency word they used if it is not rupees (for example "dollars"), else null. Keep the number as said.
- title: what it was for, short ("Petrol", "Red Bull cans", "Swiggy dinner", "Salary").
- category: exactly one name from the matching list in the context. categoryGuessed is false only when they named the category themselves.
- paymentMethod: one of the listed methods only when they said how they paid. GPay, Google Pay, PhonePe, Paytm, BHIM and "UPay" mean UPI. Plain "card" is null. Otherwise null.
- spendLabel (expenses only, else null): need for essentials (groceries, rent, bills, medicine, fuel, transport to work, school fees); want for treats, eating out, entertainment, gadgets, shopping for fun. spendLabelGuessed is false only when they said need or want themselves.
- date: the day it happened, worked out from today; null when not said.

EMIs (mark_emi_paid)
- When they say they paid an EMI or a loan instalment, match it to one of their unpaid EMIs in the context by name, loan type or amount, and give its ref (E1, E2...). If none matches clearly, emi is null. Do not also add a log_entry for it.
- amount: the amount they said, digits only, or null. paidOn: the day they paid, or null.

Anything you cannot turn into one of these goes in unclear, with the words and a short reason.`;

/** The user message: today's facts, their lists and EMIs, the fixed lists, then the words. */
export function buildUserMessage(context: PromptContext, transcript: string): string {
  const data = {
    today: context.today,
    weekday: context.weekday,
    timeZone: context.timeZone,
    currency: context.currency,
    lists: context.lists,
    unpaidEmis: context.emis,
    expenseCategories: EXPENSE_CATEGORIES,
    incomeCategories: INCOME_CATEGORIES,
    investmentTypes: INVESTMENT_TYPES,
    paymentMethods: PAYMENT_METHODS,
  };
  return `Context:\n${JSON.stringify(data, null, 1)}\n\nWhat they said:\n"""${transcript}"""`;
}

/**
 * Words Whisper should spell right (its `prompt` field, at most 224 tokens): their list names,
 * frequent entry titles and a few fixed words. Kept to about 600 characters.
 */
export function buildWhisperPrompt(lists: string[], recentTitles: string[]): string {
  const words = ["Ledge", "EMI", "UPI", "rupees", "lakh", "GPay", "PhonePe", "Swiggy", "Zomato"];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of [...lists, ...recentTitles, ...words]) {
    const clean = word.trim();
    const lower = clean.toLowerCase();
    if (!clean || seen.has(lower)) continue;
    if (out.join(", ").length + clean.length > 600) break;
    seen.add(lower);
    out.push(clean);
  }
  return out.join(", ");
}
