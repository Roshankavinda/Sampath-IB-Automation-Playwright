const { expect } = require("@playwright/test");
const { selectOptionByLabelContains, selectTransferMode, fillDateField } = require("../utils/helpers");

/**
 * Send Money > Own Account form (OwnAccount.tsx).
 * Fields: select[name="accountFrom"], select[name="accountTo"], input[name="amount"],
 *         input[name="senderRemark"], input[name="beneficiaryRemark"],
 *         input[name="transferMode"] radios, "Submit" button.
 */
class OwnAccountPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.toAccountSelect = page.locator('select[name="accountTo"]');
    this.amountInput = page.locator('input[name="amount"]');
    this.senderRemarkInput = page.locator('input[name="senderRemark"]');
    this.beneficiaryRemarkInput = page.locator('input[name="beneficiaryRemark"]');
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
    // Submit is NOT disabled on an empty form: the app validates on click and shows
    // inline "<field> is required" messages (To Account / Amount / Sender Remark /
    // Beneficiary Remark are all mandatory).
    this.requiredError = page.getByText(/is required/i).first();
    // Scheduled / recurring transfer fields (appear after choosing a non-One-time mode).
    // VERIFY these name attributes against the live app.
    this.effectiveDateInput = page.locator('input[name="effectiveDate"], input[type="date"]').first();
    this.endDateInput = page.locator('input[name="endDate"]').first();
    this.frequencySelect = page.locator('select[name="frequency"]');
  }

  /**
   * ASSERTION: the Own Account form is displayed.
   *
   * Both account dropdowns are fetched asynchronously and render as skeleton loaders
   * first - To Account arrives after From Account - so each needs its own generous wait
   * rather than the default expect timeout.
   */
  async assertLoaded() {
    await expect(this.fromAccountSelect, "Own Account form: From Account dropdown should be visible").toBeVisible({
      timeout: 90_000,
    });
    await expect(
      this.toAccountSelect,
      "Own Account form: To Account dropdown should load (it is fetched after the From Account list)"
    ).toBeVisible({ timeout: 90_000 });
    await expect(this.amountInput, "Own Account form: Amount field should be visible").toBeVisible({
      timeout: 30_000,
    });
  }

  async fillForm(data) {
    await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount);
    await selectOptionByLabelContains(this.toAccountSelect, data.toAccount);

    // ASSERTION: From and To accounts must be different.
    const fromVal = await this.fromAccountSelect.inputValue();
    const toVal = await this.toAccountSelect.inputValue();
    expect(fromVal, "From and To accounts must be different for an own account transfer").not.toBe(toVal);

    await this.amountInput.fill(data.amount);
    await this.senderRemarkInput.fill(data.senderRemark);
    await this.beneficiaryRemarkInput.fill(data.beneficiaryRemark);

    // ASSERTION: the entered amount is reflected in the form. The field reformats what
    // was typed ("999999999" -> "LKR 999,999,999.00"), so compare the digits, not the
    // raw string.
    const digits = (s) => String(s).replace(/\D/g, "");
    await expect
      .poll(async () => digits(await this.amountInput.inputValue()), {
        timeout: 15_000,
        message: "Amount field should contain the entered amount",
      })
      .toContain(digits(data.amount));
  }

  async ensureOneTimeTransaction() {
    const oneTime = this.transferModeRadios.first();
    if (!(await oneTime.isChecked())) {
      await oneTime.check({ force: true });
    }
    await expect(oneTime, "One-time Transaction mode should be selected").toBeChecked();
  }

  /**
   * Select a transfer mode and, for scheduled/recurring, fill the schedule fields.
   * @param {"one-time"|"scheduled"|"recurring"} mode
   * @param {{ effectiveDate?: string, endDate?: string, frequency?: string }} [schedule]
   */
  async setTransferMode(mode, schedule = {}) {
    if (mode === "one-time") return this.ensureOneTimeTransaction();

    await selectTransferMode(this.transferModeRadios, mode === "recurring" ? "Recurring" : "Scheduled");

    if (schedule.effectiveDate) await fillDateField(this.effectiveDateInput, schedule.effectiveDate);
    if (mode === "recurring") {
      if (schedule.frequency && (await this.frequencySelect.isVisible().catch(() => false))) {
        await selectOptionByLabelContains(this.frequencySelect, schedule.frequency);
      }
      if (schedule.endDate && (await this.endDateInput.isVisible().catch(() => false))) {
        await fillDateField(this.endDateInput, schedule.endDate);
      }
    }
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once the form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }

  /** ASSERTION: an empty form is blocked with inline "<field> is required" messages. */
  async assertRequiredValidationShown() {
    await expect(
      this.requiredError,
      "An inline 'is required' validation message should be shown when the form is empty"
    ).toBeVisible({ timeout: 20_000 });

    // ASSERTION: the mandatory fields are each called out, and the form does not advance.
    await expect
      .soft(this.page.getByText(/to account is required/i), "'To Account is required' should be shown")
      .toBeVisible();
    await expect.soft(this.page.getByText(/amount is required/i), "'Amount is required' should be shown").toBeVisible();
    await expect(this.toAccountSelect, "The transfer form should stay open").toBeVisible();
  }
}

module.exports = { OwnAccountPage };
