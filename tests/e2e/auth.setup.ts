import { expect, test as setup } from "@playwright/test";
import { AUTH_FILE } from "./constants";

/** Signs in once as the seeded demo user and saves the session for the other tests. */
setup("sign in as the demo user", async ({ page }) => {
  setup.setTimeout(120_000);
  // The dev server compiles each route on first use. Warm up the ones sign-in needs so the first
  // click is not lost to a slow compile or a hot reload.
  await page.request.get("/api/auth/get-session");
  await page.goto("/sign-in", { waitUntil: "networkidle" });

  await expect(async () => {
    await page.goto("/sign-in", { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill("demo@ledge.test");
    await page.getByLabel("Password").fill("demo-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/inbox/, { timeout: 20_000 });
  }).toPass({ timeout: 90_000, intervals: [2_000] });

  await page.context().storageState({ path: AUTH_FILE });
});
