import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 5 end-to-end flows (CLAUDE.md §13): quick-add a task and complete it with undo; open a
 * task in the drawer and edit it. Plus the Trash screen and the keyboard shortcuts.
 * Every test creates its own data so none depends on another or on the seed's tasks.
 */

const toast = (page: Page) => page.locator("[data-sonner-toast]").first();

async function quickAdd(page: Page, title: string) {
  await page.keyboard.press("q");
  await page.getByLabel("Task", { exact: true }).fill(title);
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-sonner-toast]", { hasText: "Added to" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
}

test("quick-add a task with q, complete it, and undo", async ({ page }) => {
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();

  await quickAdd(page, "Undo me");
  const checkbox = page.getByRole("checkbox", { name: "Undo me: mark done" });
  await expect(checkbox).toBeVisible();

  await checkbox.click();
  await expect(toast(page)).toContainText('Completed "Undo me"');

  await toast(page).getByRole("button", { name: "Undo" }).click();
  // Back to open: the checkbox offers "mark done" again.
  await expect(page.getByRole("checkbox", { name: "Undo me: mark done" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Undo me: mark done" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("open a task in the drawer, edit it, and the changes are saved", async ({ page }) => {
  await page.goto("/inbox");
  await quickAdd(page, "Edit me");

  await page.getByRole("link", { name: /^Edit me/ }).click();
  await expect(page).toHaveURL(/[?&]task=[0-9a-f-]{36}/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Title saves when you leave the box.
  const title = dialog.getByLabel("Title", { exact: true });
  await title.fill("Edited title");
  await title.press("Tab");
  await expect(dialog.getByRole("status")).toHaveText("Saved");

  // Notes save on blur too.
  await dialog.getByLabel("Notes").fill("Some notes");
  await dialog.getByLabel("Notes").blur();

  // A picker saves at once.
  await dialog.getByLabel("Priority").click();
  await page.getByRole("option", { name: "High" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Saved");

  // Everything is still there after a reload, with the drawer open at the same address.
  await page.reload();
  const again = page.getByRole("dialog");
  await expect(again.getByLabel("Title", { exact: true })).toHaveValue("Edited title");
  await expect(again.getByLabel("Notes")).toHaveValue("Some notes");
  await expect(again.getByLabel("Priority")).toContainText("High");
});

test("a deleted task can be undone, then restored or erased from the Trash screen", async ({
  page,
}) => {
  await page.goto("/inbox");
  await quickAdd(page, "Trash me");
  await page.getByRole("link", { name: /^Trash me/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Move to Trash" }).click();

  // Undo straight away: it comes back.
  await expect(toast(page)).toContainText("Task moved to Trash");
  await toast(page).getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: /^Trash me/ })).toBeVisible();

  // Delete it again and find it on the Trash screen.
  await page.getByRole("link", { name: /^Trash me/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Move to Trash" }).click();
  await page.goto("/trash");
  await expect(page.getByText("Trash me")).toBeVisible();
  await expect(page.getByText("Erased for good in 30 days.").first()).toBeVisible();

  // Restore it, then delete it for good (with a confirmation).
  await page.getByRole("button", { name: "Restore Trash me" }).click();
  await expect(page.getByRole("button", { name: "Restore Trash me" })).toHaveCount(0);
  await page.goto("/inbox");
  await expect(page.getByRole("link", { name: /^Trash me/ })).toBeVisible();

  await page.getByRole("link", { name: /^Trash me/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Move to Trash" }).click();
  await page.goto("/trash");
  await page.getByRole("button", { name: "Delete forever: Trash me" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete forever" }).click();
  await expect(page.getByRole("button", { name: "Delete forever: Trash me" })).toHaveCount(0);
});

test("seeded Trash item can be restored", async ({ page }) => {
  await page.goto("/trash");
  await expect(page.getByText("Old idea (in Trash)")).toBeVisible();
  await page.getByRole("button", { name: "Restore Old idea (in Trash)" }).click();
  await expect(page.getByRole("button", { name: "Restore Old idea (in Trash)" })).toHaveCount(0);
  await page.goto("/inbox");
  await expect(page.getByRole("link", { name: /^Old idea \(in Trash\)/ })).toBeVisible();
});

test("keyboard shortcuts: ?, j and k, x, e, Ctrl+K and /", async ({ page }) => {
  // Own list with two tasks, so nothing depends on the seed.
  await page.goto("/inbox");
  await page.getByRole("button", { name: "New list" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Keys list");
  await page.getByRole("button", { name: "Create list" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Keys list" })).toBeVisible();
  const add = page.getByLabel("Add a task");
  for (const title of ["Key A", "Key B"]) {
    await add.fill(title);
    await add.press("Enter");
    await expect(page.getByRole("link", { name: new RegExp(`^${title}`) })).toBeVisible();
  }
  await page.locator("body").click({ position: { x: 5, y: 300 } });

  // ? shows the help.
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // j moves down, k moves up.
  await page.keyboard.press("j");
  await expect(page.getByRole("link", { name: /^Key A/ })).toBeFocused();
  await page.keyboard.press("j");
  await expect(page.getByRole("link", { name: /^Key B/ })).toBeFocused();
  await page.keyboard.press("k");
  await expect(page.getByRole("link", { name: /^Key A/ })).toBeFocused();

  // x ticks the selected task.
  await page.keyboard.press("j");
  await page.keyboard.press("x");
  await expect(toast(page)).toContainText('Completed "Key B"');
  await page.waitForLoadState("networkidle"); // the list refreshes after the save; focus before that is lost

  // e opens the selected task with the title ready to edit; Escape closes the drawer.
  await page.getByRole("link", { name: /^Key A/ }).focus();
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog").getByLabel("Title", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Ctrl+K opens the palette; typing filters; Enter jumps.
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();
  await page.keyboard.type("upcoming");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/upcoming/);

  // The palette can also jump to a list.
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page.keyboard.type("Keys list");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Keys list" })).toBeVisible();

  // / goes to the search page with its box ready.
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/search/);
  await expect(page.getByRole("searchbox", { name: "Search tasks" })).toBeFocused();
});

test("quick add understands a sentence: date, time, list, tag and priority", async ({ page }) => {
  await page.goto("/inbox");
  await page.keyboard.press("q");
  const input = page.getByLabel("Task", { exact: true });
  await input.fill("NL pay rent tomorrow 5pm #home @bills p1");

  // The chips show what was understood, and the words leave the title.
  const chips = page.getByRole("list", { name: "Understood from your text" });
  await expect(chips).toContainText("Tomorrow, 5:00 pm");
  await expect(chips).toContainText("List: Home");
  await expect(chips).toContainText("Tag: bills");
  await expect(chips).toContainText("Priority: High");

  // A removed chip puts its words back into the task and stops applying.
  await chips.getByRole("button", { name: "Remove Priority: High" }).click();
  await expect(chips).not.toContainText("Priority: High");

  await input.press("Enter");
  await expect(
    page
      .locator("[data-sonner-toast]", { hasText: "Added to Home, due tomorrow, 5:00 pm" })
      .first(),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // It is in the Home list with its date and tag, and the title is clean (and keeps "p1").
  await page.goto("/upcoming");
  const row = page.getByRole("link", { name: /^NL pay rent p1/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("5:00 pm");
  await expect(row).toContainText("bills");
});

test("quick add with a tag nobody has used creates it", async ({ page }) => {
  await page.goto("/inbox");
  await page.keyboard.press("q");
  await page.getByLabel("Task", { exact: true }).fill("NL brand new tag @freshtag");
  await expect(page.getByRole("list", { name: "Understood from your text" })).toContainText(
    "New tag: freshtag",
  );
  await page.getByLabel("Task", { exact: true }).press("Enter");
  await expect(page.locator("[data-sonner-toast]", { hasText: "Added to" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: /^NL brand new tag/ })).toContainText("freshtag");
});
