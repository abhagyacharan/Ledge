import { expect, test, type Page } from "@playwright/test";

/**
 * Repeating tasks (CLAUDE.md §6.2, P1): make a task repeat from the drawer, complete it (a finished
 * copy goes to Completed and the task moves to its next date), undo, and set a custom repeat.
 */

const toast = (page: Page) => page.locator("[data-sonner-toast]").first();

async function addTask(page: Page, title: string) {
  await page.keyboard.press("q");
  await page.getByLabel("Task", { exact: true }).fill(title);
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-sonner-toast]", { hasText: "Added to" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("a weekly task moves on when completed, keeps a copy in Completed, and undo puts it back", async ({
  page,
}) => {
  await page.goto("/inbox");
  await addTask(page, "E2E repeater");

  // Open it and make it repeat every week, starting today.
  await page.getByRole("link", { name: /^E2E repeater/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^Due date:/ }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.keyboard.press("Escape"); // close the date popover
  await dialog.locator("#task-repeat").click();
  await page.getByRole("option", { name: "Every week" }).click();
  await expect(dialog.getByText(/^Every week on /)).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("Saved");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The row says it repeats.
  const row = page.getByRole("link", { name: /^E2E repeater/ });
  await expect(row).toContainText("Every week on");
  await expect(row).toContainText("Today");

  // Completing it does not finish it: it moves to next week, and a toast says so.
  await page.getByRole("checkbox", { name: "E2E repeater: mark done" }).click();
  await expect(toast(page)).toContainText('Done "E2E repeater". Next:');
  await expect(row).not.toContainText("Today");
  await expect(page.getByRole("checkbox", { name: "E2E repeater: mark done" })).toHaveAttribute(
    "aria-checked",
    "false",
  );

  // Undo puts the date back and removes the copy.
  await toast(page).getByRole("button", { name: "Undo" }).click();
  await expect(row).toContainText("Today");
  await page.goto("/completed");
  await expect(page.getByRole("link", { name: /^E2E repeater/ })).toHaveCount(0);

  // Complete it for real: now Completed has the finished copy.
  await page.goto("/inbox");
  await page.getByRole("checkbox", { name: "E2E repeater: mark done" }).click();
  await expect(toast(page)).toContainText('Done "E2E repeater"');
  await page.goto("/completed");
  await expect(page.getByRole("link", { name: /^E2E repeater/ })).toBeVisible();
});

test("a custom repeat: every 2 weeks on chosen weekdays, counted from when it is finished", async ({
  page,
}) => {
  await page.goto("/inbox");
  await addTask(page, "E2E custom repeat");
  await page.getByRole("link", { name: /^E2E custom repeat/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Turning a repeat on gives a task with no date today's date.
  await dialog.locator("#task-repeat").click();
  await page.getByRole("option", { name: "Every week" }).click();
  await expect(dialog.getByRole("button", { name: /^Due date: Today/ })).toBeVisible();

  const every = dialog.getByLabel("Repeat every");
  await every.fill("2");
  await every.press("Enter");
  await expect(dialog.getByText(/^Every 2 weeks on /)).toBeVisible();

  // Add Monday and Friday (whatever today is, pressing them keeps at least one day on).
  await dialog.getByRole("button", { name: "Mon", exact: true }).click();
  await dialog.getByRole("button", { name: "Fri", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Fri", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await dialog.locator("#task-repeat-mode").click();
  await page.getByRole("option", { name: "Counts from when I finish it" }).click();
  await expect(dialog.getByText(/^Every 2 weeks after you finish it/)).toBeVisible();

  // It is all saved: same after a reload. (Wait for every save to finish first: the Saved label
  // can still be showing from an earlier change.)
  await page.waitForLoadState("networkidle");
  await expect(dialog.getByRole("status")).toHaveText("Saved");
  await page.reload();
  const again = page.getByRole("dialog");
  await expect(again.getByLabel("Repeat every")).toHaveValue("2");
  await expect(again.getByText(/^Every 2 weeks after you finish it/)).toBeVisible();

  // Switching it off removes the extra controls and the label on the row.
  await again.locator("#task-repeat").click();
  await page.getByRole("option", { name: "Does not repeat" }).click();
  await expect(again.getByLabel("Repeat every")).toHaveCount(0);
});
