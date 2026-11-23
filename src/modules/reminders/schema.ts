import { z } from "zod";

/** Offsets a "before" reminder may use, in minutes (docs/reminders-spec.md §3). */
export const REMINDER_OFFSET_MINUTES = [5, 10, 15, 30, 60, 120, 1440] as const;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use a time like 09:00");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-24")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const check = new Date(Date.UTC(y, m - 1, d));
    return (
      check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d
    );
  }, "That date does not exist");

const offset = z
  .number()
  .refine(
    (v) => (REMINDER_OFFSET_MINUTES as readonly number[]).includes(v),
    "Not an allowed offset",
  );

/** One reminder choice on a task. */
export const reminderChoiceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("at_due") }),
  z.object({ kind: z.literal("before"), offsetMinutes: offset }),
  z.object({ kind: z.literal("custom"), date, time }),
]);
export type ReminderChoice = z.infer<typeof reminderChoiceSchema>;

/** The Settings default: none, at_due or before:<minutes>. */
export const reminderDefaultSchema = z
  .string()
  .regex(/^(none|at_due|before:(5|10|15|30|60|120|1440))$/, "Not a reminder choice");

export const reminderSettingsSchema = z
  .object({
    reminderDefault: reminderDefaultSchema,
    reminderMorningTime: time,
    quietStart: time.nullable(),
    quietEnd: time.nullable(),
  })
  .refine((v) => (v.quietStart === null) === (v.quietEnd === null), {
    message: "Set both quiet hours times, or neither",
    path: ["quietEnd"],
  });
export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;

/** Push services Ledge will post to: Chrome and Android, Apple, Firefox, Edge on Windows. */
const PUSH_HOSTS = ["fcm.googleapis.com", "updates.push.services.mozilla.com"];
const PUSH_HOST_SUFFIXES = [".push.apple.com", ".notify.windows.com"];

/**
 * True when `endpoint` is an https address at a known browser push service, with no port, no
 * user name and no IP address. The server posts to this address, so anything else (a machine on
 * the home network, say) is refused.
 */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  // IPv6 literals keep their brackets; an IPv4 literal is all digits and dots.
  if (host.startsWith("[") || /^[\d.]+$/.test(host)) return false;
  return (
    PUSH_HOSTS.includes(host) ||
    PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length)
  );
}

/** A browser's push subscription as `PushSubscription.toJSON()` gives it. */
export const pushSubscriptionSchema = z.object({
  endpoint: z
    .url()
    .max(2048)
    .refine(isAllowedPushEndpoint, "That push address is not a known push service"),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/** Turns a stored default ("before:30") into a choice. */
export function parseReminderDefault(value: string): ReminderChoice {
  if (value === "at_due") return { kind: "at_due" };
  const match = /^before:(\d+)$/.exec(value);
  if (match) {
    const parsed = reminderChoiceSchema.safeParse({
      kind: "before",
      offsetMinutes: Number(match[1]),
    });
    if (parsed.success) return parsed.data;
  }
  return { kind: "none" };
}
