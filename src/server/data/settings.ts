import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { userSettings, type UserSettings } from "@/server/db/schema";
import { ensureUserDefaults } from "@/server/user-defaults";

/** The user's settings row, recreated with defaults if sign-up ever left it missing. */
export async function getUserSettings(userId: string): Promise<UserSettings> {
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
}
