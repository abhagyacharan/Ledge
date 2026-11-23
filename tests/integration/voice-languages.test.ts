import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getUserSettings, updateUserSettings } from "@/server/data/settings";
import { db } from "@/server/db/client";
import { userSettings } from "@/server/db/schema";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";
import { dbError, PG } from "../helpers/data";

let a: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
});

describe("voice language settings", () => {
  it("starts with English and Hindi, titles in English", async () => {
    const settings = await getUserSettings(a.id);
    expect(settings.voiceLanguages).toEqual(["en", "hi"]);
    expect(settings.voiceTitleLanguage).toBe("english");
  });

  it("saves and reads back both fields", async () => {
    await updateUserSettings(a.id, {
      voiceLanguages: ["en", "te", "ur"],
      voiceTitleLanguage: "as_spoken",
    });
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, a.id));
    expect(row.voiceLanguages).toEqual(["en", "te", "ur"]);
    expect(row.voiceTitleLanguage).toBe("as_spoken");
  });

  it("refuses a bad title language", async () => {
    await getUserSettings(a.id);
    const error = await dbError(
      db
        .update(userSettings)
        .set({ voiceTitleLanguage: "klingon" as never })
        .where(eq(userSettings.userId, a.id)),
    );
    expect(error.code).toBe(PG.checkViolation);
  });
});
