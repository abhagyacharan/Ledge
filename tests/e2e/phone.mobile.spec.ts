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
  "/inbox",
  "/today",
  "/upcoming",
  "/all",
  "/completed",
  "/trash",
  "/settings",
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

test("a list with sections: tap targets, and the View panel", async ({ page }) => {
  await page.goto("/inbox");
  await page.getByRole("button", { name: "Open navigation" }).tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await smallTargets(page)).toEqual([]); // the side menu
  await page.getByRole("link", { name: "Work", exact: true }).tap();
  await expect(page.getByRole("heading", { level: 1, name: "Work" })).toBeVisible();
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

test("quick add button is always reachable and the dialog fits", async ({ page }) => {
  await page.goto("/inbox");
  const add = page.getByRole("button", { name: /Quick add task/ });
  await expect(add).toBeVisible();
  const box = await add.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(MIN);
  await add.tap();
  await expect(page.getByRole("dialog", { name: "Quick add" })).toBeVisible();
  await settle(page);
  expect(await smallTargets(page)).toEqual([]);
});

test("quick add chips have big enough tap targets", async ({ page }) => {
  await page.goto("/inbox");
  await page.getByRole("button", { name: /Quick add task/ }).tap();
  await page.getByLabel("Task", { exact: true }).fill("Pay rent tomorrow 5pm #home @bills p1");
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
