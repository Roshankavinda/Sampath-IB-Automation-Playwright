const { test, expect } = require("../../utils/fixtures");
const { FreezeAccountsPage } = require("../../pages/FreezeAccountsPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Freeze Accounts — NEGATIVE / VALIDATION.
 *   N01 the destructive-action warning is shown before anything can be frozen
 *   N02 "Next" is blocked while no account is selected
 *   N03 searching for an unknown account returns no rows
 *
 * !! SAFETY !! No test here ever confirms a freeze.
 */
test.describe("Freeze Accounts - Negative & Validation", () => {
  test("TC_FRZ_N01 - Verify that the freeze warning is displayed", async ({ page, loggedInDashboard }) => {
    const frz = new FreezeAccountsPage(page);
    await frz.open(loggedInDashboard);
    await expect(
      frz.warningText,
      "The screen must warn that freezing prevents further debits before any account is frozen"
    ).toBeVisible();
  });

  test("TC_FRZ_N02 - Verify that Next is blocked while no account is selected", async ({ page, loggedInDashboard }) => {
    const frz = new FreezeAccountsPage(page);
    await frz.open(loggedInDashboard);
    await frz.clearSelection();

    // Nothing selected: Next must be disabled, or must not proceed to a confirmation.
    const enabled = await frz.nextButton.isEnabled().catch(() => false);
    if (!enabled) {
      await expect(frz.nextButton, "Next should be disabled while no account is selected").toBeDisabled();
      return;
    }
    await frz.nextButton.click().catch(() => {});
    await page.waitForTimeout(2500);
    // It must NOT have reached a freeze confirmation / OTP.
    const otp = await page.locator("input.otp-box").first().isVisible().catch(() => false);
    expect(otp, "No freeze confirmation should be reached without selecting an account").toBeFalsy();
    await expect(frz.heading, "The freeze screen should stay open").toBeVisible();
  });

  test("TC_FRZ_N03 - Verify that searching an unknown account returns no rows", async ({ page, loggedInDashboard }) => {
    const frz = new FreezeAccountsPage(page);
    await frz.open(loggedInDashboard);
    await frz.search("zzz999999999");

    const rows = await frz.rows.count().catch(() => 0);
    const emptyShown = await page
      .getByText(/no .*(found|data|records|accounts)/i)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    expect(rows === 0 || emptyShown, "An unknown account search should return no matching rows").toBeTruthy();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
