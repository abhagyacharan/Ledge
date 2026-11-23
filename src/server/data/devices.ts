import "server-only";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/server/db/client";
import { session } from "@/server/db/schema";

export type Device = {
  id: string;
  userAgent: string | null;
  /** When the session was last refreshed: Better Auth touches it about once a day of use. */
  lastSeen: Date;
  current: boolean;
};

/**
 * Every signed-in device of this account (Settings › Sign-in & security, screen 9e): one row per
 * live session, newest first, this device on top. Tokens never leave the server.
 */
export async function listDevices(userId: string, currentSessionId: string): Promise<Device[]> {
  const rows = await db
    .select({ id: session.id, userAgent: session.userAgent, updatedAt: session.updatedAt })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.updatedAt));
  return rows
    .map((r) => ({
      id: r.id,
      userAgent: r.userAgent,
      lastSeen: r.updatedAt,
      current: r.id === currentSessionId,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current));
}
