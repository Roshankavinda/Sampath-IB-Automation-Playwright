const { expect } = require("@playwright/test");
const { getToastText } = require("../utils/helpers");

/**
 * Password Reset flow, reached from the login screen's "Reset" link
 * (/SVRClientWebV4/forgot-password). Confirmed against the live app:
 *
 *  1. "Password Reset" method screen - no username field here, just three choices:
 *       - "I can reset it my self / Using My Debit Card"
 *       - "I can reset it my self / Using Security Questions"   <- the method we use
 *       - "I need bank's help / Forgot Security Questions"
 *  2. Choosing a method reveals a 5-step wizard. Step 1 of 5 is
 *     "Enter details to reset your password" -> input[name="username"] -> "Next".
 *
 * The wizard buttons carry aria-labels that override their text, so they must be
 * matched on the aria-label ("Next step" / "Go back"), not on "Next" / "Back".
 */
class ForgotPasswordPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Step 0: method selection.
    this.heading = page.getByText("Password Reset", { exact: true }).first();
    this.methodPrompt = page.getByText(/Select your Self Password Reset method/i);
    this.debitCardMethod = page.getByRole("button", { name: /Using My Debit Card/i });
    this.securityQuestionsMethod = page.getByRole("button", { name: /Using Security Questions/i });
    this.bankHelpMethod = page.getByRole("button", { name: /Forgot Security Questions/i });

    // Step 1: username.
    this.stepIndicator = page.getByText(/Step \d of \d/i);
    this.usernameInput = page.locator('input[name="username"]');
    this.nextButton = page.getByRole("button", { name: "Next step" });
    this.backButton = page.getByRole("button", { name: "Go back" });

    // Inline validation shown when the username is empty/invalid.
    this.validationError = page.getByText(/please enter valid username/i).first();
  }

  /** ASSERTION: the "Password Reset" method-selection screen is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Password Reset' heading should be visible").toBeVisible({ timeout: 30_000 });
    await expect(this.methodPrompt, "The reset-method prompt should be visible").toBeVisible();
    await expect(this.securityQuestionsMethod, "'Using Security Questions' method should be offered").toBeVisible();
    await expect(this.debitCardMethod, "'Using My Debit Card' method should be offered").toBeVisible();
  }

  /**
   * Picks the "Using Security Questions" reset method and lands on step 1 (username).
   *
   * The method buttons render before React attaches their click handlers, so an
   * immediate click is silently swallowed. Retry until the username step appears.
   */
  async selectSecurityQuestionsMethod() {
    await expect(this.securityQuestionsMethod, "'Using Security Questions' should be visible").toBeVisible({
      timeout: 30_000,
    });

    let opened = false;
    for (let attempt = 0; attempt < 10 && !opened; attempt++) {
      await this.securityQuestionsMethod.click().catch(() => {});
      opened = await this.usernameInput
        .waitFor({ state: "visible", timeout: 3_000 })
        .then(() => true)
        .catch(() => false);
    }
    if (!opened) throw new Error("The 'Using Security Questions' reset step never opened its username form.");

    // ASSERTION: we are on step 1 of the reset wizard.
    await expect(this.stepIndicator, "The reset wizard step indicator should be visible").toBeVisible();
    await expect(this.usernameInput, "Reset step 1: username field should be visible").toBeVisible();
  }

  /** Enters the username and clicks Next. */
  async requestReset({ username } = {}) {
    await this.usernameInput.click();
    await this.usernameInput.fill(username);
    // ASSERTION: username was entered.
    await expect(this.usernameInput, "Username should hold the entered value").toHaveValue(new RegExp(username));

    await expect(this.nextButton, "'Next' should be enabled on the username step").toBeEnabled({ timeout: 15_000 });
    await this.nextButton.click();
  }

  /** Clicks Next without entering anything, to exercise the empty-username validation. */
  async submitEmptyUsername() {
    await expect(this.usernameInput, "Username field should start empty").toHaveValue("");
    await this.nextButton.click();
  }

  /** ASSERTION: the app blocks an empty username with an inline message. */
  async assertEmptyUsernameRejected() {
    await expect(
      this.validationError,
      "An inline 'Please enter valid username' message should be shown for an empty username"
    ).toBeVisible({ timeout: 15_000 });
    // ASSERTION: the wizard does not advance.
    await expect(this.usernameInput, "The reset flow should stay on the username step").toBeVisible();
  }

  /** ASSERTION: the reset request progressed past the username step. */
  async assertResetAccepted() {
    const progressed = await this.page
      .getByText(/security question|otp|verification code|new password|step 2/i)
      .first()
      .waitFor({ state: "visible", timeout: 25_000 })
      .then(() => true)
      .catch(() => false);
    if (progressed) return;

    await this.throwIfSessionTimedOut();
    throw new Error("The reset request did not progress past the username step, and no error was shown.");
  }

  /** ASSERTION: an unknown/invalid username is rejected by the reset flow. */
  async assertRejected() {
    const rejected = await this.page
      .getByText(/invalid|not found|does not exist|incorrect|no user|please enter valid username/i)
      .first()
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (rejected) return;

    await this.throwIfSessionTimedOut();
    throw new Error("No rejection message was shown for the unknown username.");
  }

  /**
   * The reset backend answers both a valid and an unknown username with "Session TimeOut",
   * so neither server-side outcome can be observed in this environment. Report that
   * plainly instead of as a vague locator timeout.
   */
  async throwIfSessionTimedOut() {
    const toast = await getToastText(this.page, 3_000);
    if (/session\s*time\s*out|session expired|timed out/i.test(toast)) {
      throw new Error(
        `The password-reset service returned "${toast.trim()}" instead of processing the username, so the app stays ` +
          'on step 1 and never reaches the security-question step. This is an environment/backend issue (the same ' +
          '"Session TimeOut" that blocks transactions), not a locator problem.'
      );
    }
  }
}

module.exports = { ForgotPasswordPage };
