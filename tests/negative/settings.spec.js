const { test, expect } = require("../../utils/fixtures");
const { SettingsPage } = require("../../pages/SettingsPage");
const { credentials } = require("../../test-data/accounts");
const settings = require("../../test-data/settings");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Vishwa Account Settings — NEGATIVE / VALIDATION.
 *   N01 exactly one language is selected at a time (English by default)
 *   N02 both Settings tabs are offered
 *   N03 change password: a mismatched confirmation is rejected
 *   N04 change password: an empty form is rejected
 *
 * SAFETY: the change-password cases are only ever submitted with INVALID data, so the real
 * password can never be changed by them.
 */
test.describe("Account Settings - Negative & Validation", () => {
  async function openSettings(page) {
    const s = new SettingsPage(page);
    await s.open();
    await s.handleOtpIfPresent(credentials.otp);
    return s;
  }

  test("TC_SET_N01 - Verify that exactly one language is selected at a time", async ({ page, loggedInDashboard }) => {
    const s = await openSettings(page);
    await s.assertLanguageOptions();

    const checked = [
      await s.englishRadio.isChecked().catch(() => false),
      await s.sinhalaRadio.isChecked().catch(() => false),
      await s.tamilRadio.isChecked().catch(() => false),
    ].filter(Boolean).length;
    expect(checked, "Exactly one language option must be selected").toBe(1);
  });

  test("TC_SET_N02 - Verify that both Settings tabs are offered", async ({ page, loggedInDashboard }) => {
    const s = await openSettings(page);
    await expect(s.myProfileTab, "The 'My Profile' tab should be offered").toBeVisible();
    await expect(s.securityTab, "The 'Security' tab should be offered").toBeVisible();
  });

  test("TC_SET_N03 - Verify that a mismatched password confirmation is rejected", async ({
    page,
    loggedInDashboard,
  }) => {
    const s = await openSettings(page);
    await s.openSecurityTab();
    await s.assertChangePasswordForm();

    // New password and its confirmation deliberately differ - the app must block it.
    await s.fillChangePassword({
      currentPassword: credentials.password,
      newPassword: credentials.password,
      confirmPassword: settings.changePassword.mismatchedConfirm,
    });

    if (await s.changePasswordSubmit.isEnabled().catch(() => false)) {
      await s.changePasswordSubmit.click();
      await assertValidationError(page, "match|same|do not|mismatch|confirm");
    } else {
      await expect(
        s.changePasswordSubmit,
        "Submit should stay disabled while the password confirmation does not match"
      ).toBeDisabled();
    }
  });

  test("TC_SET_N04 - Verify that an empty change-password form is rejected", async ({ page, loggedInDashboard }) => {
    const s = await openSettings(page);
    await s.openSecurityTab();
    await s.assertChangePasswordForm();

    if (await s.changePasswordSubmit.isEnabled().catch(() => false)) {
      await s.changePasswordSubmit.click();
      await assertValidationError(page, "required|enter|invalid|password");
    } else {
      await expect(s.changePasswordSubmit, "Submit should stay disabled for an empty form").toBeDisabled();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
