/**
 * A stand-in for the browser in integration tests that call server actions: the signed-in user,
 * their session id and a cookie jar. Test files run in one shared worker (vitest.config.mts,
 * `isolate: false`), so the first file to mock `@/server/session` or `next/headers` wins for every
 * later file; all of them point their mocks here, so they always read the same state.
 *
 *   vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
 *   vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
 *   vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
 *
 * Then set `testAuth.userId` (and `sessionId`) in `beforeEach`.
 */

export const testAuth = {
  userId: "",
  sessionId: "session-1",
  jar: new Map<string, string>(),
  reset(userId: string) {
    this.userId = userId;
    this.sessionId = "session-1";
    this.jar.clear();
  },
};

export const sessionModule = {
  getSession: async () =>
    testAuth.userId ? { session: { id: testAuth.sessionId }, user: { id: testAuth.userId } } : null,
  requireUser: async () => ({
    userId: testAuth.userId,
    user: { id: testAuth.userId, name: "", email: "" },
  }),
};

export const headersModule = {
  cookies: async () => ({
    get: (name: string) =>
      testAuth.jar.has(name) ? { name, value: testAuth.jar.get(name) } : undefined,
    set: (name: string, value: string) => void testAuth.jar.set(name, value),
    delete: (name: string) => void testAuth.jar.delete(name),
  }),
  headers: async () => new Headers(),
};
