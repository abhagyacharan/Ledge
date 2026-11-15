import { getSession } from "@/server/session";
import { transcribeForUser, VOICE_MESSAGES } from "@/server/voice";

export const dynamic = "force-dynamic";

/** About a minute of compressed speech is well under this. */
const MAX_BYTES = 2 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * POST /api/voice/transcribe (docs/voice-spec.md §5): multipart with one `audio` file, answers
 * `{ ok: true, text }` or `{ ok: false, error }`. The audio is passed on to Groq and never stored.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return json({ ok: false, error: "Sign in again." }, 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: VOICE_MESSAGES.empty }, 400);
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return json({ ok: false, error: VOICE_MESSAGES.empty }, 400);
  }
  if (audio.size > MAX_BYTES) {
    return json({ ok: false, error: "That recording is too long. Keep it under a minute." }, 413);
  }
  if (audio.type && !audio.type.startsWith("audio/") && !audio.type.startsWith("video/")) {
    return json({ ok: false, error: "That isn't a recording." }, 415);
  }

  const type = audio.type.split(";")[0] ?? "";
  const extension =
    type.includes("mp4") || type.includes("m4a") || type.includes("aac")
      ? "m4a"
      : type.includes("ogg")
        ? "ogg"
        : type.includes("wav")
          ? "wav"
          : "webm";

  const result = await transcribeForUser(session.user.id, audio, `voice.${extension}`);
  if (!result.ok) {
    const status = result.failure === "off" ? 403 : result.failure.startsWith("limit") ? 429 : 503;
    return json(
      { ok: false, error: VOICE_MESSAGES[result.failure] },
      result.failure === "empty" ? 422 : status,
    );
  }
  return json({ ok: true, text: result.data });
}
