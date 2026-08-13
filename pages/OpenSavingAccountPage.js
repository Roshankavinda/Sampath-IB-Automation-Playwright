const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

/**
 * Open Saving Account (Quick Actions > "Open Saving Account" -> /dashboard/open-account).
 *
 * Confirmed against the live app: a 4-step wizard, "Welcome to Sampath Vishwa Self Account
 * Opening".
 *   Step 1 of 4 - "Are you a resident of Sri Lanka?" : input[name="residencyStatus"] radios
 *                 + Back | Continue.
 *   Step 2 of 4 - "Setup preferred account product." / "Select preferred Sampath account
 *                 product and ..." (two inputs; product pickers). // VERIFY steps 3-4.
 *
 * SAFETY: this opens a REAL bank account, so the flow is only walked far enough to validate
 * the wizard - it never completes the application.
 */
class OpenSavingAccountPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.url = "/SVRClientWebV4/dashboard/open-account";

    this.tile = page.getByRole("button", { name: /open saving.*account/i }).first();
    this.welcomeHeading = page.getByText(/welcome to sampath vishwa self account opening/i).first();
    this.residencyQuestion = page.getByText(/are you a resident of sri lanka/i).first();
    this.residencyRadios = page.locator('input[name="residencyStatus"]');
    this.stepIndicator = page.getByText(/step\s*\d+\s*of\s*4/i).first();

    this.continueButton = page.getByRole("button", { name: /^continue$/i }).first();
    this.backButton = page.getByRole("button", { name: /^back$/i }).first();

    // Step 2 - product selection. // VERIFY
    this.productStepHeading = page.getByText(/setup preferred account product|select preferred sampath account/i).first();
  }

  /** Opens the Open Saving Account wizard from the dashboard tile. */
  async open(dashboard) {
    if (dashboard && typeof dashboard.goToDashboard === "function") await dashboard.goToDashboard().catch(() => {});
    await expect(this.tile, "The 'Open Saving Account' quick action should be available").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await this.tile.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2500);
    if (!(await this.residencyQuestion.isVisible().catch(() => false))) {
      await this.page.goto(this.url, { waitUntil: "domcontentloaded" });
    }
    await this.assertLoaded();
  }

  /** ASSERTION: step 1 of the account-opening wizard is displayed. */
  async assertLoaded() {
    await expect(this.residencyQuestion, "Step 1 should ask the Sri Lanka residency question").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await expect(this.welcomeHeading, "The self-account-opening welcome text should be shown").toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await expect(this.stepIndicator, "A 'Step n of 4' indicator should be shown").toBeVisible();
  }

  /** SOFT VALIDATIONS: the residency options and wizard controls are present. */
  async assertStepOneValidations() {
    await expect
      .poll(async () => this.residencyRadios.count().catch(() => 0), {
        timeout: TIMEOUTS.LOAD,
        message: "The residency question should offer options",
      })
      .toBeGreaterThan(0);
    await expect.soft(this.continueButton, "A Continue button should be shown").toBeVisible();
  }

  /** Selects a residency option (index 0 = resident) and continues to step 2. */
  async selectResidencyAndContinue(index = 0) {
    await this.residencyRadios.nth(index).check({ force: true });
    await expect(this.continueButton, "Continue should be enabled once residency is chosen").toBeEnabled({
      timeout: TIMEOUTS.UI,
    });
    await this.continueButton.click();
    await this.page.waitForTimeout(3000);
  }

  /** ASSERTION: the wizard advanced to the product-selection step. */
  async assertProductStep() {
    await expect(this.productStepHeading, "Step 2 should ask for the preferred account product").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /** The current step number shown by the wizard ("Step 2 of 4" -> "2"). */
  async currentStep() {
    const text = (await this.stepIndicator.textContent().catch(() => "")) || "";
    return (text.match(/step\s*(\d+)/i) || [])[1] || "";
  }
}

module.exports = { OpenSavingAccountPage };
