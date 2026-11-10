import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

loadEnv({ path: ".env", quiet: true });

/** Integration tests run against a separate database so dev data is never touched. */
function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL ?? "postgres://ledge:ledge@localhost:5433/ledge";
  const url = new URL(base);
  url.pathname = "/ledge_test";
  return url.toString();
}

const testUrl = testDatabaseUrl();
// globalSetup runs in the main process, so expose the URL there too.
process.env.TEST_DATABASE_URL = testUrl;

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside a React Server environment; stub it for tests.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    globalSetup: ["./tests/setup/global.ts"],
    // Integration tests share one database, so run test files one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: testUrl,
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
      BETTER_AUTH_URL: "http://localhost:3000",
      ALLOW_SIGNUP: "true",
      TZ: "Asia/Kolkata",
    },
  },
});
