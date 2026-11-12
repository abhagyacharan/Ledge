import { expect, test } from "@playwright/test";

/**
 * The sidebar (docs/design.md §5e): a module's whole header row is one button that shows and
 * hides its pages, without leaving the page you are on. Journal, a module with no sub-pages, is
 * a single link.
 */
test("a sidebar section opens and closes with one button, and Journal is a link", async ({
  page,
}) => {
  await page.goto("/journal");
  await expect(page.getByRole("heading", { level: 1, name: "Journal" })).toBeVisible();

  const sidebar = page.locator("[data-sidebar=sidebar]");
  const header = sidebar.getByRole("button", { name: "Expense Tracker" });
  await expect(header).toHaveAttribute("aria-expanded", "false");

  await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar.getByRole("link", { name: "Income" })).toBeVisible();
  await expect(page).toHaveURL(/\/journal$/);

  await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar.getByRole("link", { name: "Income" })).toBeHidden();

  await expect(sidebar.getByRole("link", { name: "Journal" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
