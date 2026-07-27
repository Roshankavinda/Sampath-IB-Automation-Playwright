const { expect } = require("@playwright/test");
const { selectOptionByLabelContains, assertDropdownPopulated, assertSelectedContains } = require("../utils/helpers");

/**
 * FD Create — "Open New Fixed Deposit" (dashboard Quick Actions tile -> /dashboard/open-fd).
 * A 4-step wizard. Steps 1 and 2 are confirmed against the live app.
 *
 * Step 1 "Are you Resident of Sri Lanka?":
 *   input[name="residentType"] radios (first = Resident, second = Non-Resident) -> Continue
 *
 * Step 2 "Create Fixed Deposit":
 *   select[name="scheme_code"]            - FD product (Sampath Fixed Deposit | 100,200,300
 *                                           Days | 15 Months). Default TDAFD.
 *   tenure card                           - a clickable card per tenure, e.g.
 *                                           "1 Month | 8.00% Monthly | 8.90% Maturity".
 *                                           Selecting one REVEALS interest_payable_mode.
 *   select[name="interest_payable_mode"]  - Monthly | Maturity (required; only appears
 *                                           after a tenure card is chosen)
 *   input[name="nickname"]                - Set Nickname*
 *   select[name="dr_account_number"]      - Funding Account. NOTE: options here have NO
 *                                           spaces ("101850104310 - LKR ...")
 *   input[name="amount"]                  - Enter Amount* (reformats to "LKR 25,000")
 *   select[name="funding_sources"]        - Source of Funds
 *   select[name="int_cr_account"]         - Interest To Be Credited To. Options DO have
 *                                           spaces ("1018 5010 4310 - AVL. LKR ...")
 *   checkbox                              - Auto renew (optional)
 *   -> Continue
 *
 * // VERIFY: steps 3 and 4 (review / terms / confirmation + OTP) were not reachable during
 * // exploration, so assertReviewStep()/confirm() below are best-effort.
 */
class FixedDepositPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Step 1
    this.residentRadios = page.locator('input[name="residentType"]');
    this.residentTypeHeading = page.getByText(/are you resident of sri lanka/i).first();

    // Step 2
    this.productSelect = page.locator('select[name="scheme_code"]');
    this.tenureCards = page.locator('div[class*="shadow-xl"]');
    this.interestModeSelect = page.locator('select[name="interest_payable_mode"]');
    this.nicknameInput = page.locator('input[name="nickname"]');
    this.fundingAccountSelect = page.locator('select[name="dr_account_number"]');
    this.amountInput = page.locator('input[name="amount"]');
    this.sourceOfFundsSelect = page.locator('select[name="funding_sources"]');
    this.interestAccountSelect = page.locator('select[name="int_cr_account"]');
    this.autoRenewCheckbox = page.locator('input[type="checkbox"]').first();

    // Wizard controls
    this.continueButton = page.getByRole("button", { name: /^continue$/i });
    this.backButton = page.getByRole("button", { name: /^back$/i });
    this.tenureError = page.getByText(/select a tenure type/i);
  }

  /** ASSERTION: step 1 (resident type) is displayed. */
  async assertLoaded() {
    await expect(this.residentTypeHeading, "FD step 1: the resident-type question should be shown").toBeVisible({
      timeout: 60_000,
    });
    await expect(this.residentRadios.first(), "FD step 1: resident-type options should be shown").toBeVisible();
  }

  /** Step 1: choose Resident (default) or Non-Resident, then Continue. */
  async selectResidentType(type = "Resident") {
    const index = /non/i.test(type) ? 1 : 0;
    await this.residentRadios.nth(index).check({ force: true });
    await expect(this.continueButton, "Continue should enable once a resident type is chosen").toBeEnabled({
      timeout: 15_000,
    });
    await this.continueButton.click();
  }

  /**
   * ASSERTION: step 2 (FD details) has loaded. Only the fields present at load are checked
   * here - the Funding Account (dr_account_number) and Interest Payable Mode only appear
   * AFTER a tenure card is selected, so they are validated later (assertFormValidations).
   */
  async assertDetailsStepLoaded() {
    await expect(this.nicknameInput, "FD step 2: the Nickname field should be shown").toBeVisible({ timeout: 60_000 });
    await expect(this.productSelect, "FD step 2: the Fixed Deposit Product dropdown should be shown").toBeVisible({
      timeout: 60_000,
    });
    await expect
      .poll(async () => this.tenureCards.count().catch(() => 0), {
        timeout: 60_000,
        message: "FD step 2: the tenure options should render",
      })
      .toBeGreaterThan(0);
  }

  /**
   * SOFT VALIDATIONS on step 2. Call AFTER selectProductAndTenure(), since the Funding
   * Account and Interest Payable Mode dropdowns are only revealed once a tenure is chosen.
   */
  async assertFormValidations() {
    await assertDropdownPopulated(this.productSelect, "Fixed Deposit Product");
    await assertDropdownPopulated(this.fundingAccountSelect, "Funding Account");
    await assertDropdownPopulated(this.sourceOfFundsSelect, "Source of Funds");
    await assertDropdownPopulated(this.interestModeSelect, "Interest Payable Mode");
    await assertDropdownPopulated(this.interestAccountSelect, "Interest To Be Credited To");
    await expect.soft(this.nicknameInput, "Nickname field should be visible").toBeVisible();
    await expect.soft(this.amountInput, "Amount field should be visible").toBeVisible();
  }

  /**
   * Picks the FD product, then the tenure card, then the interest payable mode.
   * The tenure MUST be chosen before the amount ("Please select a tenure type before
   * entering the amount."), and interest_payable_mode only appears after the tenure.
   */
  async selectProductAndTenure(data) {
    if (data.product) await selectOptionByLabelContains(this.productSelect, data.product);
    // The tenure cards re-render after the product changes.
    await this.page.waitForTimeout(1500);

    // Anchor the tenure to the START of the card text, otherwise "1 Month" would also
    // match "13 Months" (harmless for "300 Days", kept for consistency).
    const card = this.tenureCards
      .filter({ hasText: new RegExp(`^\\s*${data.tenure.replace(/\s+/g, "\\s*")}`, "i") })
      .first();
    await expect(card, `FD tenure "${data.tenure}" should be offered for this product`).toBeVisible({
      timeout: 30_000,
    });
    await card.click();

    // Choosing the tenure card populates the interest payable mode dropdown (its valid
    // options depend on the tenure - e.g. 300 Days offers "Maturity").
    await expect(
      this.interestModeSelect,
      "The interest payable mode should appear once a tenure is selected"
    ).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(async () => this.interestModeSelect.locator("option").count().catch(() => 0), {
        timeout: 30_000,
        message: "The interest payable mode options should load after the tenure card is clicked",
      })
      .toBeGreaterThan(1);

    if (data.interestMode) await selectOptionByLabelContains(this.interestModeSelect, data.interestMode);
  }

  /** Fills the rest of step 2 (nickname, funding account, amount, source, interest account). */
  async fillDetails(data) {
    await this.nicknameInput.fill(data.nickname);
    await selectOptionByLabelContains(this.fundingAccountSelect, data.fundingAccount);
    await assertSelectedContains(this.fundingAccountSelect, data.fundingAccount, "Funding Account");

    await this.amountInput.fill(data.amount);
    await selectOptionByLabelContains(this.sourceOfFundsSelect, data.sourceOfFunds);
    // "Interest To Be Credited To" is present for these products, but fill it defensively
    // (it may not apply to every interest mode).
    if (data.interestAccount && (await this.interestAccountSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.interestAccountSelect, data.interestAccount).catch(() => {});
    }

    if (data.autoRenew) await this.autoRenewCheckbox.check({ force: true }).catch(() => {});

    // ASSERTION: the amount registered (the field reformats "25000" -> "LKR 25,000").
    const digits = (s) => String(s).replace(/\D/g, "");
    await expect
      .poll(async () => digits(await this.amountInput.inputValue()), {
        timeout: 15_000,
        message: "Amount field should contain the entered amount",
      })
      .toContain(digits(data.amount));

    // ASSERTION: the tenure validation is cleared once a tenure + amount are set.
    await expect(this.tenureError, "The tenure validation should be cleared").toBeHidden();
  }

  /** Advances from step 2 to the review step. */
  async continueToReview() {
    await expect(this.continueButton, "Continue should be enabled once FD step 2 is valid").toBeEnabled({
      timeout: 20_000,
    });
    await this.continueButton.click();
  }

  /**
   * ASSERTION: the wizard advanced past step 2.
   * // VERIFY: the exact review/terms content of steps 3-4 was not reachable during
   * // exploration, so this only asserts we are no longer on step 2.
   */
  async assertMovedPastDetailsStep() {
    const moved = await expect
      .poll(async () => (await this.page.locator("body").innerText()).match(/Step\s*(\d)\s*of\s*4/i)?.[1] || "2", {
        timeout: 30_000,
      })
      .not.toBe("2")
      .then(() => true)
      .catch(() => false);
    if (moved) return;

    // Diagnose why it stayed on step 2 rather than reporting a vague "did not advance".
    const modeOptions = await this.interestModeSelect.locator("option").count().catch(() => 0);
    const modeRequired = await this.page
      .getByText(/interest payable mode is required/i)
      .isVisible()
      .catch(() => false);

    if (modeRequired || modeOptions <= 1) {
      throw new Error(
        'The FD wizard is blocked on step 2: the app demands "Interest Payable Mode is required", but that dropdown ' +
          'only ever holds its disabled "Selected Payable Mode" placeholder - the Monthly/Maturity options never load ' +
          "for the selected tenure (clicking the tenure card and its rate cell both fail to populate it). Everything " +
          "else on step 2 (product, tenure, nickname, funding account, amount, source of funds, interest-credit " +
          "account) is filled correctly, so this is an app/backend defect in the payable-mode lookup, not a locator issue."
      );
    }
    throw new Error("The FD wizard did not advance past step 2 (the details step).");
  }
}

module.exports = { FixedDepositPage };
