const { test, expect } = require("../../utils/fixtures");
const { CreditCardPage } = require("../../pages/CreditCardPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Credit Card page — NEGATIVE / VALIDATION.
 *   N01 the page shows no loading error
 *   N02 no card tab renders a blank panel (records or an explicit empty state)
 *   N03 summary figures are valid currency (no NaN / undefined / placeholders)
 *   N04 the card number is MASKED - a full PAN must never be exposed
 *   N05 the page is not reachable without a session
 */
test.describe("Credit Card - Negative & Validation", () => {
  test("TC_CC_N01 - Verify that the Credit Card page shows no loading error", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    const error = page
      .getByText(/error loading|failed to load|something went wrong|unable to load/i)
      .locator("visible=true")
      .first();
    await expect(error, "The Credit Card page must not display a loading error").toBeHidden();
  });

  test("TC_CC_N02 - Verify that no card tab renders a blank panel", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    for (const tab of ["Pending", "Statement", "Unbilled", "Installments"]) {
      const opened = await cc.openTab(tab);
      if (!opened) continue;
      await cc.assertTabRendered(tab);
    }
  });

  test("TC_CC_N03 - Verify that summary figures are valid currency amounts", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.summaryHeading, "The summary block should be shown").toBeVisible();

    const text = await cc.summaryText();
    expect(text, "The summary should show currency amounts").toMatch(/LKR\s*-?[\d,]+\.\d{2}/);
    expect(text, "The summary must not show NaN/undefined/null placeholders").not.toMatch(/nan|undefined|null/i);
  });

  test("TC_CC_N04 - Verify that the card number is masked", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.cardMasked, "A masked card number should be shown").toBeVisible();

    const shown = (await cc.cardMasked.innerText().catch(() => "")) || "";
    expect(shown, `The card number "${shown}" should be masked with X's`).toMatch(/X{2,}/i);
    // The displayed card number must not contain 16 consecutive digits.
    // NOTE: the page legitimately shows a 16-digit CAN (Customer Account Number) elsewhere,
    // so this is scoped to the CARD element rather than scanning the whole page.
    expect(shown.replace(/\s/g, ""), "The card number must not expose 16 consecutive digits").not.toMatch(/\d{16}/);
  });

  test("TC_CC_N05 - Verify that the Credit Card page is not reachable without a session", async ({ page }) => {
    await page.goto("/SVRClientWebV4/dashboard/myaccount", { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(3000);
    const cc = new CreditCardPage(page);
    const cardShown = await cc.cardMasked.isVisible().catch(() => false);
    expect(cardShown, "Card details must not be visible without a valid session").toBeFalsy();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
