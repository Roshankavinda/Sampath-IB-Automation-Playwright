const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
const { selectOptionByLabelContains, assertDropdownPopulated, assertSelectedContains } = require("../utils/helpers");

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
    // Transfer Mode: One-time Transaction (ONLINE) vs Standing Order/Schedule (SCHEDULE).
    this.transferModeOnline = page.locator('input[name="transferMode"][value="ONLINE"]');
    this.transferModeSchedule = page.locator('input[name="transferMode"][value="SCHEDULE"]');
    this.standingOrderLabel = page.getByText("Standing Order/Schedule", { exact: true }).first();
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
    // Submit is NOT disabled on an empty form: the app validates on click and shows
    // inline "<field> is required" messages (To Account / Amount / Sender Remark /
    // Beneficiary Remark are all mandatory).
    this.requiredError = page.getByText(/is required/i).first();
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
      timeout: TIMEOUTS.VERY_SLOW,
    });
    await expect(
      this.toAccountSelect,
      "Own Account form: To Account dropdown should load (it is fetched after the From Account list)"
    ).toBeVisible({ timeout: TIMEOUTS.VERY_SLOW });
    await expect(this.amountInput, "Own Account form: Amount field should be visible").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /**
   * SOFT VALIDATIONS on the loaded form: both account dropdowns are populated with
   * selectable options and every input/control is present. Soft, so the report lists
   * all UI problems at once instead of stopping at the first.
   */
  async assertFormValidations() {
    await assertDropdownPopulated(this.fromAccountSelect, "From Account");
    await assertDropdownPopulated(this.toAccountSelect, "To Account");
    await expect.soft(this.amountInput, "Amount field should be visible").toBeVisible();
    await expect.soft(this.senderRemarkInput, "Sender Remark field should be visible").toBeVisible();
    await expect.soft(this.beneficiaryRemarkInput, "Beneficiary Remark field should be visible").toBeVisible();
    await expect.soft(this.transferModeRadios.first(), "A Transfer Mode option should be visible").toBeVisible();
    await expect.soft(this.submitButton, "Submit button should be visible").toBeVisible();
  }

  async fillForm(data) {
    await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount);
    await selectOptionByLabelContains(this.toAccountSelect, data.toAccount);

    // SOFT ASSERTION: the chosen source/destination accounts are the ones now selected.
    await assertSelectedContains(this.fromAccountSelect, data.fromAccount, "From Account");
    await assertSelectedContains(this.toAccountSelect, data.toAccount, "To Account");

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
        timeout: TIMEOUTS.UI,
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
   * Selects the "Standing Order/Schedule" transfer mode. The schedule detail fields
   * (start date, frequency, ...) are NOT on this form - they appear in a modal after
   * Submit (see ScheduleModal). The radios are custom-styled, so click the label:
   * a forced check() flips the input without firing React's onChange.
   */
  async selectStandingOrderSchedule() {
    await this.standingOrderLabel.click();
    await expect(this.transferModeSchedule, "Standing Order/Schedule mode should be selected").toBeChecked({
      timeout: TIMEOUTS.QUICK,
    });
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once the form is valid").toBeEnabled({
      timeout: TIMEOUTS.UI,
    });
    await this.submitButton.click();
  }

  // ---- helpers for the negative / validation suite ----

  /** ASSERTION: both account dropdowns loaded with selectable values (not empty skeletons). */
  async assertAccountsPopulated() {
    await assertDropdownPopulated(this.fromAccountSelect, "From Account");
    await assertDropdownPopulated(this.toAccountSelect, "To Account");
  }

  /**
   * Fills ONLY the provided fields (skips undefined) - for partial "<field> is required"
   * negatives. Unlike fillForm() it makes no From != To / amount assertions.
   */
  async fillPartial({ fromAccount, toAccount, amount, senderRemark, beneficiaryRemark } = {}) {
    if (fromAccount) await selectOptionByLabelContains(this.fromAccountSelect, fromAccount).catch(() => {});
    if (toAccount) await selectOptionByLabelContains(this.toAccountSelect, toAccount).catch(() => {});
    if (amount != null) await this.amountInput.fill(String(amount));
    if (senderRemark) await this.senderRemarkInput.fill(senderRemark);
    if (beneficiaryRemark) await this.beneficiaryRemarkInput.fill(beneficiaryRemark);
  }

  /** The amount field's current value, digits only (the field reformats "1000" -> "LKR 1,000.00"). */
  async amountDigits() {
    return String(await this.amountInput.inputValue().catch(() => "")).replace(/\D/g, "");
  }

  /**
   * Tries to set the SAME account on both From and To. Some apps exclude the From account
   * from the To list, so this reports whether the To dropdown actually accepted it.
   * @returns {{ fromVal: string, toVal: string, matched: boolean }}
   */
  async trySameAccountBothSides(accountPartial) {
    await selectOptionByLabelContains(this.fromAccountSelect, accountPartial).catch(() => {});
    const fromVal = await this.fromAccountSelect.inputValue().catch(() => "");
    await this.toAccountSelect.selectOption(fromVal).catch(() => {});
    const toVal = await this.toAccountSelect.inputValue().catch(() => "");
    return { fromVal, toVal, matched: fromVal !== "" && fromVal === toVal };
  }

  /** ASSERTION: an empty form is blocked with inline "<field> is required" messages. */
  async assertRequiredValidationShown() {
    await expect(
      this.requiredError,
      "An inline 'is required' validation message should be shown when the form is empty"
    ).toBeVisible({ timeout: TIMEOUTS.ACTION });

    // ASSERTION: the mandatory fields are each called out, and the form does not advance.
    await expect
      .soft(this.page.getByText(/to account is required/i), "'To Account is required' should be shown")
      .toBeVisible();
    await expect.soft(this.page.getByText(/amount is required/i), "'Amount is required' should be shown").toBeVisible();
    await expect(this.toAccountSelect, "The transfer form should stay open").toBeVisible();
  }
}

module.exports = { OwnAccountPage };
