import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { user, userAvatars, type AvatarType } from "@/server/db/schema";

/** This account's photo bytes, or null (the /api/avatar route; ownership by userId). */
export async function getAvatar(userId: string) {
  const [row] = await db
    .select({ type: userAvatars.type, data: userAvatars.data, version: userAvatars.version })
    .from(userAvatars)
    .where(eq(userAvatars.userId, userId));
  return row ?? null;
}

/** Stores a new photo for this account and returns its version (one higher than the last). */
export async function saveAvatar(userId: string, type: AvatarType, data: Buffer): Promise<number> {
  const [row] = await db
    .insert(userAvatars)
    .values({ userId, type, data })
    .onConflictDoUpdate({
      target: userAvatars.userId,
      set: { type, data, version: sql`${userAvatars.version} + 1`, updatedAt: new Date() },
    })
    .returning({ version: userAvatars.version });
  return row.version;
}

/** Remove photo: notes the time, so the clean-up waits until Undo is long past. */
export async function markAvatarRemoved(userId: string): Promise<void> {
  await db.update(userAvatars).set({ updatedAt: new Date() }).where(eq(userAvatars.userId, userId));
}

/**
 * Erases the stored photo once it is no longer shown (Remove photo keeps it a few minutes so Undo
 * can bring it back). Run by the hourly clean-up beside Trash.
 */
export async function purgeRemovedAvatar(userId: string): Promise<void> {
  const [row] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId));
  if (row?.image?.startsWith("/api/avatar")) return;
  await db
    .delete(userAvatars)
    .where(
      and(
        eq(userAvatars.userId, userId),
        lt(userAvatars.updatedAt, new Date(Date.now() - 10 * 60_000)),
      ),
    );
}
