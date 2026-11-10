import "server-only";

/** Postgres error code of a failed query (Drizzle wraps the driver error as `cause`). */
export function pgErrorCode(error: unknown): string | undefined {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  return cause?.code ?? (error as { code?: string } | null)?.code;
}

export const isUniqueViolation = (error: unknown) => pgErrorCode(error) === "23505";
