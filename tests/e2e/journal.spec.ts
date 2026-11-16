import { expect, test } from "@playwright/test";
import { E2E_JOURNAL_PIN, openJournal } from "./journal-pin";

/**
 * The journal (docs/journal-spec.md), against the seeded demo account: the day's facts, folding
 * them away while you write, autosave, mood, the day picker and the links into Tasks and Expenses.
 * It writes on a day well in the past, so it never disturbs today's page.
 */

const DAY = "2026-01-15";

test("write a page: facts fold away, the page and mood save themselves", async ({ page }) => {
  await openJournal(page, `/journal?d=${DAY}`);

  // The facts come first; the expense card is there even on a quiet day.
  const facts = page.getByRole("region", { name: "The day in facts" });
  await expect(facts.getByRole("link", { name: /spent|No-spend day/ })).toBeVisible();

  // Writing folds the facts into one line; the line opens them again.
  const box = page.getByRole("textbox", { name: "This day's page" });
  await box.click();
  const summary = facts.getByRole("button", { name: /^Show your day/ });
  await expect(summary).toBeVisible();
  await box.fill("Morning walk.\nEvening: finished the report.");
  await expect(page.getByText(/^Saved /)).toBeVisible();

  await page.getByRole("radio", { name: "Good" }).check();
  await expect(page.getByText(/^Saved /)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "This day's page" })).toHaveValue(
    "Morning walk.\nEvening: finished the report.",
  );
  await expect(page.getByRole("radio", { name: "Good" })).toBeChecked();
});

test("the day picker marks days with a page and never goes past today", async ({ page }) => {
  await openJournal(page, `/journal?d=${DAY}`);
  await page.getByRole("textbox", { name: "This day's page" }).fill("A dot for this day.");
  await expect(page.getByText(/^Saved /)).toBeVisible();

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
  await openJournal(page, `/journal?d=${DAY}`);
  const facts = page.getByRole("region", { name: "The day in facts" });
  await facts.getByRole("link", { name: /spent|No-spend day/ }).click();
  await expect(page).toHaveURL(new RegExp(`/expenses/spending\?.*day=${DAY}`));
  await expect(page.getByRole("button", { name: /Showing .* only/ })).toBeVisible();

  await openJournal(page, `/journal?d=${DAY}`);
  await page
    .getByRole("region", { name: "The day in facts" })
    .getByRole("link", { name: /done|rest day|ticked off/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/completed\?day=${DAY}`));
  await expect(page.getByRole("link", { name: "Show all days" })).toBeVisible();
});

test("the journal lock: turn on, lock when hidden, wrong PIN, unlock, turn off", async ({
  page,
}) => {
  // Turn it on from the Journal's own button (screen 7a): choose a PIN, then type it again.
  await openJournal(page);
  await page.getByRole("link", { name: "Lock with a PIN" }).click();
  await expect(page.getByRole("heading", { name: "Choose a journal PIN" })).toBeVisible();
  await page.getByLabel("New PIN").fill(E2E_JOURNAL_PIN);
  await page.getByLabel("Confirm PIN").fill(E2E_JOURNAL_PIN);
  await expect(page.getByRole("button", { name: /Lock now/ })).toBeVisible();

  // Hiding the tab (another tab, the app in the background, the screen off) locks it at once.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("[data-journal-private]")).toBeHidden();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("heading", { name: "Journal is locked" })).toBeVisible();

  // A wrong PIN says how many tries are left; the right one opens it.
  await page.getByLabel("PIN", { exact: true }).fill("0000");
  await expect(page.getByRole("alert")).toContainText("tries left");
  await page.getByLabel("PIN", { exact: true }).fill(E2E_JOURNAL_PIN);
  await expect(page.getByRole("textbox", { name: "This day's page" })).toBeVisible();

  // Turn it off again in Settings with the current PIN, so other tests find it open.
  await page.goto("/settings/journal-lock");
  await page.getByRole("button", { name: "Turn off the lock" }).click();
  await page.getByLabel("Enter your current PIN").fill(E2E_JOURNAL_PIN);
  await expect(page.getByRole("switch", { name: "Lock Journal with a PIN" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});
