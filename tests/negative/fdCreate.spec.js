const { test, expect } = require("../../utils/fixtures");
const { FixedDepositPage } = require("../../pages/FixedDepositPage");
const { fixedDeposit } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: FD Create — NEGATIVE / VALIDATION.
 * The app requires a tenure BEFORE the amount: entering an amount with no tenure selected
 * raises "Please select a tenure type before entering the amount." and blocks the wizard.
 */
test.describe("FD Create - Negative & Validation", () => {
  test("TC_FD_N01 - Amount without a tenure is blocked", async ({ page, loggedInDashboard }) => {
    const fd = new FixedDepositPage(page);

    await test.step("Open the FD wizard and pass the resident-type step", async () => {
      await loggedInDashboard.goToOpenFixedDeposit();
      await fd.assertLoaded();
      await fd.selectResidentType(fixedDeposit.residentType);
      await fd.assertDetailsStepLoaded();
    });

    await test.step("Enter an amount WITHOUT selecting a tenure", async () => {
      await fd.amountInput.fill(fixedDeposit.amount);
      await page.waitForTimeout(1500);
    });

    await test.step("Validate the tenure requirement is raised", async () => {
      await expect(
        fd.tenureError,
        "'Please select a tenure type before entering the amount.' should be shown"
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step("Validate the wizard does not advance past the details step", async () => {
      await fd.continueButton.click().catch(() => {});
      await page.waitForTimeout(3000);
      const step = (await page.locator("body").innerText()).match(/Step\s*(\d)\s*of\s*4/i)?.[1];
      expect(step, "The FD wizard should stay on step 2 while the tenure is missing").toBe("2");
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
