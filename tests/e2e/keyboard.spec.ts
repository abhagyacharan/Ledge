import { expect, test, type Page } from "@playwright/test";

/**
 * Keyboard-only use (CLAUDE.md §8, §15): everything can be reached with Tab, and whatever has the
 * keyboard focus is visibly marked. A person still needs to judge the order and wording.
 */

type Stop = { what: string; visible: boolean };

/** Presses Tab `count` times and reports, for each stop, whether the focused control shows a ring. */
async function tabThrough(page: Page, count: number): Promise<Stop[]> {
  const stops: Stop[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press("Tab");
    stops.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return { what: "(nothing)", visible: true };
        // The Next.js dev overlay is not part of the app and does not exist in production.
        if (el.tagName.toLowerCase() === "nextjs-portal")
          return { what: "(dev overlay)", visible: true };
        const s = getComputedStyle(el);
        const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
        const shadow = s.boxShadow !== "none" && s.boxShadow !== "";
        const label =
          el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 40) ?? el.tagName;
        return { what: `${el.tagName.toLowerCase()} "${label}"`, visible: outline || shadow };
      }),
    );
  }
  return stops;
}

test("every stop on the Today screen shows a focus ring", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const stops = await tabThrough(page, 45);
  const hidden = stops.filter((s) => !s.visible).map((s) => s.what);
  expect(hidden).toEqual([]);
  // Tab really moves through different controls (it is not stuck).
  expect(new Set(stops.map((s) => s.what)).size).toBeGreaterThan(20);
});

test("every stop on a list screen with a drag handle shows a focus ring", async ({ page }) => {
  await page.goto("/inbox");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const stops = await tabThrough(page, 45);
  expect(stops.filter((s) => !s.visible).map((s) => s.what)).toEqual([]);
  expect(stops.some((s) => s.what.includes("Reorder"))).toBe(true);
});

test("a task can be added, opened, changed and closed with the keyboard alone", async ({
  page,
}) => {
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  // Quick add with q, type, Enter, close with Escape.
  await page.keyboard.press("q");
  await page.keyboard.type("Keyboard only task");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-sonner-toast]", { hasText: "Added to" }).first()).toBeVisible();
  await page.keyboard.press("Escape");

  // Select it with j, open it with Enter, change the title, close with Escape.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("j");
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
    if (focused.startsWith("Keyboard only task")) break;
  }
  await expect(page.getByRole("link", { name: /^Keyboard only task/ })).toBeFocused();
  await page.keyboard.press("Enter");
  const title = page.getByRole("dialog").getByLabel("Title", { exact: true });
  await expect(title).toBeVisible();
  await title.focus();
  await title.fill("Keyboard only task, renamed");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText("Saved");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Keyboard only task, renamed/ })).toBeVisible();
});
