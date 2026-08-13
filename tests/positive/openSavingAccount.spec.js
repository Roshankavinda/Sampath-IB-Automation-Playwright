const { test } = require("../../utils/fixtures");
const { OpenSavingAccountPage } = require("../../pages/OpenSavingAccountPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Open Saving Account — POSITIVE.
 * Quick Actions > "Open Saving Account" -> /dashboard/open-account, a 4-step self
 * account-opening wizard (step 1 residency -> step 2 product ...).
 *
 * SAFETY: this opens a REAL bank account, so the wizard is only walked far enough to
 * validate its steps - the application is never completed.
 */
test.describe("Open Saving Account - Positive", () => {
  test("TC_OSA_H01 - Verify that the account-opening wizard opens", async ({ page, loggedInDashboard }) => {
    const osa = new OpenSavingAccountPage(page);
    await test.step("Open the wizard from Quick Actions", async () => {
      await osa.open(loggedInDashboard);
    });
    await test.step("Step 1 offers the residency options", async () => {
      await osa.assertStepOneValidations();
    });
  });

  test("TC_OSA_H02 - Verify that the wizard advances to the product step", async ({ page, loggedInDashboard }) => {
    const osa = new OpenSavingAccountPage(page);
    await osa.open(loggedInDashboard);

    await test.step("Choose the residency option and continue", async () => {
      await osa.selectResidencyAndContinue(0);
    });
    await test.step("Step 2 asks for the preferred account product", async () => {
      await osa.assertProductStep();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
