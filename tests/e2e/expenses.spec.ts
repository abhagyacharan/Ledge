import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The expense tracker (Phase 7, docs/expenses-spec.md), against the seeded demo account.
 *  - The summary for the current month matches O's sample sheet exactly.
 *  - The period picker, adding every kind of entry, editing, deleting with Undo, the Trash,
 *    filtering and searching.
 * Tests that add data use March 2025, which the seed leaves empty, so they never disturb the
 * current month that the first test checks. Each run starts from a freshly seeded database.
 */

const YEAR = new Date().getFullYear();

/** The tile with this label on the summary (a <dt> and its value). */
function tile(page: Page, label: string): Locator {
  return page.locator("dl > div", { has: page.locator("dt", { hasText: label }) });
}

const toast = (page: Page) => page.locator("[data-sonner-toast]").first();

/** The chips for one choice in the sheet (real radio buttons underneath). */
const choices = (dialog: Locator, label: string) =>
  dialog.getByRole("radiogroup", { name: label, exact: true });

/** Taps one chip in the sheet. */
async function choose(dialog: Locator, label: string, option: string) {
  await choices(dialog, label).getByRole("radio", { name: option, exact: true }).check();
}

/** The period button between the arrows ("Choose period: November 2026"). */
const periodButton = (page: Page) => page.getByRole("button", { name: /^Choose period/ });

/** Opens the month grid and picks a month ("Mar") or "Whole year", in the year it shows. */
async function pickPeriod(page: Page, choice: string) {
  await periodButton(page).click();
  const picker = page.getByRole("dialog", { name: "Choose a period" });
  await picker.getByRole("button", { name: new RegExp(`^${choice}`) }).click();
  await expect(picker).toBeHidden();
}

/** Runs an action from a row's "more" menu (wide screens). */
async function rowAction(page: Page, title: string, action: string) {
  await page.getByRole("button", { name: `More actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: action }).click();
}

async function openAdd(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("the summary for this month matches the sample sheet", async ({ page }) => {
  await page.goto("/expenses");
  await expect(page.getByRole("heading", { level: 1, name: "Expenses" })).toBeVisible();

  // The four tiles (the sheet's five, with the savings rate and investing on the orange tile).
  await expect(tile(page, "Total inflows")).toContainText("₹28,000.00");
  await expect(tile(page, "Total EMIs & loans")).toContainText("₹10,142.00");
  await expect(tile(page, "Total EMIs & loans")).toContainText("₹9,142.00 paid");
  await expect(tile(page, "Total EMIs & loans")).toContainText("₹1,000.00 to pay");
  await expect(tile(page, "Living expenses")).toContainText("₹4,600.00");
  await expect(tile(page, "Net savings")).toContainText("₹13,258.00");
  await expect(tile(page, "Net savings")).toContainText("Savings rate 47.4%");
  // The extra row for investing.
  await expect(tile(page, "Net savings")).toContainText("₹5,000.00 invested");
  await expect(tile(page, "Net savings")).toContainText("₹8,258.00 left after investing");

  // Expense breakdown: every category listed, shares as in the sheet.
  const breakdown = page.getByRole("table", { name: /Expense breakdown/ });
  await expect(breakdown.getByRole("row", { name: /Transportation/ })).toContainText("4,000.00");
  await expect(breakdown.getByRole("row", { name: /Transportation/ })).toContainText("87.0%");
  await expect(breakdown.getByRole("row", { name: /Subscriptions & Tech/ })).toContainText("13.0%");
  await expect(breakdown.getByRole("row", { name: /Healthcare/ })).toContainText("0.0%");
  await expect(breakdown.getByRole("row", { name: /Total living expenses/ })).toContainText(
    "4,600.00",
  );
  await expect(breakdown.getByRole("row")).toHaveCount(1 + 9 + 1); // header, nine categories, total

  // Annual trend: twelve months, the selected one marked, and a full-year row.
  const trend = page.getByRole("table", {
    name: new RegExp(`Cash flow for each month of ${YEAR}`),
  });
  await expect(trend.getByRole("row")).toHaveCount(1 + 12 + 1);
  await expect(trend.locator("tr[aria-current=true]")).toContainText("selected");
  await expect(trend.locator("tr[aria-current=true]")).toContainText("28,000.00");
  await expect(trend.locator("tr[aria-current=true]")).toContainText("13,258.00");
  await expect(trend.getByRole("columnheader", { name: "Savings %" })).toHaveCount(0);
  await expect(trend.getByRole("row", { name: /Full year total/ })).toBeVisible();
});

test("the five tabs, and the period picker that follows you around", async ({ page }) => {
  await page.goto("/expenses");
  const tabs = page.getByRole("navigation", { name: "Expense sections" });
  for (const name of ["Summary", "Income", "EMIs & loans", "Expenses", "Investments"]) {
    await expect(tabs.getByRole("link", { name })).toBeVisible();
  }
  await expect(tabs.getByRole("link", { name: "Summary" })).toHaveAttribute("aria-current", "page");

  // Whole year: the tiles add up every month.
  await pickPeriod(page, "Whole year");
  await expect(page).toHaveURL(/m=all/);
  await expect(page.getByRole("heading", { name: `${YEAR} at a glance` })).toBeVisible();

  // The chosen period travels to the other tabs.
  await tabs.getByRole("link", { name: "Income" }).click();
  await expect(page).toHaveURL(/\/expenses\/income.*m=all/);
  await expect(page.getByRole("heading", { name: `Income in ${YEAR}` })).toBeVisible();

  // Previous and next month.
  await pickPeriod(page, "March");
  await expect(periodButton(page)).toContainText(`March ${YEAR}`);
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(periodButton(page)).toContainText("April");
  await page.getByRole("button", { name: "Previous month" }).click();
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(periodButton(page)).toContainText("February");
  // "This month" comes straight back, and the bars of the chart open a month too.
  await periodButton(page).click();
  await page.getByRole("button", { name: "This month", exact: true }).click();
  await expect(page).not.toHaveURL(/m=2(&|$)/);

  // A year with nothing in it shows an empty state with an action.
  await page.goto("/expenses?y=2020&m=6");
  await expect(page.getByText("Nothing recorded for June 2020 yet")).toBeVisible();
  await page.getByRole("button", { name: "Add income" }).click();
  await expect(page.getByRole("dialog", { name: "Add income" })).toBeVisible();
});

test("add income, an EMI series, an expense and an investment, and the summary follows", async ({
  page,
}) => {
  const march = "?y=2025&m=3";

  // Income
  await page.goto(`/expenses/income${march}`);
  await expect(page.getByText("No income in March 2025")).toBeVisible();
  let dialog = await openAdd(page, /^Add income$/);
  await dialog.getByLabel("Date").fill("2025-03-01");
  await dialog.getByLabel("Income stream").fill("E2E salary");
  await expect(choices(dialog, "Category").getByRole("radio", { checked: true })).toHaveCount(0);
  await choose(dialog, "Category", "Salary");
  await expect(choices(dialog, "Category").getByRole("radio", { name: "Salary" })).toBeChecked();
  await dialog.getByLabel("Amount").fill("50,000");
  await dialog.getByRole("button", { name: "Add income" }).click();
  await expect(toast(page)).toContainText("Added");
  await expect(page.getByRole("button", { name: "Edit E2E salary", exact: true })).toBeVisible();
  await expect(page.getByText("₹50,000.00").first()).toBeVisible();

  // EMI that repeats for two more months
  await page.goto(`/expenses/emis${march}`);
  dialog = await openAdd(page, /^Add EMI or loan payment$/);
  await choose(dialog, "Type", "Fixed EMI");
  await dialog.getByLabel("Due date").fill("2025-03-05");
  await dialog.getByLabel("Loan or debt").fill("E2E loan");
  await dialog.getByLabel("Lender (optional)").fill("Test Bank");
  await choose(dialog, "Category", "Personal loan");
  await dialog.getByLabel("Amount").fill("12000");
  await dialog.getByLabel("Also add for the next months").fill("2");
  await dialog.getByRole("button", { name: "Add EMI or loan payment" }).click();
  await expect(toast(page)).toContainText("Added 3 EMIs and loans");
  await expect(page.getByRole("button", { name: "Edit E2E loan", exact: true })).toHaveCount(1);
  // March 2025 is long past, so a scheduled EMI there is shown as overdue (in words, not only colour).
  await expect(page.getByText("Overdue").first()).toBeVisible();

  // The series continues into April and May
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(periodButton(page)).toContainText("April");
  await expect(page.getByRole("button", { name: "Edit E2E loan", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Previous month" }).click();

  // Mark it paid
  await page.getByRole("button", { name: "Mark paid: E2E loan" }).click();
  await expect(toast(page)).toContainText("Marked");
  await expect(page.getByText("Paid", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark paid: E2E loan" })).toHaveCount(0);

  // Expense
  await page.goto(`/expenses/spending${march}`);
  dialog = await openAdd(page, /^Add expense$/);
  await dialog.getByLabel("Date").fill("2025-03-10");
  await dialog.getByLabel("Item").fill("E2E groceries");
  await choose(dialog, "Category", "Food & Groceries");
  await choose(dialog, "Payment method", "UPI");
  await dialog.getByLabel("Amount").fill("8,000.50");
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expect(page.getByRole("button", { name: "Edit E2E groceries", exact: true })).toBeVisible();

  // Investment
  await page.goto(`/expenses/investments${march}`);
  dialog = await openAdd(page, /^Add investment$/);
  await dialog.getByLabel("Date").fill("2025-03-12");
  await dialog.getByLabel("Investment").fill("E2E fund");
  await choose(dialog, "Type", "Mutual fund");
  await dialog.getByLabel("Platform (optional)").fill("Groww");
  await dialog.getByLabel("Amount").fill("5000");
  await dialog.getByRole("button", { name: "Add investment" }).click();
  await expect(page.getByRole("button", { name: "Edit E2E fund", exact: true })).toBeVisible();

  // The summary for March 2025 now adds up (amounts are exact, down to the paisa).
  await page.goto(`/expenses${march}`);
  await expect(tile(page, "Total inflows")).toContainText("₹50,000.00");
  await expect(tile(page, "Total EMIs & loans")).toContainText("₹12,000.00");
  await expect(tile(page, "Total EMIs & loans")).toContainText("₹12,000.00 paid");
  await expect(tile(page, "Living expenses")).toContainText("₹8,000.50");
  await expect(tile(page, "Net savings")).toContainText("₹29,999.50");
  await expect(tile(page, "Net savings")).toContainText("Savings rate 60.0%");
  await expect(tile(page, "Net savings")).toContainText("₹5,000.00 invested");
  await expect(tile(page, "Net savings")).toContainText("₹24,999.50 left after investing");
  const breakdown = page.getByRole("table", { name: /Expense breakdown/ });
  await expect(breakdown.getByRole("row", { name: /Food & Groceries/ })).toContainText("100.0%");
});

test("a form refuses bad input with clear messages, then edit and delete with Undo", async ({
  page,
}) => {
  const query = "?y=2025&m=4";
  await page.goto(`/expenses/spending${query}`);
  const dialog = await openAdd(page, /^Add expense$/);

  // Empty form: every missing field is named.
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expect(dialog.getByText("Enter a name")).toBeVisible();
  await expect(dialog.getByText("Pick a category")).toBeVisible();
  await expect(dialog.getByText("Pick a payment method")).toBeVisible();
  await expect(dialog.getByText("Enter an amount")).toBeVisible();

  // A malformed amount is explained.
  await dialog.getByLabel("Item").fill("Bad amount");
  await choose(dialog, "Category", "Shopping");
  await choose(dialog, "Payment method", "Cash");
  await dialog.getByLabel("Date").fill("2025-04-02");
  await dialog.getByLabel("Amount").fill("12.345");
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expect(dialog.getByText(/Enter an amount like 1234/)).toBeVisible();
  await dialog.getByLabel("Amount").fill("0");
  await dialog.getByRole("button", { name: "Add expense" }).click();
  await expect(dialog.getByText("Enter an amount above zero")).toBeVisible();

  // Fix it and save.
  await dialog.getByLabel("Amount").fill("₹ 1,250.75");
  await dialog.getByRole("button", { name: "Add expense" }).click();
  const row = page.getByRole("listitem").filter({ hasText: "Bad amount" });
  await expect(row).toContainText("1,250.75");

  // Edit it.
  await page.getByRole("button", { name: "Edit Bad amount", exact: true }).click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByLabel("Amount", { exact: true })).toHaveValue("1250.75");
  await editor.getByLabel("Item").fill("Fixed name");
  await editor.getByLabel("Amount", { exact: true }).fill("1300");
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Fixed name" })).toContainText(
    "1,300.00",
  );

  // Delete, then Undo.
  await rowAction(page, "Fixed name", "Delete");
  await expect(toast(page)).toContainText('Deleted "Fixed name"');
  await expect(page.getByRole("button", { name: "Edit Fixed name", exact: true })).toHaveCount(0);
  await toast(page).getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Edit Fixed name", exact: true })).toBeVisible();

  // Delete again: it is in the Trash, where it can be restored.
  await rowAction(page, "Fixed name", "Delete");
  await page.goto("/trash");
  await expect(page.getByText("Fixed name")).toBeVisible();
  await expect(page.getByText(/Expenses entry, 2 Apr 2025/)).toBeVisible();
  await page.getByRole("button", { name: "Restore Fixed name" }).click();
  await page.goto(`/expenses/spending${query}`);
  await expect(page.getByRole("button", { name: "Edit Fixed name", exact: true })).toBeVisible();
});

test("filter by category, sort, and search", async ({ page }) => {
  const query = "?y=2025&m=5";
  await page.goto(`/expenses/spending${query}`);
  const add = async (item: string, category: string, amount: string, notes = "") => {
    const dialog = await openAdd(page, /^Add expense$/);
    await dialog.getByLabel("Date").fill("2025-05-03");
    await dialog.getByLabel("Item").fill(item);
    await choose(dialog, "Category", category);
    await choose(dialog, "Payment method", "UPI");
    await dialog.getByLabel("Amount").fill(amount);
    if (notes) await dialog.getByLabel("Notes (optional)").fill(notes);
    await dialog.getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByRole("button", { name: `Edit ${item}`, exact: true })).toBeVisible();
  };
  await add("Cheap lunch", "Food & Groceries", "100");
  await add("Big TV", "Shopping", "50000", "Black Friday deal");
  await add("Mid shoes", "Shopping", "3000");

  const order = async () => await page.locator("main li [data-entry-title]").allInnerTexts();

  // Sort by amount.
  await page.getByLabel("Sort by").click();
  await page.getByRole("option", { name: "Highest amount" }).click();
  await expect.poll(order).toEqual(["Big TV", "Mid shoes", "Cheap lunch"]);
  await page.getByLabel("Sort by").click();
  await page.getByRole("option", { name: "Lowest amount" }).click();
  await expect.poll(order).toEqual(["Cheap lunch", "Mid shoes", "Big TV"]);

  // Filter by category: the count and total of what is shown follow the filter.
  const chips = page.getByRole("group", { name: "Category" });
  await chips.getByRole("button", { name: "Shopping" }).click();
  await expect.poll(order).toEqual(["Mid shoes", "Big TV"]);
  await expect(page.getByText("2 of 3 shown · ₹53,000.00")).toBeVisible();
  await expect(chips.getByRole("button", { name: "Shopping" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Search in names and notes.
  await chips.getByRole("button", { name: "All", exact: true }).click();
  await expect.poll(order).toEqual(["Cheap lunch", "Mid shoes", "Big TV"]); // still lowest first
  const search = page.getByLabel("Search", { exact: true });
  await search.fill("black friday");
  await search.press("Enter");
  await expect.poll(order).toEqual(["Big TV"]);
  // Typing alone searches too, a moment after the last key.
  await search.fill("zzz nothing");
  await expect(page.getByText("No entries match these filters")).toBeVisible();

  // The choices are in the address, so a reload keeps them.
  await page.reload();
  await expect(page.getByText("No entries match these filters")).toBeVisible();
});

test("the chart's bars open a month", async ({ page }) => {
  await page.goto(`/expenses?y=${YEAR}&m=all`);
  await page.getByRole("button", { name: new RegExp(`^March ${YEAR}:`) }).click();
  await expect(page).toHaveURL(/m=3/);
  await expect(periodButton(page)).toContainText(`March ${YEAR}`);
  await expect(page.getByRole("button", { name: new RegExp(`^March ${YEAR}:`) })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("the round button asks what to log, then opens that form", async ({ page }) => {
  await page.goto("/expenses/spending?y=2025&m=7");
  // On expense screens the round button logs a transaction instead of adding a task.
  await expect(page.getByRole("button", { name: /Quick add task/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Log a transaction" }).click();
  const menu = page.getByRole("menu");
  for (const kind of ["Income", "Expense", "EMI or loan", "Investment"]) {
    await expect(menu.getByRole("menuitem", { name: new RegExp(`^${kind}`) })).toBeVisible();
  }
  await menu.getByRole("menuitem", { name: /^Income/ }).click();
  const dialog = page.getByRole("dialog", { name: "Add income" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Amount", { exact: true })).toBeFocused();

  // Logged from the Expenses tab, so the toast offers a way to see it.
  await dialog.getByLabel("Date").fill("2025-07-04");
  await dialog.getByLabel("Income stream").fill("Launcher income");
  await choose(dialog, "Category", "Freelance");
  await dialog.getByLabel("Amount", { exact: true }).fill("1500");
  await dialog.getByRole("button", { name: "Add income" }).click();
  await expect(toast(page)).toContainText("Added");
  await toast(page).getByRole("button", { name: "View" }).click();
  await expect(page).toHaveURL(/\/expenses\/income\?y=2025&m=7/);
  await expect(
    page.getByRole("button", { name: "Edit Launcher income", exact: true }),
  ).toBeVisible();

  // The task quick add is still one key away.
  await page.keyboard.press("q");
  await expect(page.getByRole("dialog", { name: "Add a task" })).toBeVisible();
});

test("the command palette can jump to an expense tab", async ({ page }) => {
  await page.goto("/tasks");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page.keyboard.type("Expense Tracker: Investments");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/expenses\/investments/);
  await expect(page.getByRole("link", { name: "Investments" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("the report cards and Settings download the PDFs", async ({ page }) => {
  await page.goto("/expenses?y=2026&m=11");
  const breakdown = page.getByRole("link", {
    name: /Download the expense breakdown for November 2026/,
  });
  const first = page.waitForEvent("download");
  await breakdown.click();
  expect((await first).suggestedFilename()).toBe("ledge-expense-breakdown-2026-11.pdf");

  const trend = await page.request.get("/api/export/cash-flow?y=2026");
  expect(trend.status()).toBe(200);
  expect(trend.headers()["content-type"]).toBe("application/pdf");
  expect((await trend.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect((await page.request.get("/api/export/expense-breakdown?y=2026&m=13")).status()).toBe(400);

  // Settings: any period, including a year with nothing in it.
  await page.goto("/settings");
  const reports = page.getByRole("region", { name: "Expense Tracker" });
  await reports.getByRole("button", { name: "Annual cash flow" }).click();
  await reports.getByRole("button", { name: "Previous year" }).click();
  const second = page.waitForEvent("download");
  await reports.getByRole("link", { name: /annual cash flow trend for \d{4}/ }).click();
  expect((await second).suggestedFilename()).toMatch(/^ledge-cash-flow-\d{4}\.pdf$/);
});
