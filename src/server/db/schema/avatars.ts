import { check, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { bytea, createdAt, updatedAt } from "./_columns";
import { user } from "./auth";

export const AVATAR_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
export type AvatarType = (typeof AVATAR_TYPES)[number];

/**
 * The optional profile photo (Settings › Account, screens 9c and 9d). The crop sheet shrinks it to
 * a small square before it is sent, so one row holds about 20 KB. It lives in the database so the
 * nightly backup and a restore carry it with everything else (O, 2026-11-23). `user.image` points
 * at /api/avatar?v=<version> while it is shown; Remove photo clears that and keeps this row until
 * the hourly clean-up, so Undo can bring it back.
 */
export const userAvatars = pgTable(
  "user_avatars",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: AVATAR_TYPES }).notNull(),
    data: bytea("data").notNull(),
    /** Bumped on every new photo, so browsers fetch the new one. */
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("user_avatars_size", sql`octet_length(${t.data}) <= 262144`),
    check("user_avatars_type", sql`${t.type} in ('image/webp', 'image/jpeg', 'image/png')`),
  ],
);
