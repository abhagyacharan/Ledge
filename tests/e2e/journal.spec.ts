import { expect, test } from "@playwright/test";

/**
 * The journal (docs/journal-spec.md), against the seeded demo account: the day's facts, folding
 * them away while you write, autosave, mood, the day picker and the links into Tasks and Expenses.
 * It writes on a day well in the past, so it never disturbs today's page.
 */

const DAY = "2026-01-15";

test("write a page: facts fold away, the page and mood save themselves", async ({ page }) => {
  await page.goto(`/journal?d=${DAY}`);
  await expect(page.getByRole("heading", { level: 1, name: "Journal" })).toBeVisible();

  // The facts come first; the expense card is there even on a quiet day.
  const facts = page.getByRole("region", { name: "Your day" });
  await expect(facts.getByRole("link", { name: /spent|No-spend day/ })).toBeVisible();

  // Writing folds the facts into one line; the line opens them again.
  const box = page.getByRole("textbox", { name: "This day's page" });
  await box.click();
  const summary = facts.getByRole("button", { name: /^Show your day/ });
  await expect(summary).toBeVisible();
  await box.fill("Morning walk.\nEvening: finished the report.");
  await expect(page.getByText(/^Saved ·/)).toBeVisible();

  await page.getByRole("radio", { name: "Good" }).check();
  await expect(page.getByText(/^Saved ·/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "This day's page" })).toHaveValue(
    "Morning walk.\nEvening: finished the report.",
  );
  await expect(page.getByRole("radio", { name: "Good" })).toBeChecked();
});

test("the day picker marks days with a page and never goes past today", async ({ page }) => {
  await page.goto(`/journal?d=${DAY}`);
  await page.getByRole("textbox", { name: "This day's page" }).fill("A dot for this day.");
  await expect(page.getByText(/^Saved ·/)).toBeVisible();

  await page.getByRole("button", { name: /^Choose a day/ }).click();
  const picker = page.getByRole("dialog", { name: "Choose a day" });
  await expect(picker.getByRole("button", { name: /15 January.*has a page/ })).toBeVisible();
  await picker.getByRole("button", { name: /^Friday, 16 January/ }).click();
  await expect(page).toHaveURL(/d=2026-01-16/);

  await page.getByRole("button", { name: /^Choose a day/ }).click();
  await page
    .getByRole("dialog", { name: "Choose a day" })
    .getByRole("button", { name: "Today" })
    .click();
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page.getByRole("button", { name: "Next day" })).toBeDisabled();
});

test("the fact cards open the same day in Tasks and Expenses", async ({ page }) => {
  await page.goto(`/journal?d=${DAY}`);
  const facts = page.getByRole("region", { name: "Your day" });
  await facts.getByRole("link", { name: /spent|No-spend day/ }).click();
  await expect(page).toHaveURL(new RegExp(`/expenses/spending\?.*day=${DAY}`));
  await expect(page.getByRole("button", { name: /Showing .* only/ })).toBeVisible();

  await page.goto(`/journal?d=${DAY}`);
  await page
    .getByRole("region", { name: "Your day" })
    .getByRole("link", { name: /done|rest day|ticked off/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/completed\?day=${DAY}`));
  await expect(page.getByRole("link", { name: "Show every day" })).toBeVisible();
});
