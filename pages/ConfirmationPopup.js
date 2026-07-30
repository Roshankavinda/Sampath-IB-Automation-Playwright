const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
const { fillOtpBoxes, getToastText } = require("../utils/helpers");

/**
 * Transaction confirmation + OTP popup (PaymentConfirmation.tsx).
 * Shows the transaction details and 6 x input.otp-box, then a confirm button.
 */
class ConfirmationPopup {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.otpBoxes = page.locator("input.otp-box");
    this.confirmButton = page.getByRole("button", { name: /confirm|submit|proceed|verify/i }).last();
  }

  /**
   * ASSERTION: the OTP/confirmation ("Transfer Confirmation") popup appeared after Submit.
   *
   * The popup is a single review + OTP dialog: it shows the transaction details and the
   * six OTP boxes together (no extra "Proceed" click needed). We poll for those OTP boxes
   * and, if they don't come, distinguish the two known failure modes so the message is
   * actionable rather than a vague timeout:
   *   - a hard backend error toast ("Session TimeOut" / "failed" / "internal server error"), or
   *   - a silent bounce back to the Dashboard home (the app intermittently drops the session).
   * (An unrelated "Error loading data" widget can flash on the page, so that text is
   * deliberately NOT treated as a transaction failure.)
   */
  async assertVisible() {
    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
      if (await this.otpBoxes.first().isVisible().catch(() => false)) return;

      const hardError = await this.hardErrorToast();
      if (hardError) {
        throw new Error(
          `Transaction was not accepted: the app returned "${hardError}" on Submit. ` +
            "This is an environment/backend issue (transaction or OTP service), not a locator problem."
        );
      }

      if (await this.bouncedToDashboard()) {
        throw new Error(
          "The app bounced back to the Dashboard after Submit, so the OTP/confirmation popup never appeared. " +
            "The transaction was not accepted - this is the intermittent backend session drop (the same one that " +
            "affects other transactions), not a locator problem. Re-run (headed) to retry once the session is healthy."
        );
      }

      await this.page.waitForTimeout(400);
    }

    const toast = (await this.hardErrorToast()) || (await getToastText(this.page, 2_000));
    throw new Error(
      "OTP/confirmation popup did not appear after Submit." + (toast ? ` Application showed: "${toast.trim()}".` : "")
    );
  }

  /**
   * NON-THROWING: waits briefly for the OTP popup. Returns "otp" if it appeared, "bounce"
   * if the app dropped back to the Dashboard, "error" on a hard backend toast, or "timeout".
   * Used to retry the (side-effect-free) pre-OTP phase through the intermittent session drop.
   */
  async waitForOutcome(timeout = 12_000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.otpBoxes.first().isVisible().catch(() => false)) return "otp";
      if (await this.hardErrorToast()) return "error";
      if (await this.bouncedToDashboard()) return "bounce";
      await this.page.waitForTimeout(400);
    }
    return "timeout";
  }

  /** Returns the text of a hard backend error toast, or "" if none is shown. */
  async hardErrorToast() {
    const toast = this.page
      .getByText(/session\s*time\s*out|session expired|timed out|internal server error|transaction failed|declined/i)
      .first();
    if (!(await toast.isVisible().catch(() => false))) return "";
    return ((await toast.innerText().catch(() => "")) || "").trim();
  }

  /** True once the app has dropped back to the Dashboard home (a "Quick Actions" landmark). */
  async bouncedToDashboard() {
    return this.page
      .getByRole("heading", { name: /quick actions/i })
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Soft ASSERTIONS on displayed details. */
  async verifyDetails({ amount, beneficiaryName } = {}) {
    if (amount) {
      await expect
        .soft(this.page.getByText(new RegExp(amount.replace(".", "\\."))).first(), "Popup should display the amount")
        .toBeVisible({ timeout: TIMEOUTS.QUICK });
    }
    if (beneficiaryName) {
      await expect
        .soft(this.page.getByText(new RegExp(beneficiaryName, "i")).first(), "Popup should display the beneficiary")
        .toBeVisible({ timeout: TIMEOUTS.QUICK });
    }
  }

  /**
   * Enters the transaction OTP and confirms.
   *
   * TRANSACTION OTP IS MANUAL BY DEFAULT: a real OTP is sent to the registered phone, so
   * the test pauses (run headed) for you to type it in and click Confirm. Only the LOGIN
   * OTP uses the UAT bypass code - it is handled separately in LoginPage, not here.
   *
   * For a fully unattended/CI run, set IB_MANUAL_OTP=false to auto-fill the bypass code
   * here too.
   */
  async enterOtpAndConfirm(otp) {
    if (process.env.IB_MANUAL_OTP !== "false") return this.waitForManualOtp();

    await fillOtpBoxes(this.page, otp);
    await expect(this.confirmButton, "Confirm button should be enabled after entering OTP").toBeEnabled({
      timeout: TIMEOUTS.QUICK,
    });
    await this.confirmButton.click();
  }

  /**
   * Manual-OTP mode: pause while the OTP that was sent to the phone is typed in by hand
   * and Confirm is clicked. Completion is detected by the OTP popup closing.
   */
  async waitForManualOtp() {
    const timeout = TIMEOUTS.MANUAL_OTP;
    // eslint-disable-next-line no-console
    console.log(
      `\n>>> MANUAL OTP: enter the OTP sent to your phone in the browser and click Confirm ` +
        `(waiting up to ${Math.round(timeout / 1000)}s)...\n`
    );
    const done = await this.otpBoxes
      .first()
      .waitFor({ state: "hidden", timeout })
      .then(() => true)
      .catch(() => false);
    if (!done) {
      throw new Error(
        `Timed out after ${Math.round(timeout / 1000)}s waiting for the transaction OTP to be entered and confirmed ` +
          "manually. Run headed so the browser is visible (the per-feature npm scripts already pass --headed), and " +
          "raise IB_MANUAL_OTP_TIMEOUT if you need longer. For an unattended run, set IB_MANUAL_OTP=false to use the " +
          "bypass code instead."
      );
    }
  }

  /**
   * ASSERTION: transaction success is shown after confirming the OTP.
   *
   * Runs AFTER the OTP popup has closed, so the confirmation-popup text is gone and the
   * matcher can be generous. If success still isn't recognised, it reports the actual
   * on-screen headings/toast so the real success wording can be pinned down precisely.
   */
  async assertSuccess() {
    const success = this.page
      .getByText(
        /success|successful|successfully|completed|complete|receipt|reference\s*(no|number|#)|has been (submitted|processed|completed|placed|scheduled)|thank you|processed|transaction is|payment (is )?successful|settlement.*successful|done/i
      )
      .first();
    const ok = await success
      .waitFor({ state: "visible", timeout: TIMEOUTS.LOAD })
      .then(() => true)
      .catch(() => false);
    if (ok) return;

    // A hard error toast means it genuinely failed - report that as the cause.
    const err = await this.hardErrorToast();
    if (err) {
      throw new Error(`Transaction failed: the app showed "${err}" instead of a success confirmation.`);
    }

    // Otherwise surface what IS on screen so the real success wording can be added here.
    const onScreen = await this.visibleSummary();
    throw new Error(
      "Transaction success confirmation was not recognised after confirming the OTP. " +
        `Visible on screen: ${onScreen}. If that IS the success screen, add its wording to ConfirmationPopup.assertSuccess().`
    );
  }

  /** Collects the visible headings (and any toast) for diagnostics. */
  async visibleSummary() {
    const parts = [];
    const headings = await this.page.getByRole("heading").allInnerTexts().catch(() => []);
    for (const h of headings) {
      const t = h.trim();
      if (t) parts.push(`"${t}"`);
    }
    const toast = await getToastText(this.page, 1_500);
    if (toast) parts.push(`toast="${toast.trim()}"`);
    return parts.slice(0, 8).join(" | ") || "(no headings/toast found)";
  }
}

module.exports = { ConfirmationPopup };
