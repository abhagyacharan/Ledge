import { db } from "@/server/db/client";
import { lists, sections, tags, tasks, type NewTask } from "@/server/db/schema";

let counter = 0;
/** Simple ordered position strings; real code uses fractional-indexing. */
const nextPosition = () => `a${String(++counter).padStart(6, "0")}`;

export async function makeList(userId: string, name = "List", overrides = {}) {
  const [row] = await db
    .insert(lists)
    .values({ userId, name, position: nextPosition(), ...overrides })
    .returning();
  return row;
}

export async function makeSection(userId: string, listId: string, name = "Section") {
  const [row] = await db
    .insert(sections)
    .values({ userId, listId, name, position: nextPosition() })
    .returning();
  return row;
}

export async function makeTag(userId: string, name = "tag") {
  const [row] = await db.insert(tags).values({ userId, name }).returning();
  return row;
}

type TaskOverrides = Partial<Omit<NewTask, "userId" | "listId" | "search">>;

export async function makeTask(
  userId: string,
  listId: string,
  title = "Task",
  overrides: TaskOverrides = {},
) {
  const [row] = await db
    .insert(tasks)
    .values({ userId, listId, title, position: nextPosition(), ...overrides })
    .returning();
  return row;
}

/** Runs a statement that the database must reject; returns the Postgres error code and message. */
export async function dbError(
  statement: PromiseLike<unknown>,
): Promise<{ code?: string; message: string }> {
  try {
    await statement;
  } catch (error) {
    const cause = (error as { cause?: { code?: string; message?: string } }).cause;
    return {
      code: cause?.code,
      message: cause?.message ?? (error instanceof Error ? error.message : String(error)),
    };
  }
  throw new Error("Expected the database to reject this statement, but it succeeded");
}

export const PG = {
  checkViolation: "23514",
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  generatedColumnWrite: "428C9",
} as const;
