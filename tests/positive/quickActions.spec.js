const { test, expect } = require("../../utils/fixtures");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Dashboard Quick Actions — POSITIVE (availability).
 * The dashboard offers: Sampath Slipless, Open New Fixed Deposit, Open Saving Account,
 * Apply Web Card, Stop Card, Stop Cheque, Mobile Cash, Obtain New Loan, Freeze Accounts
 * (plus the Send Money and Bill Payment shortcuts).
 *
 * Some tiles are entitlement-driven and render DISABLED for a profile that cannot use them
 * (confirmed live: Stop Cheque and Obtain New Loan are disabled for this account) - that is
 * valid behaviour, so this test records each tile's state rather than demanding it be usable.
 */
const TILES = [
  "Sampath Slipless",
  "Open New Fixed Deposit",
  "Open Saving Account",
  "Apply Web Card",
  "Stop Card",
  "Stop Cheque",
  "Mobile Cash",
  "Obtain New Loan",
  "Freeze Accounts",
];

test.describe("Quick Actions - Positive", () => {
  test("TC_QA_H01 - Verify that all Quick Action tiles are displayed", async ({ page, loggedInDashboard }) => {
    for (const label of TILES) {
      const tile = page.getByRole("button", { name: new RegExp(label.replace(/\s+/g, ".*"), "i") }).first();
      await expect.soft(tile, `The "${label}" quick action should be displayed`).toBeVisible();
    }
  });

  test("TC_QA_H02 - Verify each Quick Action tile's availability", async ({ page, loggedInDashboard }) => {
    for (const label of TILES) {
      const tile = page.getByRole("button", { name: new RegExp(label.replace(/\s+/g, ".*"), "i") }).first();
      const visible = await tile.isVisible().catch(() => false);
      const disabled = visible ? await tile.isDisabled().catch(() => false) : null;
      // eslint-disable-next-line no-console
      console.log(`Quick Action "${label}": visible=${visible} disabled=${disabled}`);
      expect(visible, `"${label}" should be present on the dashboard`).toBeTruthy();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
