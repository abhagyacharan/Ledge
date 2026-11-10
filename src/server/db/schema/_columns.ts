import { customType, timestamp, uuid } from "drizzle-orm/pg-core";

/** `id uuid` primary key (CLAUDE.md §6.3, §9). */
export const id = () => uuid("id").primaryKey().defaultRandom();

/** Timestamps are `timestamptz` in UTC (CLAUDE.md §9). */
export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Postgres full-text search vector. Only ever produced by a generated column. */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
