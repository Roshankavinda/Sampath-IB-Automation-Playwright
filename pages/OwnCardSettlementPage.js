const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
const { selectOptionByLabelContains, assertDropdownPopulated, assertSelectedContains, toRegExp } = require("../utils/helpers");

/**
 * Own Card Settlement — settle your OWN Sampath credit card.
 * Flow (all confirmed against the live app, card 5471 65XX XXXX 1071):
 *   Dashboard > My Accounts > Credit Cards (DashboardPage.goToCreditCards)
 *   -> the card list + "Credit Card Details" panel render on load
 *   -> click the card -> "Settle" opens the "Make payments to this card" modal
 *   -> pick funding Account (select[name="account"]) + a payment type box
 *      (Last Statement O/S | Minimum Payment | Custom Amount -> input[name="customAmount"])
 *      + Transfer Mode radio (ONLINE = One-time / SCHEDULE = Standing Order)
 *   -> "Next" -> confirmation / OTP.
 *
 * The settle form is a fixed overlay (div.fixed.inset-0.z-50). All of its controls
 * are scoped to that overlay so we never hit the background "Settle" button.
 */
class OwnCardSettlementPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    // Credit Cards landing page (confirmed): breadcrumb "Accounts / Credit Cards".
    this.heading = page.getByText(/accounts \/ credit cards|credit card details/i).first();
    this.settleButton = page.getByRole("button", { name: /settle/i }).first();

    // The Settle modal overlay + the "Make payments to this card" form inside it.
    this.modal = page.locator("div.fixed.inset-0.z-50").first();
    this.modalHeading = this.modal.getByText("Make payments to this card", { exact: true });
    this.fundingAccountSelect = this.modal.locator('select[name="account"]');
    this.customAmountInput = this.modal.locator('input[name="customAmount"]');
    this.transferModeOnline = this.modal.locator('input[name="transferMode"][value="ONLINE"]');
    this.transferModeSchedule = this.modal.locator('input[name="transferMode"][value="SCHEDULE"]');
    // The button that advances the settlement is "Next" (not "Submit").
    this.submitButton = this.modal.getByRole("button", { name: /^next$/i }).first();

    // Inline amount validation, e.g. "Custom amount must be greater than 0.00". It shows
    // as soon as the amount is entered - Next is NOT disabled.
    this.amountError = this.page.getByText(/must be greater than/i).locator("visible=true").first();
  }

  /** ASSERTION: the Credit Cards page is displayed. */
  async assertLoaded() {
    await expect(this.heading, "Credit Cards page should be visible").toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  /**
   * Confirms the target card is listed and selects it. The Credit Cards page renders
   * the card (masked, e.g. "5471 65XX XXXX 1071") and its details panel on load, so a
   * partial such as the last 4 digits is enough. Fails clearly if the card isn't found.
   */
  async selectCard(cardPartial) {
    // Tolerate the masked format by allowing flexible spacing between the digits.
    const pattern = new RegExp(String(cardPartial).replace(/\s+/g, "\\s*"), "i");
    const card = this.page.getByText(pattern).first();
    await expect(
      card,
      `Credit card matching "${cardPartial}" should be visible - the logged-in account must hold this credit card`
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
    await card.click().catch(() => {});
  }

  async clickSettle() {
    await expect(this.settleButton, "'Settle' button should be visible in the Credit Card Details panel").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await this.settleButton.click();
    // The settlement modal must open.
    await expect(this.modalHeading, "'Make payments to this card' modal should open after Settle").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /**
   * SOFT VALIDATIONS on the open Settle modal: the funding-account dropdown is populated
   * and the three payment-type options + One-time transfer mode are present. Soft, so
   * all UI problems in the modal are reported together. Call after clickSettle().
   */
  async assertFormValidations() {
    await assertDropdownPopulated(this.fundingAccountSelect, "Funding Account");
    await expect
      .soft(this.modal.getByText(/minimum payment/i).first(), "'Minimum Payment' option should be shown")
      .toBeVisible();
    await expect
      .soft(this.modal.getByText(/last statement o\/s/i).first(), "'Last Statement O/S' option should be shown")
      .toBeVisible();
    await expect
      .soft(this.modal.getByText(/custom amount/i).first(), "'Custom Amount' option should be shown")
      .toBeVisible();
    await expect.soft(this.transferModeOnline, "One-time Transaction option should be present").toBeAttached();
    await expect.soft(this.submitButton, "'Next' button should be visible").toBeVisible();
  }

  /**
   * Fills the settlement modal:
   *  - funding account (select[name="account"], matched by partial),
   *  - payment type box ("Minimum Payment" | "Last Statement O/S" | "Custom Amount"),
   *    entering data.amount into input[name="customAmount"] for a custom amount,
   *  - Transfer Mode = One-time Transaction (ONLINE).
   */
  async fillSettlement(data) {
    await expect(this.fundingAccountSelect, "Funding account dropdown should be visible in the Settle modal").toBeVisible(
      { timeout: TIMEOUTS.LOAD }
    );

    if (data.fromAccount) {
      await selectOptionByLabelContains(this.fundingAccountSelect, data.fromAccount).catch(() => {});
      // SOFT ASSERTION: the chosen funding account is the one selected.
      await assertSelectedContains(this.fundingAccountSelect, data.fromAccount, "Funding Account");
    }

    const type = data.settlementType || "Minimum Payment";
    const typeBox = this.modal.getByText(new RegExp(type.replace(/[*]/g, "").trim(), "i")).first();
    await expect(typeBox, `Payment type "${type}" should be selectable in the Settle modal`).toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await typeBox.click();

    if (/custom/i.test(type) && data.amount != null) {
      await expect(this.customAmountInput, "Custom Amount input should appear when 'Custom Amount' is chosen").toBeVisible(
        { timeout: TIMEOUTS.UI }
      );
      await this.customAmountInput.fill(String(data.amount));
    }

    // Default to a one-time transaction (not a standing order).
    await this.transferModeOnline.check().catch(() => {});
  }

  async submit() {
    await expect(this.submitButton, "'Next' should be enabled once the settlement form is valid").toBeEnabled({
      timeout: TIMEOUTS.UI,
    });
    await this.submitButton.click();
  }

  /**
   * ASSERTION: an invalid settlement amount is rejected inline and the modal stays open.
   *
   * The message appears as soon as the amount is typed, so it must be asserted BEFORE
   * clicking Next - Next closes the modal and returns to the dashboard, taking the
   * message with it.
   */
  async assertAmountValidationShown(pattern = /must be greater than/i) {
    pattern = toRegExp(pattern);
    const error = this.page.getByText(pattern).locator("visible=true").first();
    await expect(
      error,
      `An inline amount validation matching ${pattern} should be shown for an invalid settlement amount`
    ).toBeVisible({ timeout: TIMEOUTS.ACTION });

    // ASSERTION: the settlement is not allowed to proceed - the modal stays open.
    await expect(this.modalHeading, "The Settle modal should stay open when the amount is invalid").toBeVisible();
  }
}

module.exports = { OwnCardSettlementPage };
