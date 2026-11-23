import { z } from "zod";
import { voiceLanguagesSchema } from "@/modules/voice/languages";

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
    voiceEnabled: z.boolean().optional(),
    voiceLanguages: voiceLanguagesSchema.optional(),
    voiceTitleLanguage: z.enum(["english", "as_spoken"]).optional(),
    /** Paise per US dollar, for showing AI costs in rupees (8500 is Rs 85). */
    usdToInr: z.number().int().min(100).max(100000).optional(),
  })
  .strict();

export const deleteAccountSchema = z.object({
  confirm: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((s) => s === DELETE_PHRASE, `Type "${DELETE_PHRASE}" to confirm.`),
  /** The account password, when it has one (screen 9n). */
  password: z.string().max(200).optional(),
});

/** The name on the account (Settings › Account). */
export const nameSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(100, "Keep it under 100 characters."),
});
