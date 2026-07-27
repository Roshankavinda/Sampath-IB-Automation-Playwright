const { expect } = require("@playwright/test");
const { selectOptionByLabelContains, assertDropdownPopulated, toRegExp } = require("../utils/helpers");

/**
 * Schedule (Standing Order) detail modal — shared by scheduled Fund Transfer and
 * scheduled Bill Payment. It opens after Submit/Next when the "Standing Order/Schedule"
 * transfer mode is selected on the transfer/payment form.
 *
 * All selectors confirmed against the live app. Fields (scoped to the overlay
 * div.fixed.inset-0.z-50):
 *   input[name="startDate"]            - readonly calendar, PRE-FILLED with tomorrow
 *                                        (format DD-MM-YYYY); a valid future date by default
 *   select[name="transferFrequency"]  - "One Time" (single) | Daily | Weekly | Monthly |
 *                                        Quarterly | Half-Yearly | Annually
 *   select[name="scheduleType"]       - FUND TRANSFER ONLY: "Number of Transfers" | "End Date"
 *   input[name="numberofTransactions"]- shown for Number of Transfers/Payments (default 1)
 *   input[name="endDate"]             - FUND TRANSFER ONLY: shown when scheduleType = End Date
 *   button[type=submit] "Submit"      - the green confirm button
 */
class ScheduleModal {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.modal = page.locator("div.fixed.inset-0.z-50").first();
    this.startDateInput = this.modal.locator('input[name="startDate"]');
    this.frequencySelect = this.modal.locator('select[name="transferFrequency"]');
    this.scheduleTypeSelect = this.modal.locator('select[name="scheduleType"]');
    this.numberOfTransactionsInput = this.modal.locator('input[name="numberofTransactions"]');
    this.endDateInput = this.modal.locator('input[name="endDate"]');
    this.submitButton = this.modal.getByRole("button", { name: "Submit", exact: true }).last();
  }

  /** ASSERTION: the schedule detail modal is open. */
  async assertOpen() {
    await expect(this.modal, "The schedule detail modal should open after Submit in Standing Order mode").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.startDateInput, "Schedule: the Start Date field should be shown").toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * SOFT VALIDATIONS on the schedule modal: the Start Date is pre-filled with a valid
   * future date and the Frequency dropdown is populated with the expected options.
   */
  async assertFormValidations() {
    await expect.soft(this.startDateInput, "Schedule: Start Date should be visible").toBeVisible();
    const startVal = await this.startDateInput.inputValue().catch(() => "");
    expect.soft(startVal, "Schedule: Start Date should default to a (future) date").not.toBe("");
    await assertDropdownPopulated(this.frequencySelect, "Frequency");
  }

  /**
   * Fills the schedule details.
   *  - Start Date keeps its default (tomorrow); it is a readonly calendar.
   *  - frequency: "One Time" for a single scheduled payment, or a repeating value.
   *  - scheduleType / numberOfTransactions apply to recurring fund transfers.
   * @param {{ frequency: string, scheduleType?: string, numberOfTransactions?: string|number }} data
   */
  async fill(data) {
    await selectOptionByLabelContains(this.frequencySelect, data.frequency);

    // Fund transfer offers "Number of Transfers" vs "End Date"; bill payment does not.
    if (data.scheduleType && (await this.scheduleTypeSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.scheduleTypeSelect, data.scheduleType);
    }

    if (
      data.numberOfTransactions != null &&
      (await this.numberOfTransactionsInput.isVisible().catch(() => false)) &&
      (await this.numberOfTransactionsInput.isEditable().catch(() => false))
    ) {
      await this.numberOfTransactionsInput.fill(String(data.numberOfTransactions));
    }
  }

  async submit() {
    await expect(this.submitButton, "The schedule 'Submit' button should be enabled once the form is valid").toBeEnabled(
      { timeout: 15_000 }
    );
    await this.submitButton.click();
  }

  /**
   * ASSERTION (negative): with no Frequency chosen, the schedule must not go through.
   * Submitting is either blocked inline or keeps the modal open; either way no OTP is
   * requested. Tolerant, because the app may block via a disabled button or a message.
   * @param {RegExp} expectedError
   */
  async assertFrequencyRequired(expectedError = /frequency|required|select/i) {
    expectedError = toRegExp(expectedError);
    // Frequency should still be the placeholder ("Select Frequency").
    const freqVal = await this.frequencySelect.inputValue().catch(() => "");
    expect(freqVal, "Frequency should be left unselected for this negative case").toBe("");

    await this.submitButton.click().catch(() => {});
    await this.page.waitForTimeout(1500);

    // No OTP may be requested for an incomplete schedule.
    const otp = await this.page.locator("input.otp-box").count().catch(() => 0);
    expect(otp, "No OTP should be requested when the schedule has no frequency").toBe(0);

    // The schedule must be blocked: the modal stays open, or a validation is shown.
    const modalStillOpen = await this.modal.isVisible().catch(() => false);
    const errorShown = await this.page
      .getByText(expectedError)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    expect(
      modalStillOpen || errorShown,
      "The schedule should be blocked when no Frequency is chosen (the modal stays open or a validation is shown)"
    ).toBeTruthy();
  }
}

module.exports = { ScheduleModal };
