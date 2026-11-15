"use server";

import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { ok } from "@/lib/result";
import { guarded, refresh } from "@/server/action-guard";
import { auth } from "@/server/auth";
import { updateUserSettings } from "@/server/data/settings";
import { db } from "@/server/db/client";
import { session, user } from "@/server/db/schema";
import { getSession } from "@/server/session";
import { deleteAccountSchema, preferencesSchema } from "./schema";

/** Saves theme, time zone or week start (Settings › Preferences). */
export async function updatePreferencesAction(input: unknown) {
  return guarded(preferencesSchema, input, async (patch, userId) => {
    await updateUserSettings(userId, patch);
    refresh();
    return ok();
  });
}

/**
 * Sign out everywhere (CLAUDE.md §5, P1): ends every session of this account, this device's
 * included. Other devices notice within 5 minutes (the session cookie cache, CLAUDE.md §5).
 */
export async function signOutEverywhereAction(input: unknown) {
  return guarded(z.object({}), input, async (_data, userId) => {
    const current = await getSession();
    const token = current?.session.token;
    await db
      .delete(session)
      .where(
        token
          ? and(eq(session.userId, userId), ne(session.token, token))
          : eq(session.userId, userId),
      );
    // Last: this device's session and its cookies (nextCookies sets the clearing headers).
    await auth.api.signOut({ headers: await headers() });
    return ok();
  });
}

/**
 * Delete account (CLAUDE.md §6.2, P1): after the typed confirmation, removes the user and,
 * through the database's cascades, every list, task, money entry, journal page, setting and
 * session. Nothing goes to Trash. This device is signed out first so no stale cookie remains.
 */
export async function deleteAccountAction(input: unknown) {
  return guarded(deleteAccountSchema, input, async (_data, userId) => {
    await auth.api.signOut({ headers: await headers() });
    await db.delete(user).where(eq(user.id, userId));
    return ok();
  });
}
