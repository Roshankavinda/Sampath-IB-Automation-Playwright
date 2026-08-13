const { test } = require("../../utils/fixtures");
const { SettingsPage } = require("../../pages/SettingsPage");
const { credentials } = require("../../test-data/accounts");
const settings = require("../../test-data/settings");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Vishwa Account Settings — POSITIVE.
 * Profile (avatar) menu -> Settings -> OTP if prompted -> My Profile (change language,
 * set primary account) and Security (change password, OTP verification mode, terms).
 *
 * SAFETY - these settings affect the whole suite, so the apply steps are gated:
 *   - Language: selected, asserted, then ALWAYS restored to English (every selector in the
 *     suite is English text, so leaving Sinhala/Tamil set would break everything).
 *   - Primary account: only applied with IB_APPLY_SETTINGS=true.
 *   - Change password: never submitted (that would break login) - the form is only verified.
 */
test.describe("Account Settings - Positive", () => {
  test("TC_SET_H01 - Verify that Settings opens from the profile menu", async ({ page, loggedInDashboard }) => {
    const s = new SettingsPage(page);
    await test.step("Open the profile menu and select Settings", async () => {
      await s.open();
    });
    await test.step("Enter the OTP if the app requests one", async () => {
      await s.handleOtpIfPresent(credentials.otp);
    });
  });

  test("TC_SET_H02 - Verify that the language can be changed", async ({ page, loggedInDashboard }) => {
    const s = new SettingsPage(page);
    await s.open();
    await s.handleOtpIfPresent(credentials.otp);

    await test.step("All three language options are offered, English by default", async () => {
      await s.assertLanguageOptions();
    });

    try {
      await test.step(`Select "${settings.language}"`, async () => {
        await s.selectLanguage(settings.language);
      });
    } finally {
      // ALWAYS restore English - the rest of the suite relies on English labels.
      await test.step("Restore English so the suite keeps working", async () => {
        await s.restoreEnglish();
      });
    }
  });

  test("TC_SET_H03 - Verify that a primary account can be selected", async ({ page, loggedInDashboard }) => {
    const s = new SettingsPage(page);
    await s.open();
    await s.handleOtpIfPresent(credentials.otp);

    await test.step("The primary-account section offers a 'Set as Primary' action", async () => {
      await s.assertPrimaryAccountSection();
    });

    // Applying changes which account is primary for the whole profile - opt in explicitly.
    test.skip(
      process.env.IB_APPLY_SETTINGS !== "true",
      "Set IB_APPLY_SETTINGS=true to actually change the primary account (it alters the profile)."
    );
    await test.step(`Set "${settings.primaryAccount}" as the primary account`, async () => {
      await s.setPrimaryAccount(settings.primaryAccount);
      await s.handleOtpIfPresent(credentials.otp);
    });
  });

  test("TC_SET_H04 - Verify that the Security tab offers the change-password form", async ({
    page,
    loggedInDashboard,
  }) => {
    const s = new SettingsPage(page);
    await s.open();
    await s.handleOtpIfPresent(credentials.otp);
    await s.openSecurityTab();

    // The form is only VERIFIED - never submitted, as that would change the real password
    // and break every other test's login.
    await test.step("The Change Password form is displayed", async () => {
      await s.assertChangePasswordForm();
    });
  });

  test("TC_SET_H05 - Verify that the OTP verification mode setting is offered", async ({ page, loggedInDashboard }) => {
    const s = new SettingsPage(page);
    await s.open();
    await s.handleOtpIfPresent(credentials.otp);
    await s.openSecurityTab();

    await test.step("An OTP verification-mode setting is shown", async () => {
      await s.assertOtpModeSection();
    });
  });

  test("TC_SET_H06 - Verify that Terms and Conditions can be viewed", async ({ page, loggedInDashboard }) => {
    const s = new SettingsPage(page);
    await s.open();
    await s.handleOtpIfPresent(credentials.otp);
    await s.openSecurityTab();

    await test.step("Open the Terms & Conditions view", async () => {
      await s.viewTermsAndConditions();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
