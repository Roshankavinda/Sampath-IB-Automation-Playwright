const { test } = require("../../utils/fixtures");
const { ForgotPasswordPage } = require("../../pages/ForgotPasswordPage");
const { credentials } = require("../../test-data/accounts");
const forgotPassword = require("../../test-data/forgotPassword");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Forgot Password — POSITIVE.
 * Login page -> "Reset" -> "Using Security Questions" -> username -> reset OTP ->
 * answer the security questions -> new-password step.
 *
 * The reset OTP is a real code sent to your mobile, so it is entered MANUALLY by default
 * (run headed - the test pauses at the OTP screen). Set IB_MANUAL_OTP=false to auto-fill
 * the bypass code.
 *
 * SAFETY: this spec stops once the flow reaches the NEW-PASSWORD step. It intentionally
 * does NOT set a new password, so it never changes the real account credentials.
 */
test.describe("Forgot Password - Positive", () => {
  test("TC_FPWD_H01 - Valid username + OTP is accepted by the reset flow", async ({ page, loginPage }) => {
    const fpwd = new ForgotPasswordPage(page);

    await test.step("Open the login page and click the 'Reset' (Forgot Password) link", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
      await loginPage.goToForgotPassword();
    });

    await test.step("Validate the Password Reset method screen is displayed", async () => {
      await fpwd.assertLoaded();
    });

    await test.step("Choose the 'Using Security Questions' reset method", async () => {
      await fpwd.selectSecurityQuestionsMethod();
    });

    await test.step("Enter a valid username and submit the reset request", async () => {
      test.skip(!forgotPassword.username, "Set IB_USERNAME in .env to run the Forgot Password positive path.");
      await fpwd.requestReset({ username: forgotPassword.username });
    });

    await test.step("The OTP screen appears (a code is sent to your mobile)", async () => {
      await fpwd.assertOtpStep();
    });

    await test.step("Enter the reset OTP from your mobile (manual) and continue", async () => {
      await fpwd.enterOtpManually(forgotPassword.otp || credentials.otp);
    });

    await test.step("Answer the security questions (Mother's name / Pet's name)", async () => {
      await fpwd.assertSecurityQuestionsStep();
      await fpwd.answerSecurityQuestions(forgotPassword.securityAnswers);
    });

    await test.step("Validate the flow reached the new-password step (does NOT set a new password)", async () => {
      await fpwd.assertReachedNewPasswordStep();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
