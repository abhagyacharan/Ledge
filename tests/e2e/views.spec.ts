import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 4 end-to-end flows (CLAUDE.md §13), run against the seeded demo account:
 *  - the Today view shows overdue and today correctly
 *  - create a list and drag-reorder (with the keyboard) and see the order survive a reload
 * plus a check that a list remembers how it is sorted.
 */

/** Titles of the tasks in the main area, in the order shown. */
async function visibleTitles(page: Page): Promise<string[]> {
  return page.locator("main ul li a span.block").allInnerTexts();
}

test("Today shows overdue tasks first, then what is due today", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();

  // "Pay rent" was due two days ago: always overdue.
  const overdue = page.locator("section", { has: page.getByRole("heading", { name: /^Overdue/ }) });
  await expect(overdue.getByText("Pay rent")).toBeVisible();
  await expect(overdue.getByText("Overdue:").first()).toBeVisible(); // the word, not just a colour

  // "Call mom" is due today with no time: never overdue.
  const today = page.locator("section", { has: page.getByRole("heading", { name: /^Today/ }) });
  await expect(today.getByText("Call mom")).toBeVisible();
  await expect(overdue.getByText("Call mom")).toHaveCount(0);

  // Tasks due later are not on this view.
  await expect(page.getByText("Fix the leaking tap")).toHaveCount(0);
  await expect(page.getByText("Renew passport")).toHaveCount(0);

  // The overdue block comes before the Today block.
  const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
  const overdueAt = headings.findIndex((h) => h.startsWith("Overdue"));
  const todayAt = headings.findIndex((h) => h.startsWith("Today"));
  expect(overdueAt).toBeGreaterThanOrEqual(0);
  expect(overdueAt).toBeLessThan(todayAt);
});

test("Upcoming groups the next days and leaves out undated and overdue tasks", async ({ page }) => {
  await page.goto("/upcoming");
  await expect(page.getByRole("heading", { level: 1, name: "Upcoming" })).toBeVisible();
  await expect.poll(() => visibleTitles(page)).toContain("Fix the leaking tap"); // 3 days away
  const titles = await visibleTitles(page);
  expect(titles).toContain("Plan weekend trip"); // 6 days away
  expect(titles).not.toContain("Renew passport"); // 20 days away
  expect(titles).not.toContain("Pay rent"); // overdue
  expect(titles).not.toContain("Call the dentist"); // no date
  expect(titles).not.toContain("Call mom"); // due today, not upcoming
});

test("create a list, then drag-reorder its tasks with the keyboard", async ({ page }) => {
  await page.goto("/inbox");

  // Create the list.
  await page.getByRole("button", { name: "New list" }).click();
  await page.getByLabel("Name", { exact: true }).fill("E2E list");
  await page.getByRole("button", { name: "Create list" }).click();
  await expect(page).toHaveURL(/\/lists\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E list" })).toBeVisible();

  // Add three tasks in a row; the field stays ready for the next one.
  const add = page.getByLabel("Add a task");
  for (const title of ["First", "Second", "Third"]) {
    await add.fill(title);
    await add.press("Enter");
    await expect(page.locator("main li a span.block", { hasText: title })).toBeVisible();
  }
  expect(await visibleTitles(page)).toEqual(["First", "Second", "Third"]);

  // Pick up "Third" with the keyboard, move it up two places, drop it.
  const handle = page.getByRole("button", { name: "Reorder Third" });
  await handle.focus();
  // dnd-kit re-measures the rows after every move, so give it a moment between key presses.
  for (const key of ["Space", "ArrowUp", "ArrowUp", "Space"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
  }
  await expect.poll(() => visibleTitles(page)).toEqual(["Third", "First", "Second"]);

  // The new order is saved: it is the same after a reload.
  await page.reload();
  expect(await visibleTitles(page)).toEqual(["Third", "First", "Second"]);
});

test("a list remembers how it is sorted", async ({ page }) => {
  await page.goto("/inbox");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

  await page.getByRole("button", { name: /^View/ }).click();
  await page.getByLabel("Sort by").click();
  // Saving is a server action (a POST to the page). Wait for it so the reload below sees it.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await page.getByRole("option", { name: "Due date" }).click();
  await saved;
  await page.keyboard.press("Escape");

  // Sorted by due date: the overdue "Pay rent" comes before "Fix the leaking tap".
  await expect.poll(() => visibleTitles(page)).toContain("Pay rent");
  const sorted = await visibleTitles(page);
  expect(sorted.indexOf("Pay rent")).toBeLessThan(sorted.indexOf("Fix the leaking tap"));

  // After a reload the choice is still there and dragging is switched off.
  await page.reload();
  await expect(page.getByText("Sections and dragging are available")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Reorder/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^View/ })).toContainText("1");
});
