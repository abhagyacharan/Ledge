import { expect, test, type Page } from "@playwright/test";

/**
 * Signing out on a phone, where Sign out lives in Settings. Each test signs in afresh, so
 * ending its session does not touch the shared demo session other tests use.
 */
test.use({ storageState: { cookies: [], origins: [] } });

async function signIn(page: Page) {
  await page.goto("/sign-in", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill("demo@ledge.test");
  await page.getByLabel("Password").fill("demo-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/:\d+\/$/, { timeout: 20_000 });
}

async function expectSignedOut(page: Page) {
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/sign-in/);
  // The address of the app itself now shows the public page, not Home.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One calm place to run your day.",
  );
}

test("sign out from Settings on a phone", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings");
  await page
    .getByRole("region", { name: "Profile" })
    .getByRole("button", { name: "Sign out" })
    .click();
  await expectSignedOut(page);
});
