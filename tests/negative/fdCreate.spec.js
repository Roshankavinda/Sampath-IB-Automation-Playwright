const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { FixedDepositPage } = require("../../pages/FixedDepositPage");
const fixedDeposit = require("../../test-data/fixedDeposit");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: FD Create — NEGATIVE / VALIDATION.
 *   N01 entering an amount with no tenure selected is blocked
 *   N02 step 1 does not advance until a resident type is chosen
 */
test.describe("FD Create - Negative & Validation", () => {
  test("TC_FD_N02 - Verify that Step 1 requires a resident type before continuing", async ({ page, loggedInDashboard }) => {
    const fd = new FixedDepositPage(page);

    await test.step("Open the FD wizard (resident-type step)", async () => {
      await loggedInDashboard.goToOpenFixedDeposit();
      await fd.assertLoaded();
    });

    await test.step("Without choosing a resident type, the wizard must not reach step 2", async () => {
      // If a resident type is not preselected, Continue must be disabled; if it advances,
      // it must NOT have skipped to the details step without a choice.
      const continueEnabled = await fd.continueButton.first().isEnabled().catch(() => false);
      if (!continueEnabled) {
        await expect(
          fd.continueButton.first(),
          "Continue should be disabled until a resident type is chosen"
        ).toBeDisabled();
        return;
      }
      await fd.continueButton.first().click().catch(() => {});
      await page.waitForTimeout(2000);
      const nicknameShown = await fd.nicknameInput.isVisible().catch(() => false);
      expect(nicknameShown, "The FD details step should not open until a resident type is chosen").toBeFalsy();
    });
  });

  test("TC_FD_N01 - Verify that Amount without a tenure is blocked", async ({ page, loggedInDashboard }) => {
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
      ).toBeVisible({ timeout: TIMEOUTS.ACTION });
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
