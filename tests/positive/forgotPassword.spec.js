const { test } = require("../../utils/fixtures");
const { ForgotPasswordPage } = require("../../pages/ForgotPasswordPage");
const { forgotPassword } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Forgot Password — POSITIVE.
 * Login page -> "Reset" -> choose "Using Security Questions" -> enter a valid
 * username -> the reset flow accepts it and moves past step 1.
 *
 * NOTE: the spec intentionally stops once the reset request is ACCEPTED and does
 * NOT set a new password, so it never changes the real account credentials.
 */
test.describe("Forgot Password - Positive", () => {
  test("TC_FPWD_H01 - Valid username is accepted by the reset flow", async ({ page, loginPage }) => {
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

    await test.step("Validate the reset request is accepted (moves past the username step)", async () => {
      await fpwd.assertResetAccepted();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
