const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Quick Actions > Stop Card — block a Credit / Debit / Web card.
 * Flow: choose card type (Credit / Debit / Web) -> select the card ->
 *       choose a reason -> Submit -> OTP/confirmation.
 *
 * // VERIFY against the live app: heading text, how the card type is chosen
 * // (tabs vs radios) and the field name attributes below.
 */
class StopCardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/stop card|block card/i).first();
    this.cardTypeRadios = page.locator('input[name="cardType"]');
    this.cardSelect = page.locator('select[name="card"], select[name="cardNumber"]').first();
    this.reasonSelect = page.locator('select[name="reason"]').first();
    this.reasonInput = page.locator('input[name="reason"]').first();
    this.submitButton = page.getByRole("button", { name: /^(submit|stop|block|proceed|next|confirm)$/i }).first();
  }

  /** ASSERTION: the Stop Card form is displayed. */
  async assertLoaded() {
    await expect(this.heading, "Stop Card heading should be visible").toBeVisible({ timeout: 60_000 });
    await expect(this.cardSelect, "Stop Card: card dropdown should be visible").toBeVisible({ timeout: 30_000 });
  }

  /** Chooses the card type (Credit / Debit / Web) from a tab or radio group. */
  async selectCardType(cardType) {
    if (!cardType) return;
    // Prefer a visible tab/label with the card-type text.
    const tab = this.page.getByRole("button", { name: new RegExp(cardType, "i") }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      return;
    }
    const label = this.page.getByText(new RegExp(`${cardType}\\s*card`, "i")).first();
    if (await label.isVisible().catch(() => false)) await label.click();
  }

  async fillForm(data) {
    await this.selectCardType(data.cardType);
    await selectOptionByLabelContains(this.cardSelect, data.card);

    if (data.reason) {
      if (await this.reasonSelect.isVisible().catch(() => false)) {
        await selectOptionByLabelContains(this.reasonSelect, data.reason);
      } else if (await this.reasonInput.isVisible().catch(() => false)) {
        await this.reasonInput.fill(data.reason);
      }
    }

    // ASSERTION: a card is selected (dropdown has a non-empty value).
    await expect
      .poll(async () => (await this.cardSelect.inputValue().catch(() => "")).length, {
        timeout: 15_000,
        message: "A card should be selected before submitting",
      })
      .toBeGreaterThan(0);
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once a card and reason are chosen").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { StopCardPage };
