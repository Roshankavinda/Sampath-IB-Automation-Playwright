const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

/**
 * Self Services > Request Tax Certificates (WHT/AIT).
 * Route: /dashboard/self-services/tax-certificates (the Self Services menu item is a
 * no-op link in this build, so navigate to the route directly - see
 * DashboardPage.goToTaxCertificates). No OTP - this is a request, not a transaction.
 *
 * Wizard (confirmed against the live app):
 *   1. Certificate type: radio[name="certificateType"] value WHT_AIT ("WHT/AIT Certificate")
 *   2. Date range: Start date* / End date* (pre-filled, readonly calendars) -> Next
 *   3. Account selection: a table of accounts with a checkbox per row (only "Opened"
 *      accounts are selectable) -> Next -> request submitted.
 */
class TaxCertificatePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/requesting withholding tax/i).first();
    this.certificateTypeRadios = page.locator('input[name="certificateType"]');
    this.whtOption = page.getByText(/WHT\/AIT Certificate/i).first();
    this.startDateInput = page.getByPlaceholder(/select start date/i).first();
    this.endDateInput = page.getByPlaceholder(/select end date/i).first();
    this.accountRows = page.locator("table tbody tr");
    this.nextButton = page.getByRole("button", { name: /^next$/i }).first();
    this.backButton = page.getByRole("button", { name: /^back$/i }).first();
    this.confirmButton = page.getByRole("button", { name: /^confirm$/i }).first();
    this.confirmationPrompt = page.getByText(/please confirm.*request|confirm if you want to place/i).first();
  }

  /** ASSERTION: the tax certificate wizard (step 1) is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Requesting Withholding Tax (WHT) Certificates' heading should be visible").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await expect(this.certificateTypeRadios.first(), "A certificate-type option should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /** Step 1: choose the WHT/AIT certificate type, then Next. */
  async selectCertificateTypeAndContinue() {
    await this.whtOption.click();
    await expect(this.nextButton, "Next should enable once a certificate type is chosen").toBeEnabled({
      timeout: TIMEOUTS.UI,
    });
    await this.nextButton.click();
  }

  /** Step 2: the date range is pre-filled; just continue. */
  async assertDateRangeStep() {
    await expect(this.startDateInput, "Step 2: the Start date field should be shown").toBeVisible({ timeout: TIMEOUTS.LOAD });
    await expect(this.endDateInput, "Step 2: the End date field should be shown").toBeVisible();
  }

  async continueDateRange() {
    await expect(this.nextButton, "Next should be enabled on the date-range step").toBeEnabled({ timeout: TIMEOUTS.UI });
    await this.nextButton.click();
  }

  /** Step 3: select an account (by its number, no spaces) via its row checkbox. */
  async assertAccountStep() {
    await expect(this.accountRows.first(), "Step 3: the account list should be shown").toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  async selectAccount(accountNumber) {
    const row = this.accountRows.filter({ hasText: accountNumber }).first();
    await expect(row, `Account "${accountNumber}" should be listed for the tax certificate`).toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await row.locator('input[type="checkbox"]').first().check({ force: true });
  }

  /** Advances from the account step to the final confirmation ("place a request") step. */
  async reachConfirmation() {
    await expect(this.nextButton, "Next should be enabled once an account is selected").toBeEnabled({ timeout: TIMEOUTS.UI });
    await this.nextButton.click();
  }

  /**
   * ASSERTION: the final confirmation step is reached (the request is fully built and the
   * app prompts to place it). The "Confirm" button itself may be disabled when the
   * selected account/period has no WHT/AIT deduction to certify.
   */
  async assertConfirmationStep() {
    await expect(this.confirmationPrompt, "The WHT/AIT certificate confirmation prompt should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect(this.confirmButton, "A 'Confirm' button should be shown on the review step").toBeVisible();
  }

  /** Places the request if the app allows it (Confirm enabled), then reports the outcome. */
  async confirmIfEnabled() {
    if (await this.confirmButton.isEnabled().catch(() => false)) {
      await this.confirmButton.click();
      const done = this.page.getByText(/success|submitted|request.*received|generated|reference/i).first();
      await expect(done, "A tax certificate request confirmation should be shown").toBeVisible({ timeout: TIMEOUTS.LOAD });
      return true;
    }
    return false; // Confirm disabled - typically no WHT/AIT deduction for the account/period.
  }
}

module.exports = { TaxCertificatePage };
