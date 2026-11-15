import "server-only";

/**
 * Per-user limits for the voice routes (docs/voice-spec.md §9): 20 requests a minute and a daily
 * cap. Kept in memory: Ledge runs as one server process, and a restart only resets the counts.
 * The clock is a parameter so tests can move time.
 */

const PER_MINUTE = 20;

type Bucket = { minuteStart: number; minuteCount: number; day: string; dayCount: number };

const buckets = new Map<string, Bucket>();

export type LimitResult = { ok: true } | { ok: false; reason: "minute" | "day" };

export function takeVoiceRequest(
  userId: string,
  dailyLimit: number,
  now: Date = new Date(),
): LimitResult {
  const time = now.getTime();
  const day = now.toISOString().slice(0, 10);
  const bucket = buckets.get(userId) ?? { minuteStart: time, minuteCount: 0, day, dayCount: 0 };
  if (time - bucket.minuteStart >= 60_000) {
    bucket.minuteStart = time;
    bucket.minuteCount = 0;
  }
  if (bucket.day !== day) {
    bucket.day = day;
    bucket.dayCount = 0;
  }
  if (bucket.dayCount >= dailyLimit) return { ok: false, reason: "day" };
  if (bucket.minuteCount >= PER_MINUTE) return { ok: false, reason: "minute" };
  bucket.minuteCount += 1;
  bucket.dayCount += 1;
  buckets.set(userId, bucket);
  return { ok: true };
}

/** Tests only. */
export function resetVoiceLimits() {
  buckets.clear();
}
