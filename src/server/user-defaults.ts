import "server-only";
import { generateKeyBetween } from "fractional-indexing";
import { db as defaultDb, type Database } from "@/server/db/client";
import { lists, userSettings } from "@/server/db/schema";

export const INBOX_NAME = "General";
/** General shows the plain list icon: no emoji (docs/design.md §8). */
export const INBOX_ICON = null;

/**
 * Creates the rows every account needs: a `user_settings` row (database defaults) and the
 * undeletable default list, General (stored as the inbox). Safe to call more than once: existing rows are left alone.
 * Called from the Better Auth "user created" hook (see `auth.ts`).
 */
export async function ensureUserDefaults(userId: string, database: Database = defaultDb) {
  await database.transaction(async (tx) => {
    await tx.insert(userSettings).values({ userId }).onConflictDoNothing();
    await tx
      .insert(lists)
      .values({
        userId,
        name: INBOX_NAME,
        icon: INBOX_ICON,
        isInbox: true,
        // First key in an empty ordering; lists added later sort after it.
        position: generateKeyBetween(null, null),
      })
      .onConflictDoNothing();
  });
}
