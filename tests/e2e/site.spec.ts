import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** The public page (src/app/(site)/welcome): what a signed-out visitor sees at /. */
test.use({ storageState: { cookies: [], origins: [] } });

test("signed-out visitors see the public page at /", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One calm place to run your day.",
  );

  // The hero phone switches screens from its own tab bar.
  await page.getByRole("tab", { name: "Expenses" }).click();
  await expect(page.getByRole("tab", { name: "Expenses" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByAltText(/monthly expense summary/)).toContainClass("on");

  // The Type demo uses the app's quick-add parser; a chip can be removed.
  await page.getByRole("tab", { name: "Type" }).click();
  await expect(page.getByText("Priority: High")).toBeVisible();
  await page.getByRole("button", { name: "Remove Priority: High" }).click();
  await expect(page.getByText("Priority: High")).toHaveCount(0);

  // Log in goes to the real sign-in page.
  await page.getByRole("link", { name: "Log in" }).first().click();
  await expect(page).toHaveURL(/\/sign-in/);
});

for (const scheme of ["light", "dark"] as const) {
  test(`the public page is light and accessible on a ${scheme} device`, async ({ page }) => {
    // Reduced motion stops the hero and voice loops, so axe sees a still page.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto("/welcome");
    await page.waitForLoadState("networkidle");
    // The site is light only, whatever the device or app theme says.
    await expect(page.locator(".lg")).toHaveCSS("background-color", "rgb(238, 240, 236)");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const report = violations.map(
      (v) =>
        `${v.id}: ${v.help}\n    ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join("\n    ")}`,
    );
    expect(report, report.join("\n")).toEqual([]);
  });
}

test("sign-in and sign-up point first-time visitors to the public page", async ({ page }) => {
  for (const path of ["/sign-in", "/sign-up"]) {
    await page.goto(path);
    await page.getByRole("link", { name: "See what it does" }).click();
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "One calm place to run your day.",
    );
  }
});
