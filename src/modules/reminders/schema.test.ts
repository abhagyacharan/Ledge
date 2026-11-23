import { describe, expect, it } from "vitest";
import {
  parseReminderDefault,
  pushSubscriptionSchema,
  reminderChoiceSchema,
  reminderSettingsSchema,
} from "./schema";

describe("reminderChoiceSchema", () => {
  it("accepts each kind", () => {
    expect(reminderChoiceSchema.safeParse({ kind: "none" }).success).toBe(true);
    expect(reminderChoiceSchema.safeParse({ kind: "at_due" }).success).toBe(true);
    expect(reminderChoiceSchema.safeParse({ kind: "before", offsetMinutes: 1440 }).success).toBe(
      true,
    );
    expect(
      reminderChoiceSchema.safeParse({ kind: "custom", date: "2026-02-28", time: "09:30" }).success,
    ).toBe(true);
  });

  it("rejects odd offsets, missing fields and impossible dates", () => {
    expect(reminderChoiceSchema.safeParse({ kind: "before", offsetMinutes: 7 }).success).toBe(
      false,
    );
    expect(reminderChoiceSchema.safeParse({ kind: "before" }).success).toBe(false);
    expect(
      reminderChoiceSchema.safeParse({ kind: "custom", date: "2026-02-30", time: "09:30" }).success,
    ).toBe(false);
    expect(
      reminderChoiceSchema.safeParse({ kind: "custom", date: "2026-02-28", time: "25:00" }).success,
    ).toBe(false);
    expect(reminderChoiceSchema.safeParse({ kind: "soon" }).success).toBe(false);
  });
});

describe("reminderSettingsSchema", () => {
  const base = { reminderDefault: "none", reminderMorningTime: "09:00" };
  it("needs both quiet hours or neither", () => {
    expect(
      reminderSettingsSchema.safeParse({ ...base, quietStart: null, quietEnd: null }).success,
    ).toBe(true);
    expect(
      reminderSettingsSchema.safeParse({ ...base, quietStart: "23:00", quietEnd: "07:00" }).success,
    ).toBe(true);
    expect(
      reminderSettingsSchema.safeParse({ ...base, quietStart: "23:00", quietEnd: null }).success,
    ).toBe(false);
  });

  it("only accepts known defaults", () => {
    const ok = (reminderDefault: string) =>
      reminderSettingsSchema.safeParse({
        ...base,
        reminderDefault,
        quietStart: null,
        quietEnd: null,
      }).success;
    expect(ok("before:30")).toBe(true);
    expect(ok("at_due")).toBe(true);
    expect(ok("before:7")).toBe(false);
    expect(ok("custom")).toBe(false);
  });
});

describe("pushSubscriptionSchema", () => {
  const keys = { p256dh: "abc", auth: "def" };
  it("needs an https endpoint and both keys", () => {
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: "https://push.example/x", keys }).success,
    ).toBe(true);
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: "http://push.example/x", keys }).success,
    ).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ endpoint: "not a url", keys }).success).toBe(false);
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://push.example/x",
        keys: { p256dh: "abc" },
      }).success,
    ).toBe(false);
  });
});

describe("parseReminderDefault", () => {
  it("reads stored defaults", () => {
    expect(parseReminderDefault("none")).toEqual({ kind: "none" });
    expect(parseReminderDefault("at_due")).toEqual({ kind: "at_due" });
    expect(parseReminderDefault("before:60")).toEqual({ kind: "before", offsetMinutes: 60 });
    expect(parseReminderDefault("garbage")).toEqual({ kind: "none" });
  });
});
