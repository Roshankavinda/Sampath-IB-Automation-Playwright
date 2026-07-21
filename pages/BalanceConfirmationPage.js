const { expect } = require("@playwright/test");

/**
 * Self Services > Balance Confirmation.
 * Route: /dashboard/self-services/balance-confirmations (plural; the Self Services menu
 * item is a no-op link, so navigate directly - see DashboardPage.goToBalanceConfirmations).
 * No OTP - this is a request, not a transaction.
 *
 * Wizard (confirmed against the live app):
 *   1. Confirmation type: radio[name="confirmationType"]
 *        TAX_CERTIFICATE ("Tax" - addressed to the Commissioner General of Inland Revenue)
 *        AUDIT_REPORT   ("Audit" - for audit purposes) -> Next
 *   2. Date Range Selection: Start Date* / End Date* (must be picked) -> Next
 *   3. -> request submitted.
 */
class BalanceConfirmationPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/requesting balance confirmations/i).first();
    this.confirmationTypeRadios = page.locator('input[name="confirmationType"]');
    this.taxOption = page.getByText(/^Tax$/i).first();
    this.auditOption = page.getByText(/^Audit$/i).first();
    this.startDateInput = page.getByPlaceholder(/select start date/i).first();
    this.endDateInput = page.getByPlaceholder(/select end date/i).first();
    this.accountRows = page.locator("table tbody tr");
    this.accountCheckboxes = page.locator('table input[type="checkbox"]');
    this.nextButton = page.getByRole("button", { name: /^next$/i }).first();
    this.backButton = page.getByRole("button", { name: /^back$/i }).first();
    this.applyButton = page.getByRole("button", { name: /^apply$/i }).first();
    this.confirmButton = page.getByRole("button", { name: /^confirm$/i }).first();
    this.confirmationPrompt = page.getByText(/please confirm|confirm.*request|balance confirmation request/i).first();
  }

  /** ASSERTION: the balance confirmation wizard (step 1) is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Requesting Balance Confirmations' heading should be visible").toBeVisible({
      timeout: 60_000,
    });
    await expect(this.confirmationTypeRadios.first(), "A confirmation-type option should be shown").toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * Step 1: choose the confirmation type, then Next.
   * @param {"Tax"|"Audit"} type
   */
  async selectConfirmationTypeAndContinue(type = "Tax") {
    const option = /audit/i.test(type) ? this.auditOption : this.taxOption;
    await option.click();
    await expect(this.nextButton, "Next should enable once a confirmation type is chosen").toBeEnabled({
      timeout: 15_000,
    });
    await this.nextButton.click();
  }

  /** ASSERTION: the date-range step is displayed. */
  async assertDateRangeStep() {
    await expect(this.startDateInput, "Step 2: the Start Date field should be shown").toBeVisible({ timeout: 30_000 });
    await expect(this.endDateInput, "Step 2: the End Date field should be shown").toBeVisible();
  }

  /**
   * Picks a start and end date from the calendar pickers (they open on click and expose
   * day buttons + Apply). Best-effort: chooses the first selectable day, then Apply.
   */
  async pickDateRange() {
    for (const field of [this.startDateInput, this.endDateInput]) {
      await field.click();
      await this.page.waitForTimeout(1000);
      // Click a day, then Apply if the picker has an Apply button.
      const day = this.page.getByRole("button", { name: /^\d{1,2}$/ }).first();
      await day.click({ force: true }).catch(() => {});
      if (await this.applyButton.isVisible().catch(() => false)) await this.applyButton.click().catch(() => {});
      await this.page.waitForTimeout(800);
    }
  }

  /** Advances from the date-range step to the account-selection step. */
  async continueToAccounts() {
    await expect(this.nextButton, "Next should be enabled once the date range is selected").toBeEnabled({
      timeout: 15_000,
    });
    await this.nextButton.click();
  }

  /** ASSERTION: the account-selection step (a table of eligible accounts) is shown. */
  async assertAccountStep() {
    await expect(this.accountRows.first(), "The account-selection list should be shown").toBeVisible({
      timeout: 30_000,
    });
  }

  /** Selects an eligible account (checking one enables Next), then continues. */
  async selectAccountAndContinue() {
    await this.accountCheckboxes.first().check({ force: true });
    await expect(this.nextButton, "Next should enable once an account is selected").toBeEnabled({ timeout: 15_000 });
    await this.nextButton.click();
  }

  /** ASSERTION: the final confirmation step (a 'Confirm' button) is reached. */
  async assertConfirmationStep() {
    await expect(this.confirmButton, "The balance confirmation review step ('Confirm') should be reached").toBeVisible({
      timeout: 30_000,
    });
  }

  /** Places the request if the app allows it (Confirm enabled). */
  async confirmIfEnabled() {
    if (await this.confirmButton.isEnabled().catch(() => false)) {
      await this.confirmButton.click();
      const done = this.page.getByText(/success|submitted|request.*received|generated|reference/i).first();
      await expect(done, "A balance confirmation request confirmation should be shown").toBeVisible({ timeout: 30_000 });
      return true;
    }
    return false;
  }
}

module.exports = { BalanceConfirmationPage };
