const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
const { getToastText, fillOtpBoxes } = require("../utils/helpers");

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

    // OTP step: after the username, the reset flow sends an OTP to the registered mobile.
    // (Same OTP component as the rest of the app.) // VERIFY the verify/continue control.
    this.otpBoxes = page.locator("input.otp-box");
    this.verifyOtpButton = page.getByRole("button", { name: /verify|next step|continue|confirm|submit/i }).first();

    // Security-questions step: ONE question per wizard screen (Step 3 of 5, Step 4 of 5, ...),
    // each with a single answer box (placeholder "Enter here") plus a "Cancel" button and an
    // icon-only forward button that enables once the box is filled. Confirmed from the live DOM.
    this.securityAnswerInput = page.getByPlaceholder("Enter here");
    this.cancelButton = page.getByRole("button", { name: /^cancel$/i });

    // Final step (Step 5 of 5): set the new password. Both fields also use placeholder
    // "Enter here", so they are targeted by their accessible label, not the placeholder.
    this.newPasswordInput = page.getByRole("textbox", { name: /enter new password/i }).first();
    this.confirmPasswordInput = page.getByRole("textbox", { name: /confirm new password/i }).first();
    this.resetSubmitButton = page.getByRole("button", { name: /^submit$/i }).first();
  }

  /** True once the wizard is on the new-password step (its fields also use "Enter here"). */
  async isNewPasswordStep() {
    return this.page
      .getByText(/enter new password|confirm new password|step 5 of 5/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** ASSERTION: the "Password Reset" method-selection screen is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Password Reset' heading should be visible").toBeVisible({ timeout: TIMEOUTS.LOAD });
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
      timeout: TIMEOUTS.LOAD,
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

    await expect(this.nextButton, "'Next' should be enabled on the username step").toBeEnabled({ timeout: TIMEOUTS.UI });
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
    ).toBeVisible({ timeout: TIMEOUTS.UI });
    // ASSERTION: the wizard does not advance.
    await expect(this.usernameInput, "The reset flow should stay on the username step").toBeVisible();
  }

  /** ASSERTION: the reset flow reached the OTP screen (OTP sent to the mobile). */
  async assertOtpStep() {
    await expect(
      this.otpBoxes.first(),
      "The reset flow should reach the OTP screen (a code is sent to your registered mobile/email)"
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  /**
   * Enters the reset OTP and continues.
   *
   * MANUAL BY DEFAULT: a real OTP is sent to the phone during a password reset, so the
   * test pauses (run headed) for you to type it and continue. It resumes once the OTP
   * screen closes. Set IB_MANUAL_OTP=false to auto-fill the bypass code instead.
   */
  async enterOtpManually(otp) {
    if (process.env.IB_MANUAL_OTP !== "false") {
      const timeout = TIMEOUTS.MANUAL_OTP;
      // eslint-disable-next-line no-console
      console.log(
        `\n>>> MANUAL RESET OTP: enter the OTP sent to your phone/email and continue in the browser ` +
          `(waiting up to ${Math.round(timeout / 1000)}s)...\n`
      );
      const done = await this.otpBoxes
        .first()
        .waitFor({ state: "hidden", timeout })
        .then(() => true)
        .catch(() => false);
      if (!done) {
        throw new Error(
          `Timed out after ${Math.round(timeout / 1000)}s waiting for the password-reset OTP to be entered manually. ` +
            "Run headed so the browser is visible, and raise IB_MANUAL_OTP_TIMEOUT if needed."
        );
      }
      return;
    }

    // Unattended: fill the bypass code and continue.
    await fillOtpBoxes(this.page, otp);
    if (await this.verifyOtpButton.isVisible().catch(() => false)) await this.verifyOtpButton.click();
    await this.otpBoxes.first().waitFor({ state: "hidden", timeout: TIMEOUTS.UI }).catch(() => {});
  }

  /**
   * ASSERTION: the reset flow advanced PAST the OTP (to the security-questions or
   * new-password step). // VERIFY the exact post-OTP screen wording against the live app.
   */
  async assertProgressedPastOtp() {
    await expect(
      this.page.getByText(/security question|answer|new password|set.*password|confirm password/i).first(),
      "The reset flow should advance past the OTP to the security-questions / new-password step"
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  /** ASSERTION: the security-questions step is displayed (after the OTP). */
  async assertSecurityQuestionsStep() {
    // The step renders a single answer box ("Enter here") for the current question.
    await expect(
      await this.visibleAnswerInput(),
      "The security-questions step (with an 'Enter here' answer box) should be shown after the OTP"
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  /** Returns the currently VISIBLE answer box (the wizard pre-renders hidden copies). */
  async visibleAnswerInput() {
    const count = await this.securityAnswerInput.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const box = this.securityAnswerInput.nth(i);
      if (await box.isVisible().catch(() => false)) return box;
    }
    return this.securityAnswerInput.first();
  }

  /** True if a question containing `keyword` is currently visible on screen. */
  async isQuestionOnScreen(keyword) {
    const matches = this.page.getByText(new RegExp(keyword, "i"));
    const count = await matches.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      if (await matches.nth(i).isVisible().catch(() => false)) return true;
    }
    return false;
  }

  /** Reads the visible question prompt text (best effort, for error messages). */
  async visibleQuestionText() {
    const prompts = this.page.getByText(/what is your|which|name|favou?rite|security question/i);
    const count = await prompts.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const p = prompts.nth(i);
      if (await p.isVisible().catch(() => false)) return ((await p.textContent()) || "").trim();
    }
    return "(unknown question)";
  }

  /** Clicks the wizard's forward button (icon-only on this step; enables once the box is filled). */
  async clickWizardNext() {
    // Prefer a text/aria-labelled forward button when present.
    const labelled = this.page.getByRole("button", { name: /next step|^next$|continue|submit|verify|confirm/i });
    if (await labelled.first().isVisible().catch(() => false)) {
      await expect(
        labelled.first(),
        "The wizard's Next button should enable after entering the answer"
      ).toBeEnabled({ timeout: TIMEOUTS.UI });
      await labelled.first().click();
      return;
    }
    // Icon-only Next: the last form button that is not Cancel/Back.
    const next = this.page.getByRole("button").filter({ hasNotText: /cancel|back|logo/i }).last();
    await expect(next, "The wizard's Next button should enable after entering the answer").toBeEnabled({
      timeout: TIMEOUTS.UI,
    });
    await next.click();
  }

  /** Polls until the question containing `keyword` is no longer on screen (wizard advanced). */
  async waitUntilQuestionGone(keyword, timeout = 15_000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (!(await this.isQuestionOnScreen(keyword))) return;
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Answers the security questions. They are asked ONE PER WIZARD SCREEN (e.g. Step 3 of 5
   * "mother", Step 4 of 5 "pet"), so this walks the wizard screen by screen: it reads the
   * question currently on screen, fills the single visible answer box with the matching
   * configured answer, clicks Next, and continues until no answer box remains.
   *
   * @param {{ question: string, answer: string }[]} answers
   */
  async answerSecurityQuestions(answers) {
    const used = new Set();
    const maxScreens = answers.length + 3; // safety guard against an unexpected loop

    for (let screen = 0; screen < maxScreens; screen++) {
      // Stop once the wizard reaches the new-password step - its fields also carry the
      // "Enter here" placeholder, so they must NOT be treated as a security answer.
      if (await this.isNewPasswordStep()) return;

      const input = await this.visibleAnswerInput();
      if (!(await input.isVisible().catch(() => false))) break; // no more security questions

      // Match the question currently on screen to a configured (still-unused) answer.
      let picked = null;
      for (let i = 0; i < answers.length; i++) {
        if (used.has(i)) continue;
        if (await this.isQuestionOnScreen(answers[i].question)) {
          picked = i;
          break;
        }
      }
      if (picked === null) {
        if (await this.isNewPasswordStep()) return; // reached the final step - done
        const qText = await this.visibleQuestionText();
        throw new Error(
          `Reached a security question with no configured answer: "${qText}". ` +
            "Add it to securityAnswers in test-data/forgotPassword.json."
        );
      }

      const { question, answer } = answers[picked];
      await input.fill(answer);
      await expect(input, `The answer for the "${question}" question should be entered`).toHaveValue(answer);
      used.add(picked);

      await this.clickWizardNext();
      await this.waitUntilQuestionGone(question);
    }
  }

  /**
   * ASSERTION: the flow reached the new-password step (do NOT set a new password - that
   * would change the real account credentials). This is the safe stopping point.
   */
  async assertReachedNewPasswordStep() {
    const byWording = this.page
      .getByText(/new password|set.*password|create.*password|confirm.*password|re-?enter.*password|password policy/i)
      .first();
    const passwordField = this.page.locator('input[type="password"]').first();

    const reached = await Promise.race([
      byWording.waitFor({ state: "visible", timeout: TIMEOUTS.LOAD }).then(() => true).catch(() => false),
      passwordField.waitFor({ state: "visible", timeout: TIMEOUTS.LOAD }).then(() => true).catch(() => false),
    ]);
    if (!reached) {
      throw new Error(
        "The reset flow did not reach the new-password step after answering the security questions. " +
          "// VERIFY the new-password screen wording/fields against the live app."
      );
    }
  }

  /** Step 5: enter the new password into both the "New Password" and "Confirm" fields. */
  async enterNewPassword(password) {
    await expect(this.newPasswordInput, "The 'Enter New Password' field should be shown on the final step").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await this.newPasswordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await expect(this.newPasswordInput, "New password should hold the entered value").toHaveValue(password);
    await expect(this.confirmPasswordInput, "Confirm password should match").toHaveValue(password);
  }

  /** ASSERTION: with both password fields matching, the reset is ready to submit. */
  async assertReadyToSubmit() {
    await expect(
      this.resetSubmitButton,
      "Submit should be enabled once the new password and its confirmation match"
    ).toBeEnabled({ timeout: TIMEOUTS.UI });
  }

  /**
   * Submits the new password to COMPLETE the reset.
   *
   * WARNING: this changes the real account password. It only runs when the spec opts in
   * (IB_COMPLETE_RESET=true) AND is called with the CURRENT password, so the login is not
   * actually altered and the rest of the suite keeps working.
   */
  async submitNewPassword() {
    await this.assertReadyToSubmit();
    await this.resetSubmitButton.click();
  }

  /** ASSERTION: the reset completed (a success message or a return to the login screen). */
  async assertResetComplete() {
    const ok = await Promise.race([
      this.page
        .getByText(/success|password.*(reset|changed|updated)|successfully|login/i)
        .first()
        .waitFor({ state: "visible", timeout: TIMEOUTS.LOAD })
        .then(() => true)
        .catch(() => false),
      this.usernameInput.waitFor({ state: "visible", timeout: TIMEOUTS.LOAD }).then(() => true).catch(() => false),
    ]);
    if (!ok) {
      throw new Error(
        "The password reset did not confirm completion after Submit (no success message and did not return to login). " +
          "// VERIFY the reset success screen. Note: the app may reject a new password equal to the current one."
      );
    }
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

  /**
   * ASSERTION: an unknown/invalid username is rejected by the reset flow.
   *
   * The reset backend keeps the flow on step 1 for a non-existent user and flashes a
   * transient alert/toast (its exact wording is inconsistent and short-lived). So the
   * reliable contract for this negative case is behavioural: an unknown username must NOT
   * advance the wizard to the OTP step. An explicit message, if caught, is a bonus.
   */
  async assertRejected() {
    const messageRe =
      /invalid|not found|does not exist|doesn'?t exist|incorrect|no (?:such )?user|unknown|not registered|not recogni[sz]ed|please enter valid username/i;

    // 1) An explicit inline rejection message.
    const inlineShown = await this.page
      .getByText(messageRe)
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (inlineShown) return;

    // 2) A rejection surfaced through the alert/toast region.
    const alertText = (await this.page.getByRole("alert").first().textContent().catch(() => "")) || "";
    if (messageRe.test(alertText)) return;
    const toast = await getToastText(this.page, 3_000);
    if (messageRe.test(toast)) return;

    // 3) The "Session TimeOut" backend wall keeps the flow on step 1 too - report it plainly.
    await this.throwIfSessionTimedOut();

    // 4) Behavioural signal: the reset must not have progressed. If the flow is still on the
    //    username step and never reached the OTP screen, the unknown username was blocked.
    const reachedOtp = await this.otpBoxes.first().isVisible().catch(() => false);
    if (reachedOtp) {
      throw new Error(
        "The unknown username was NOT rejected - the reset flow advanced to the OTP step for a non-existent user."
      );
    }
    const stillOnUsernameStep = await this.usernameInput.isVisible().catch(() => false);
    if (stillOnUsernameStep) return; // blocked on step 1 == rejected

    throw new Error(
      "No rejection message was shown for the unknown username, and the reset flow's state is indeterminate " +
        "(neither on the username step nor at the OTP step)."
    );
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
