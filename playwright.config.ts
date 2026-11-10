import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { AUTH_FILE } from "./tests/e2e/constants";

loadEnv({ path: ".env", quiet: true });

/**
 * End-to-end tests run against their own database (`ledge_e2e`, re-seeded on every run) and their
 * own dev server on port 3100, so they never touch your development data or interrupt `pnpm dev`.
 * They use the Chrome installed on this machine, so no browser download is needed.
 */
const PORT = 3100;
const base = new URL(process.env.DATABASE_URL ?? "postgres://ledge:ledge@localhost:5433/ledge");
base.pathname = "/ledge_e2e";
export const E2E_DATABASE_URL = base.toString();
process.env.E2E_DATABASE_URL = E2E_DATABASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    channel: "chrome",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], channel: "chrome", storageState: AUTH_FILE },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      NEXT_DIST_DIR: ".next-e2e",
      ALLOW_SIGNUP: "true",
    },
  },
});
