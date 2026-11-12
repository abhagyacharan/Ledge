import { expect, test } from "@playwright/test";

/**
 * Sign up and sign in (CLAUDE.md §13). These tests start signed out. Each run uses a fresh email,
 * and the sign-in limit (5 a minute) is cleared before the run, so repeated runs are fine.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const PASSWORD = "a-long-test-password";

test("sign up, sign out, and sign in again", async ({ page }) => {
  const email = `e2e-${Date.now()}@ledge.test`;

  // Protected pages send a signed-out visitor to the sign-in page.
  await page.goto("/today");
  await expect(page).toHaveURL(/\/sign-in/);

  // Sign up. A short password is refused with a clear message before anything is sent.
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Person");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 10 characters")).toBeVisible();

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  // New accounts land on the welcome page; its Tasks button opens quick add on the overview.
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back, E2E" })).toBeVisible();
  await page.getByRole("link", { name: /Tasks/ }).filter({ hasText: "Add a task" }).click();
  await expect(page.getByRole("dialog", { name: "Add a task" })).toBeVisible();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();

  // The new account starts with nothing to do, and no one else's tasks.
  await expect(page.getByText("Nothing due today")).toBeVisible();
  await expect(page.getByText("Pay rent")).toHaveCount(0);

  // Sign out.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/sign-in/);

  // A wrong password gets one general message; the right one gets you in.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form [role=alert]")).toHaveText("Incorrect email or password.");

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  // The Expenses button opens the Log a transaction menu on the Summary.
  await page
    .getByRole("link", { name: /Expenses/ })
    .filter({ hasText: "Log a transaction" })
    .click();
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(page).toHaveURL(/\/expenses$/);
});

test("an unknown email gets the same message as a wrong password", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("nobody-here@ledge.test");
  await page.getByLabel("Password").fill("whatever-it-is");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form [role=alert]")).toHaveText("Incorrect email or password.");
});
