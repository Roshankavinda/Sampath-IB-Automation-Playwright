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
 * The final step enters a New Password + Confirm and SUBMITS to complete the reset.
 *
 * SAFETY: the new password is the CURRENT password (credentials.password from accounts.json),
 * so completing the reset does NOT change the login and the rest of the suite keeps working.
 * Set IB_SKIP_RESET_SUBMIT=true to only fill-and-stop (never click Submit) if you prefer.
 */
test.describe("Forgot Password - Positive", () => {
  test("TC_FPWD_H01 - Verify that Valid username + OTP is accepted by the reset flow", async ({ page, loginPage }) => {
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

    await test.step("Validate the flow reached the new-password step", async () => {
      await fpwd.assertReachedNewPasswordStep();
    });

    await test.step("Enter the New Password and Confirm New Password", async () => {
      // Use the SAME (current) password from accounts.json, so completing the reset would not
      // actually change the login. Single source of truth - it can never drift from the real one.
      await fpwd.enterNewPassword(credentials.password);
      await fpwd.assertReadyToSubmit();
    });

    // Submit to COMPLETE the reset so you can see it finish. This is safe because the new
    // password is the CURRENT one (login is unchanged). Opt OUT with IB_SKIP_RESET_SUBMIT=true
    // to only fill-and-stop without submitting.
    if (process.env.IB_SKIP_RESET_SUBMIT !== "true") {
      await test.step("Submit the new password and validate the reset completes", async () => {
        await fpwd.submitNewPassword();
        await fpwd.assertResetComplete();
      });
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
