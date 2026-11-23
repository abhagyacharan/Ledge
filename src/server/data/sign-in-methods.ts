import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { account } from "@/server/db/schema";

export type SignInMethods = {
  password: boolean;
  google: boolean;
  /** When the password was set or last changed (its account row's update time). */
  passwordChangedAt: Date | null;
  /** When Google was connected. */
  googleSince: Date | null;
};

/**
 * How this account can sign in (Settings › Sign-in & security). "credential" is Better Auth's name
 * for the email and password row; an account made with Google has only a "google" row until it
 * sets a password.
 */
export async function getSignInMethods(userId: string): Promise<SignInMethods> {
  const rows = await db
    .select({
      providerId: account.providerId,
      password: account.password,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    })
    .from(account)
    .where(eq(account.userId, userId));
  const credential = rows.find((r) => r.providerId === "credential" && r.password);
  const google = rows.find((r) => r.providerId === "google");
  return {
    password: Boolean(credential),
    google: Boolean(google),
    passwordChangedAt: credential?.updatedAt ?? null,
    googleSince: google?.createdAt ?? null,
  };
}
