const { test, expect } = require("../../utils/fixtures");
const { OpenSavingAccountPage } = require("../../pages/OpenSavingAccountPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Open Saving Account — NEGATIVE / VALIDATION.
 *   N01 the wizard starts on step 1 (it cannot be entered mid-way)
 *   N02 the wizard does not advance past step 1 without a residency choice
 */
test.describe("Open Saving Account - Negative & Validation", () => {
  test("TC_OSA_N01 - Verify that the wizard starts at step 1 of 4", async ({ page, loggedInDashboard }) => {
    const osa = new OpenSavingAccountPage(page);
    await osa.open(loggedInDashboard);
    const step = await osa.currentStep();
    expect(step, "The account-opening wizard must start on step 1").toBe("1");
  });

  test("TC_OSA_N02 - Verify that step 1 requires a residency answer", async ({ page, loggedInDashboard }) => {
    const osa = new OpenSavingAccountPage(page);
    await osa.open(loggedInDashboard);

    // Without choosing residency, Continue must be blocked - or must not advance the wizard.
    const enabled = await osa.continueButton.isEnabled().catch(() => false);
    if (!enabled) {
      await expect(osa.continueButton, "Continue should be disabled until residency is chosen").toBeDisabled();
      return;
    }
    await osa.continueButton.click().catch(() => {});
    await page.waitForTimeout(2500);
    const step = await osa.currentStep();
    expect(step, "The wizard must not advance past step 1 without a residency answer").toBe("1");
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
