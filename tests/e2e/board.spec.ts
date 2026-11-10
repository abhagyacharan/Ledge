import { expect, test } from "@playwright/test";

/**
 * Board view (CLAUDE.md §6.2, P1): one column per section, cards dragged between columns, and the
 * choice of list or board remembered per list. Creates its own list so it does not depend on the seed.
 */

test("board view: columns are sections, drag a card across, and the choice is remembered", async ({
  page,
}) => {
  await page.goto("/inbox");
  await page.getByRole("button", { name: "New list" }).click();
  await page.getByLabel("Name", { exact: true }).fill("E2E board");
  await page.getByRole("button", { name: "Create list" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E board" })).toBeVisible();

  // A section, and two tasks with no section yet.
  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Doing");
  await page.getByRole("button", { name: "Add section" }).last().click();
  await expect(page.getByRole("heading", { name: /^Doing/ })).toBeVisible();
  const add = page.getByLabel("Add a task").first();
  for (const title of ["Alpha", "Beta"]) {
    await add.fill(title);
    await add.press("Enter");
    await expect(page.getByRole("link", { name: new RegExp(`^${title}`) })).toBeVisible();
  }

  // Switch to the board: a region with a column for "No section" and one for "Doing".
  await page.getByRole("button", { name: "Board view" }).click();
  const board = page.getByRole("region", { name: "Board" });
  await expect(board).toBeVisible();
  await expect(page.getByRole("button", { name: "Board view" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const noSection = board.locator("section", {
    has: page.getByRole("heading", { name: /^No section/ }),
  });
  const doing = board.locator("section", { has: page.getByRole("heading", { name: /^Doing/ }) });
  await expect(noSection.getByRole("link", { name: /^Alpha/ })).toBeVisible();
  await expect(doing.getByRole("link", { name: /^Alpha/ })).toHaveCount(0);

  // Pick up Alpha with the keyboard, move it one column to the right, drop it.
  await page.getByRole("button", { name: "Reorder Alpha" }).focus();
  for (const key of ["Space", "ArrowRight", "Space"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
  }
  await expect(doing.getByRole("link", { name: /^Alpha/ })).toBeVisible();
  await expect(noSection.getByRole("link", { name: /^Beta/ })).toBeVisible();

  // The move and the choice of board are both saved.
  await page.reload();
  await expect(page.getByRole("button", { name: "Board view" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page
      .getByRole("region", { name: "Board" })
      .locator("section", { has: page.getByRole("heading", { name: /^Doing/ }) })
      .getByRole("link", { name: /^Alpha/ }),
  ).toBeVisible();

  // Back to the list view: no board region, and that choice is remembered too.
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.getByRole("region", { name: "Board" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
