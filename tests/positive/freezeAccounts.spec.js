const { test } = require("../../utils/fixtures");
const { FreezeAccountsPage } = require("../../pages/FreezeAccountsPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Freeze Accounts — POSITIVE (view + selection only).
 * Quick Actions > "Freeze Accounts" -> /dashboard/self-debit-freeze: a warning, a searchable
 * table of operative accounts (All | Account Number | Currency | Status | Account Type |
 * Available Balance) with per-row checkboxes, and Next.
 *
 * !! SAFETY !! Freezing BLOCKS ALL FURTHER DEBITS on the real account, which would break
 * every transaction test. These tests therefore NEVER click Next / confirm a freeze - they
 * validate the screen and clear any selection they make.
 */
test.describe("Freeze Accounts - Positive", () => {
  test("TC_FRZ_H01 - Verify that the Freeze Accounts screen is displayed", async ({ page, loggedInDashboard }) => {
    const frz = new FreezeAccountsPage(page);
    await test.step("Open Freeze Accounts from Quick Actions", async () => {
      await frz.open(loggedInDashboard);
    });
    await test.step("The screen shows its columns and controls", async () => {
      await frz.assertTableColumns();
    });
  });

  test("TC_FRZ_H02 - Verify that freezable accounts are listed with their details", async ({
    page,
    loggedInDashboard,
  }) => {
    const frz = new FreezeAccountsPage(page);
    await frz.open(loggedInDashboard);
    await test.step("Accounts are listed with number and balance", async () => {
      await frz.assertAccountsListed();
    });
  });

  test("TC_FRZ_H03 - Verify that an account can be selected for freezing (not confirmed)", async ({
    page,
    loggedInDashboard,
  }) => {
    const frz = new FreezeAccountsPage(page);
    await frz.open(loggedInDashboard);

    try {
      await test.step("Tick an account - the freeze is NEVER confirmed", async () => {
        await frz.selectAccount();
      });
    } finally {
      // Always leave the screen as found - no account stays selected.
      await frz.clearSelection();
    }
  });

  test("TC_FRZ_H04 - Verify that the account list can be searched", async ({ page, loggedInDashboard }) => {
    const frz = new FreezeAccountsPage(page);
    await frz.open(loggedInDashboard);
    await test.step("Search filters the account table", async () => {
      await frz.search("LKR");
      await frz.assertAccountsListed();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
