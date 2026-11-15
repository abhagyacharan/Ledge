import { understandInput } from "@/modules/voice/schema";
import { getSession } from "@/server/session";
import { understandForUser, VOICE_MESSAGES } from "@/server/voice";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * POST /api/voice/understand (docs/voice-spec.md §6): `{ text, lastPaymentMethod? }` in,
 * `{ ok: true, plan }` out. Used after speech and for "Type instead" and "Try again". It only
 * proposes; nothing is saved until the review sheet's Add all.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return json({ ok: false, error: "Sign in again." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Say or type something." }, 400);
  }
  const parsed = understandInput.safeParse(body);
  if (!parsed.success) {
    return json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Say or type something." },
      400,
    );
  }

  const result = await understandForUser(
    session.user.id,
    parsed.data.text,
    parsed.data.lastPaymentMethod ?? null,
  );
  if (!result.ok) {
    const status = result.failure === "off" ? 403 : result.failure.startsWith("limit") ? 429 : 503;
    return json({ ok: false, error: VOICE_MESSAGES[result.failure] }, status);
  }
  return json({ ok: true, plan: result.data });
}
