"use server";

import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok } from "@/lib/result";
import { newPasswordSchema } from "@/modules/auth/schema";
import { guarded, refresh } from "@/server/action-guard";
import { auth } from "@/server/auth";
import { markAvatarRemoved, saveAvatar } from "@/server/data/avatars";
import { updateUserSettings } from "@/server/data/settings";
import { getSignInMethods } from "@/server/data/sign-in-methods";
import { db } from "@/server/db/client";
import { account, session, user } from "@/server/db/schema";
import { getSession } from "@/server/session";
import { AVATAR_MAX_BYTES, avatarUrl, sniffImage } from "./avatar";
import { deleteAccountSchema, nameSchema, preferencesSchema } from "./schema";

/** How long a fresh sign-in counts as "you just confirmed it's you" (delete account, Google). */
const FRESH_MS = 10 * 60_000;

/** Saves theme, time zone, week start, voice or the rupee rate (Settings sections). */
export async function updatePreferencesAction(input: unknown) {
  return guarded(preferencesSchema, input, async (patch, userId) => {
    await updateUserSettings(userId, patch);
    refresh();
    return ok();
  });
}

/** Renames the account (Settings › Account). Better Auth's update also refreshes the cookie. */
export async function updateNameAction(input: unknown) {
  return guarded(nameSchema, input, async ({ name }) => {
    await auth.api.updateUser({ headers: await headers(), body: { name } });
    refresh();
    return ok();
  });
}

/**
 * Saves the cropped profile photo (screen 9d). The browser sends a small square; the server
 * checks its real type from the bytes and its size, stores it, and points `user.image` at it.
 */
export async function uploadAvatarAction(input: unknown) {
  return guarded(z.instanceof(FormData), input, async (form, userId) => {
    const file = form.get("photo");
    if (!(file instanceof Blob)) return fail("Pick a photo first.");
    if (file.size > AVATAR_MAX_BYTES) return fail("That photo is too big. Try again.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = sniffImage(bytes);
    if (!type) return fail("Ledge can't use that file. Try a JPEG, PNG or WebP.");
    const version = await saveAvatar(userId, type, bytes);
    await auth.api.updateUser({ headers: await headers(), body: { image: avatarUrl(version) } });
    refresh();
    return ok();
  });
}

/** Google keeps the picture at an address ending in =s96-c; ask for a 256px square instead. */
function googlePictureUrl(idToken: string | null): string | null {
  if (!idToken) return null;
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString(),
    );
    const picture =
      payload && typeof payload === "object" && "picture" in payload ? payload.picture : null;
    const url = new URL(String(picture ?? ""));
    if (url.protocol !== "https:" || !url.hostname.endsWith(".googleusercontent.com")) return null;
    return url.toString().replace(/=s\d+(-c)?$/, "=s256-c");
  } catch {
    return null;
  }
}

/**
 * Use my Google photo (screen 9d): the server fetches the picture once from Google and stores it
 * like an upload, so pages never load anything from Google.
 */
export async function googlePhotoAction(input: unknown) {
  return guarded(z.object({}), input, async (_data, userId) => {
    const [row] = await db
      .select({ idToken: account.idToken })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "google")));
    const url = googlePictureUrl(row?.idToken ?? null);
    if (!url) return fail("Google didn't share a photo for this account.");
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return fail("Couldn't get the photo from Google. Try again.");
    const bytes = Buffer.from(await response.arrayBuffer());
    const type = sniffImage(bytes);
    if (!type || bytes.length > AVATAR_MAX_BYTES) {
      return fail("Google's photo isn't one Ledge can use. Upload one instead.");
    }
    const version = await saveAvatar(userId, type, bytes);
    await auth.api.updateUser({ headers: await headers(), body: { image: avatarUrl(version) } });
    refresh();
    return ok();
  });
}

/** Remove photo: initials show again. The bytes wait a few minutes for Undo. */
export async function removeAvatarAction(input: unknown) {
  return guarded(z.object({}), input, async (_data, userId) => {
    await markAvatarRemoved(userId);
    await auth.api.updateUser({ headers: await headers(), body: { image: null } });
    refresh();
    return ok();
  });
}

/** Undo for Remove photo: shows the kept photo again. */
export async function restoreAvatarAction(input: unknown) {
  return guarded(
    z.object({ image: z.string().regex(/^\/api\/avatar\?v=\d{1,9}$/) }),
    input,
    async ({ image }) => {
      await auth.api.updateUser({ headers: await headers(), body: { image } });
      refresh();
      return ok();
    },
  );
}

/**
 * Signs one other device out (screen 9e). The id comes from the page, so the delete is limited to
 * this account's sessions and never touches this device's own.
 */
export async function signOutDeviceAction(input: unknown) {
  return guarded(z.object({ id: z.uuid() }), input, async ({ id }, userId) => {
    const current = await getSession();
    if (!current) return fail("Sign in again first.");
    const removed = await db
      .delete(session)
      .where(
        and(eq(session.id, id), eq(session.userId, userId), ne(session.id, current.session.id)),
      )
      .returning({ id: session.id });
    if (removed.length === 0) return fail("That device is already signed out.");
    refresh();
    return ok();
  });
}

/**
 * Sign out everywhere else (screen 9e): ends every other session of this account and keeps this
 * one. Other devices notice within 5 minutes (the session cookie cache, CLAUDE.md §5).
 */
export async function signOutOtherDevicesAction(input: unknown) {
  return guarded(z.object({}), input, async (_data, userId) => {
    const current = await getSession();
    if (!current) return fail("Sign in again first.");
    await db
      .delete(session)
      .where(and(eq(session.userId, userId), ne(session.id, current.session.id)));
    refresh();
    return ok();
  });
}

/** Disconnect Google (screen 9i). Only with a password set, so the account always has a way in. */
export async function disconnectGoogleAction(input: unknown) {
  return guarded(z.object({}), input, async (_data, userId) => {
    if (!(await getSignInMethods(userId)).password) {
      return fail("Set a password first. Google is your only way to sign in.");
    }
    await db
      .delete(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "google")));
    refresh();
    return ok();
  });
}

/**
 * Delete account (CLAUDE.md §6.2, screen 9n): after the typed phrase and proof that it's you (the
 * password, or for an account with only Google a Google sign-in in the last 10 minutes), removes
 * the user and, through the database's cascades, every list, task, money entry, journal page,
 * plan, photo, setting and session. Nothing goes to Trash. This device is signed out first so no
 * stale cookie remains.
 */
export async function deleteAccountAction(input: unknown) {
  return guarded(deleteAccountSchema, input, async ({ password }, userId) => {
    const ctx = await auth.$context;
    const credential = await ctx.internalAdapter.findCredentialAccount(userId);
    if (credential?.password) {
      const right =
        password !== undefined &&
        (await ctx.password.verify({ hash: credential.password, password }));
      if (!right) {
        return fail("That password isn't right.", { password: "That password isn't right." });
      }
    } else {
      const current = await getSession();
      const age = current ? Date.now() - new Date(current.session.createdAt).getTime() : NaN;
      // A missing or unreadable time counts as not fresh.
      if (!(age >= 0 && age <= FRESH_MS)) return fail("Confirm with Google first.");
    }
    // Clears this device's cookies. Deleting the user removes every session anyway, so a failed
    // sign-out here must not stop the delete.
    await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
    await db.delete(user).where(eq(user.id, userId));
    return ok();
  });
}

/**
 * Set a password (Settings › Sign-in & security) for an account made with Google, so it can also
 * sign in with email and use the journal lock (O, 2026-11-23). Accounts that already have one
 * use Change password instead.
 */
export async function setPasswordAction(input: unknown) {
  return guarded(newPasswordSchema, input, async ({ password }, userId) => {
    if ((await getSignInMethods(userId)).password) {
      return fail("This account already has a password.");
    }
    // The same steps as Better Auth's own setPassword (its hasher, its "credential" account row),
    // keyed by the userId from guarded() instead of re-reading the session from headers.
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(password);
    const existing = await ctx.internalAdapter.findCredentialAccount(userId);
    if (existing) await ctx.internalAdapter.updateAccount(existing.id, { password: hash });
    else {
      await ctx.internalAdapter.linkAccount({
        userId,
        providerId: "credential",
        accountId: userId,
        password: hash,
      });
    }
    refresh();
    return ok();
  });
}
