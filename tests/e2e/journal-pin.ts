import { expect, type Page } from "@playwright/test";

/** The PIN the e2e demo account uses when a test turns the journal lock on. */
export const E2E_JOURNAL_PIN = "2580";

/**
 * Opens a journal URL. The lock is off by default (docs/journal-spec.md, "Journal lock"); if a
 * test left it on, this enters the PIN.
 */
export async function openJournal(page: Page, url = "/journal") {
  await page.goto(url);
  const locked = page.getByRole("heading", { name: "Journal is locked" });
  const open = page.getByRole("heading", { level: 1, name: "Journal" });
  await expect(locked.or(open)).toBeVisible();
  if (await locked.isVisible()) await page.getByLabel("PIN", { exact: true }).fill(E2E_JOURNAL_PIN);
  await expect(open).toBeVisible();
}
