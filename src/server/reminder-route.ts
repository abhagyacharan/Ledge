import "server-only";
import { z } from "zod";
import { getEnv } from "@/server/env";
import { getSession } from "@/server/session";

/**
 * Shared by the service worker's reminder routes (docs/reminders-spec.md §7, §13): the signed-in
 * user and a checked task id, or the JSON answer to send instead.
 */

const taskIdSchema = z.uuid();

/** The optional body of Done and Snooze: the round the notification was for. */
const roundBodySchema = z.object({
  round: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const TASK_GONE = "That task no longer exists.";

export const STALE = "stale";

/**
 * True when the request comes from Ledge's own pages or service worker. Browsers send
 * `Sec-Fetch-Site`; without it, `Origin` must be the app's own (BETTER_AUTH_URL). The session
 * cookie is sameSite=lax, so this is what stops another site's page posting here.
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return origin === new URL(getEnv().BETTER_AUTH_URL).origin;
  } catch {
    return false;
  }
}

type Refusal = { ok: false; response: Response };

/** The signed-in user and session for a same-origin request, or the answer to send instead. */
export async function routeSession(
  request: Request,
): Promise<{ ok: true; userId: string; sessionId: string } | Refusal> {
  if (!isSameOrigin(request)) {
    return { ok: false, response: json({ ok: false, error: "Not allowed." }, 403) };
  }
  const session = await getSession();
  if (!session) {
    return { ok: false, response: json({ ok: false, error: "Sign in again." }, 401) };
  }
  return { ok: true, userId: session.user.id, sessionId: session.session.id };
}

/** Reads a JSON body, or undefined when there is none. Throws on a body that is not JSON. */
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.trim() === "") return undefined;
  return JSON.parse(text) as unknown;
}

export async function reminderRequest(
  request: Request,
  params: Promise<{ taskId: string }>,
): Promise<
  { ok: true; userId: string; taskId: string; round: string | null | undefined } | Refusal
> {
  const req = await routeSession(request);
  if (!req.ok) return req;
  const parsed = taskIdSchema.safeParse((await params).taskId);
  if (!parsed.success) {
    return { ok: false, response: json({ ok: false, error: TASK_GONE }, 404) };
  }
  // Notifications sent before the round was added post no body; that still works.
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return { ok: false, response: json({ ok: false, error: "Bad request." }, 400) };
  }
  const round = roundBodySchema.optional().safeParse(body);
  if (!round.success) {
    return { ok: false, response: json({ ok: false, error: "Bad request." }, 400) };
  }
  return { ok: true, userId: req.userId, taskId: parsed.data, round: round.data?.round };
}
