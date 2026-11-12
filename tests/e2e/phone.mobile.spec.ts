import { expect, test, type Page } from "@playwright/test";

/**
 * Phone-width checks (CLAUDE.md §8, §15): no sideways scrolling, tap targets of at least 44 px,
 * and a full-screen task drawer. Runs on a Pixel 7 sized screen with touch.
 */

const MIN = 44;

/** Dialogs and panels zoom in for a moment; measure only once they have stopped moving. */
const settle = (page: Page) => page.waitForTimeout(450);

/** Interactive controls that are visible on screen, with their size. Inline text links in sentences are skipped. */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((min) => {
    const selector =
      "a[href], button, input:not([type=hidden]), select, textarea, [role=checkbox], [role=combobox], [role=menuitem], [role=option]";
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      // A checkbox inside a label is tapped through the label, so measure the label.
      const target =
        el instanceof HTMLInputElement && el.type === "checkbox" ? (el.closest("label") ?? el) : el;
      const box = target.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (box.width === 0 || box.height === 0) continue;
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (el.closest("[aria-hidden=true], [inert], nextjs-portal, [data-nextjs-toast]")) continue;
      if (el.closest("p") && el.tagName === "A") continue; // a link inside a sentence
      if (el.closest("p") && el.tagName === "BUTTON") continue; // a text button inside a sentence
      const hasText = (el.textContent ?? "").trim().length > 0;
      const tooShort = box.height < min - 0.5;
      const tooNarrow = !hasText && box.width < min - 0.5; // icon-only controls must be 44 wide too
      if (tooShort || tooNarrow) {
        const name =
          el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 30) ?? el.tagName;
        out.push(
          `${el.tagName.toLowerCase()} "${name}" is ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
      }
    }
    return out;
  }, MIN);
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const SCREENS = [
  "/tasks",
  "/today",
  "/upcoming",
  "/all",
  "/completed",
  "/trash",
  "/settings",
  "/search",
  "/journal",
  "/search?q=call",
  "/expenses",
  "/expenses/income",
  "/expenses/emis",
  "/expenses/spending",
  "/expenses/investments",
];

for (const path of SCREENS) {
  test(`${path}: fits the screen and has big enough tap targets`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await noSidewaysScroll(page);
    expect(await smallTargets(page)).toEqual([]);
  });
}

test("the bottom tab bar, the More sheet, the Lists menu and a list's View panel", async ({
  page,
}) => {
  await page.goto("/tasks");
  const bar = page.getByRole("navigation", { name: "Main" });
  await expect(bar.getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
  await expect(bar.getByRole("link", { name: "Expenses" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Journal" })).toBeVisible();
  // Phones: Search is a tab (the header's round Search button is hidden), and no logo row.
  await expect(bar.getByRole("link", { name: "Search" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Search tasks and expenses" })).toBeHidden();
  await expect(page.getByRole("main").getByRole("link", { name: "Ledge" })).toHaveCount(0);

  // More holds Trash, Settings and the account, not the lists.
  await bar.getByRole("button", { name: "More" }).tap();
  const more = page.getByRole("dialog", { name: "More" });
  await expect(more).toBeVisible();
  await expect(more.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(more.getByRole("link", { name: "Work", exact: true })).toHaveCount(0);
  await settle(page);
  expect(await smallTargets(page)).toEqual([]); // the More sheet
  await page.keyboard.press("Escape");
  await expect(more).toBeHidden();

  // The lists live in the Lists menu at the top of the Tasks pages.
  await page.getByRole("button", { name: "Lists" }).tap();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]); // the Lists menu
  await menu.getByRole("menuitem", { name: "Work", exact: true }).tap();
  await expect(menu).toBeHidden();
  await expect(page.getByRole("button", { name: "Lists, now showing Work" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Work" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await noSidewaysScroll(page);
  expect(await smallTargets(page)).toEqual([]);

  await page.getByRole("button", { name: /^View/ }).tap();
  await expect(page.getByLabel("Sort by")).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]);
});

test("the task drawer fills the screen and has big enough tap targets", async ({ page }) => {
  await page.goto("/today");
  await page.getByRole("link", { name: /^Call mom/ }).tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(400); // let the slide-in finish
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.width).toBeGreaterThanOrEqual((viewport?.width ?? 0) - 1);
  expect(box?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) - 1);
  expect(await smallTargets(page)).toEqual([]);
  await noSidewaysScroll(page);
});

test("the drawer of a repeating task has big enough tap targets", async ({ page }) => {
  await page.goto("/today");
  await page.getByRole("link", { name: /^Send monthly invoice/ }).tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Repeat every")).toBeVisible();
  await page.waitForTimeout(400); // let the slide-in finish
  expect(await smallTargets(page)).toEqual([]);
  await noSidewaysScroll(page);
});

test("quick add button is always reachable and the dialog fits", async ({ page }) => {
  await page.goto("/tasks");
  const add = page.getByRole("button", { name: /Quick add task/ });
  await expect(add).toBeVisible();
  const box = await add.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(MIN);
  await add.tap();
  await expect(page.getByRole("dialog", { name: "Add a task" })).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]);
});

test("quick add chips have big enough tap targets", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Quick add task/ }).tap();
  await page.getByLabel("Task", { exact: true }).fill("Pay rent tomorrow 5pm #home p1");
  await expect(page.getByRole("list", { name: "Understood from your text" })).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]);
  await noSidewaysScroll(page);
});

test("the expense dialog fits a phone and has big enough tap targets", async ({ page }) => {
  await page.goto("/expenses/emis");
  await page.getByRole("button", { name: "Add EMI or loan payment", exact: true }).first().tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]);
  await noSidewaysScroll(page);
});

test("the expense tabs scroll sideways inside their own bar, not the page", async ({ page }) => {
  await page.goto("/expenses");
  const tabs = page.getByRole("navigation", { name: "Expense sections" });
  await expect(tabs.getByRole("link", { name: "Summary" })).toBeVisible();
  await tabs.getByRole("link", { name: "Investments" }).scrollIntoViewIfNeeded();
  await tabs.getByRole("link", { name: "Investments" }).tap();
  await expect(page).toHaveURL(/\/expenses\/investments/);
  await noSidewaysScroll(page);
});

test("the log-a-transaction menu and the period picker fit a phone", async ({ page }) => {
  await page.goto("/expenses");
  await page.getByRole("button", { name: "Log a transaction" }).tap();
  await expect(page.getByRole("menu")).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]);
  await noSidewaysScroll(page);
  await page.getByRole("menuitem", { name: /^Expense/ }).tap();
  await expect(page.getByRole("dialog", { name: "Add expense" })).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]);
  await page.getByRole("button", { name: "Close" }).tap();

  await page.getByRole("button", { name: /^Choose period/ }).tap();
  await expect(page.getByRole("dialog", { name: "Choose a period" })).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]);
  await noSidewaysScroll(page);
});

test("the new list form fits a phone and has big enough tap targets", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: "New list" }).first().tap();
  await expect(page.getByRole("dialog", { name: "New list" })).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]);
  await noSidewaysScroll(page);
});
