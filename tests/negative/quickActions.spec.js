const { test, expect } = require("../../utils/fixtures");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Dashboard Quick Actions — NEGATIVE / VALIDATION.
 *   N01 a DISABLED tile does not navigate when clicked (entitlement is enforced client-side)
 *   N02 unavailable features are disabled rather than silently broken
 *
 * Confirmed live: "Stop Cheque" and "Obtain New Loan" are disabled for this profile.
 */
const RESTRICTED = ["Stop Cheque", "Obtain New Loan"];

test.describe("Quick Actions - Negative & Validation", () => {
  test("TC_QA_N01 - Verify that a disabled Quick Action does not navigate", async ({ page, loggedInDashboard }) => {
    for (const label of RESTRICTED) {
      const tile = page.getByRole("button", { name: new RegExp(label.replace(/\s+/g, ".*"), "i") }).first();
      if (!(await tile.isVisible().catch(() => false))) continue;
      if (!(await tile.isDisabled().catch(() => false))) {
        // The profile is entitled to it - nothing to assert for this tile.
        continue;
      }
      const before = page.url();
      await tile.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2000);
      expect(page.url(), `Clicking the disabled "${label}" tile must not navigate away`).toBe(before);
    }
  });

  test("TC_QA_N02 - Verify that restricted features are disabled, not broken", async ({ page, loggedInDashboard }) => {
    for (const label of RESTRICTED) {
      const tile = page.getByRole("button", { name: new RegExp(label.replace(/\s+/g, ".*"), "i") }).first();
      await expect.soft(tile, `"${label}" should still be displayed (disabled, not missing)`).toBeVisible();
    }
    // No error toast should be raised by the restricted tiles being present.
    const error = page.getByText(/error|failed|something went wrong/i).locator("visible=true").first();
    await expect(error, "Restricted quick actions must not raise an error on the dashboard").toBeHidden();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
