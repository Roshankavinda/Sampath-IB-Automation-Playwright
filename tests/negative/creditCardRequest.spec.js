const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { CreditCardPage } = require("../../pages/CreditCardPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Credit Card - Create Request — NEGATIVE / VALIDATION.
 *   N01 an empty request cannot be submitted
 *   N02 the request form can be dismissed without creating a request
 *
 * !! SAFETY !! A submitted request is a real service request - only INVALID/empty submissions
 * are attempted here, so a request can never actually be raised.
 */
test.describe("Credit Card - Create Request - Negative & Validation", () => {
  async function openRequestForm(page, loggedInDashboard) {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.createRequestAction, "A 'CREATE REQUEST' action should be offered").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await cc.createRequestAction.click({ force: true }).catch(() => {});
    await page.waitForTimeout(4000);
    return cc;
  }

  test("TC_CCREQ_N01 - Verify that an empty request cannot be submitted", async ({ page, loggedInDashboard }) => {
    await openRequestForm(page, loggedInDashboard);

    const submit = page.getByRole("button", { name: /^(submit|send|create|confirm)$/i }).locator("visible=true").first();
    const present = await submit.isVisible().catch(() => false);
    test.skip(!present, "The request form exposes no submit control to validate.");

    if (await submit.isEnabled().catch(() => false)) {
      await submit.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2500);
      const blocked = await page
        .getByText(/required|select|enter|invalid|choose/i)
        .locator("visible=true")
        .first()
        .isVisible()
        .catch(() => false);
      expect(blocked, "Submitting an empty request should raise a validation message").toBeTruthy();
    } else {
      await expect(submit, "Submit should stay disabled for an empty request").toBeDisabled();
    }
  });

  test("TC_CCREQ_N02 - Verify that the request form can be dismissed", async ({ page, loggedInDashboard }) => {
    const cc = await openRequestForm(page, loggedInDashboard);

    const cancel = page.getByRole("button", { name: /^(cancel|back|close|dismiss)$/i }).locator("visible=true").last();
    if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(3000);

    // Dismissing must return to the card page without raising a request.
    await expect(
      cc.breadcrumb.or(cc.createRequestAction),
      "Dismissing the request form should return to the Credit Card page"
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
