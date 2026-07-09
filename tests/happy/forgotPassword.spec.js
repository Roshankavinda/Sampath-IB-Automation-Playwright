const { test } = require("../../utils/fixtures");
const { ForgotPasswordPage } = require("../../pages/ForgotPasswordPage");
const { forgotPassword, credentials } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Forgot Password — HAPPY PATH.
 * Login page -> Forgot Password -> enter a valid username -> reset flow is accepted
 * (OTP / new-password step reached).
 *
 * NOTE: the spec intentionally stops once the reset request is ACCEPTED and does
 * NOT set a new password, so it never changes the real account credentials.
 */
test.describe("Forgot Password - Happy Path", () => {
  test("TC_FPWD_H01 - Valid username is accepted by the reset flow", async ({ page, loginPage }) => {
    const fpwd = new ForgotPasswordPage(page);

    await test.step("Open the login page and click 'Forgot Password'", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
      await loginPage.goToForgotPassword();
    });

    await test.step("Validate the Forgot Password page is displayed", async () => {
      await fpwd.assertLoaded();
    });

    await test.step("Enter a valid username and submit the reset request", async () => {
      test.skip(!forgotPassword.username, "Set IB_USERNAME in .env to run the Forgot Password happy path.");
      await fpwd.requestReset({ username: forgotPassword.username, nic: forgotPassword.nic });
    });

    await test.step("Validate the reset request is accepted (OTP / new-password step)", async () => {
      await fpwd.handleOtpIfPresent(credentials.otp);
      await fpwd.assertResetAccepted();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
