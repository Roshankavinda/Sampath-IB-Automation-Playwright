const { test } = require("../../utils/fixtures");
const { SliplessPage } = require("../../pages/SliplessPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const slipless = require("../../test-data/slipless");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Slipless Cash Deposit to OTHER ACCOUNTS — POSITIVE.
 * The deposit form offers Account Type = "Own Account" (covered by slipless.spec.js) or
 * "Other Accounts" - this covers the other-accounts branch.
 */
test.describe("Slipless Deposit (Other Accounts) - Positive", () => {
  test("TC_SLIP_H03 - Verify that a slipless deposit to another account can be made", async ({
    page,
    loggedInDashboard,
  }) => {
    const sless = new SliplessPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Open Slipless Banking > Cash Deposit", async () => {
      await loggedInDashboard.goToSlipless();
      await sless.assertLoaded();
      await sless.selectCashDeposit();
    });

    await test.step("Choose 'Other Accounts' and fill the deposit", async () => {
      await sless.fillDeposit(slipless.depositOtherAccount);
    });

    await test.step("Submit and validate the OTP/confirmation", async () => {
      await sless.submitDeposit();
      await popup.assertVisible();
    });

    await test.step("Enter the OTP and validate success", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
      await sless.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
