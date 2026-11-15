import { z } from "zod";

/** What a person types to delete their account (docs/new_design.md screen 5f). */
export const DELETE_PHRASE = "delete my ledge";

/** Whether `zone` is an IANA time zone this runtime knows ("Asia/Kolkata"). */
export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export const preferencesSchema = z
  .object({
    timezone: z.string().max(64).refine(isTimeZone, "Pick a time zone from the list.").optional(),
    weekStartsOn: z.union([z.literal(1), z.literal(7)]).optional(),
    theme: z.enum(["system", "light", "dark"]).optional(),
  })
  .strict();

export const deleteAccountSchema = z.object({
  confirm: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((s) => s === DELETE_PHRASE, `Type "${DELETE_PHRASE}" to confirm.`),
});
