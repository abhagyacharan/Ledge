import { expect, test } from "@playwright/test";

/** Search (CLAUDE.md §6.2, P1): reachable with `/`, finds titles by word and by the start of a word. */

test("press / to search, find a task by the start of a word, and open it", async ({ page }) => {
  await page.goto("/inbox");
  await page.keyboard.press("q");
  await page.getByLabel("Task", { exact: true }).fill("Zebra crossing paint");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-sonner-toast]", { hasText: "Added to" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0); // plain keys are ignored while a dialog is open
  await page.locator("body").click({ position: { x: 5, y: 300 } });

  // / goes to the search page with the box ready.
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/search/);
  const box = page.getByRole("searchbox", { name: "Search tasks" });
  await expect(box).toBeFocused();

  await box.fill("zebr");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=zebr/);
  const result = page.getByRole("link", { name: /^Zebra crossing paint/ });
  await expect(result).toBeVisible();
  await expect(page.getByRole("status")).toContainText("1 result for");

  // A result opens the task drawer, like anywhere else.
  await result.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  // Nothing matches: a clear message instead of an empty page.
  await page.getByRole("searchbox", { name: "Search tasks" }).fill("qqqxyz");
  await page.getByRole("searchbox", { name: "Search tasks" }).press("Enter");
  await expect(page.getByText('Nothing found for "qqqxyz"')).toBeVisible();
});

test("search is in the side menu and the command palette", async ({ page }) => {
  await page.goto("/inbox");
  await page.getByRole("link", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("search");
  await expect(page.getByRole("option", { name: /Search/ }).first()).toBeVisible();
});
