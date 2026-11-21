import { expect, test } from "@playwright/test";

/** The public page on a phone: nothing scrolls sideways, the menu and the phone switcher work. */
test.use({ storageState: { cookies: [], origins: [] } });

test("the public page fits a phone and its controls work", async ({ page }) => {
  await page.goto("/welcome");
  await page.waitForLoadState("networkidle");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // The link pill becomes a menu.
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("link", { name: "FAQ" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();

  // The screen switcher above the phone changes the screen.
  await page
    .getByRole("group", { name: "Screens" })
    .getByRole("button", { name: "Journal" })
    .click();
  await expect(page.getByAltText(/a journal page/)).toContainClass("on");

  // The hero phone is on the first screen, without scrolling.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const phone = await page.locator(".phone-area .phone").boundingBox();
  expect(phone?.y ?? 9999).toBeLessThan(page.viewportSize()?.height ?? 0);
});
