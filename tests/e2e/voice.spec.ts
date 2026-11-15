import { expect, test } from "@playwright/test";

/**
 * Voice capture (docs/voice-spec.md §11). The e2e server runs with VOICE_FAKE=1, so the words are
 * understood by built-in rules, never by Groq. The browser has no microphone here, so these tests
 * use "Type instead", which goes through the same understanding, review and save steps.
 */

test("type a command, review the cards, add them, and undo", async ({ page }) => {
  await page.goto("/today");
  await page.keyboard.press("v");
  const sheet = page.getByRole("dialog");
  // No microphone in the test browser: the sheet explains and offers typing.
  await sheet.getByRole("button", { name: "Type instead" }).click();
  await sheet
    .getByLabel("What to add")
    .fill("Spent 640 on swiggy dinner today and create a task to book e2e voice tickets");
  await sheet.getByRole("button", { name: "Continue" }).click();

  await expect(sheet.getByText("Check and add")).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Expense" })).toBeVisible();
  await expect(sheet.getByLabel("Amount")).toHaveValue("640.00");
  await expect(sheet.getByLabel("Task")).toHaveValue("Book e2e voice tickets");
  await expect(sheet.getByText("guessed").first()).toBeVisible();

  await sheet.getByRole("button", { name: "Add 2 things" }).click();
  const toast = page.locator("[data-sonner-toast]", { hasText: "Added 1 task and 1 expense" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-sonner-toast]", { hasText: "Undone" })).toBeVisible();

  await page.goto("/search?q=e2e%20voice");
  await expect(page.getByText(/0 tasks and 0 money entries/)).toBeVisible();
});

test("removing a card and Not understood", async ({ page }) => {
  await page.goto("/today");
  await page.keyboard.press("v");
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Type instead" }).click();
  await sheet.getByLabel("What to add").fill("hello there");
  await sheet.getByRole("button", { name: "Continue" }).click();
  await expect(sheet.getByRole("heading", { name: "Not understood" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Close" })).toBeVisible();
  await sheet.getByRole("button", { name: "Add as a task" }).click();
  await expect(sheet.getByLabel("Task")).toHaveValue("hello there");
  await sheet.getByRole("button", { name: "Remove new task" }).click();
  await expect(sheet.getByText("Everything was removed.")).toBeVisible();
});
