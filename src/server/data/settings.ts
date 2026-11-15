import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/server/db/client";
import { userSettings, type UserSettings } from "@/server/db/schema";
import { ensureUserDefaults } from "@/server/user-defaults";

/**
 * The user's settings row, recreated with defaults if sign-up ever left it missing. Cached for
 * the length of one request: the app layout and the page both ask for it, and on a phone every
 * query is a round trip to the home server (O felt it, 2026-11-13).
 */
export const getUserSettings = cache(async (userId: string): Promise<UserSettings> => {
  const find = async () => {
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return row;
  };
  const existing = await find();
  if (existing) return existing;
  await ensureUserDefaults(userId);
  const created = await find();
  if (!created) throw new Error("Could not create user settings");
  return created;
});

export type SettingsPatch = Partial<
  Pick<UserSettings, "timezone" | "weekStartsOn" | "theme" | "voiceEnabled">
>;

/** Changes the user's own preferences (Settings, docs/new_design.md screen 5f). */
export async function updateUserSettings(userId: string, patch: SettingsPatch): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await getUserSettings(userId); // makes sure the row exists
  await db.update(userSettings).set(patch).where(eq(userSettings.userId, userId));
}
