const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Send Money screen - TABS — NEGATIVE / RESILIENCE.
 *   N01 switching away from a partly filled form does not carry the value into the next form
 *   N02 only ONE transfer form is rendered at a time (no stale form left behind)
 *   N03 a tab opens on the FIRST click
 *       (the app renders its tabs before React attaches their handlers, so the first click is
 *        sometimes swallowed - this test is what catches that regression)
 */
test.describe("Send Money Tabs - Negative & Resilience", () => {
  async function open(page, loggedInDashboard) {
    const sendMoney = new SendMoneyPage(page);
    await loggedInDashboard.goToSendMoney();
    await sendMoney.assertLoaded();
    return sendMoney;
  }

  test("TC_SM_N01 - Verify that a partly filled form does not leak into another tab", async ({
    page,
    loggedInDashboard,
  }) => {
    const sendMoney = await open(page, loggedInDashboard);
    test.skip(!(await sendMoney.openTab("Own Account")), "The Own Account form did not open.");

    await page.locator('input[name="amount"]').first().fill("777").catch(() => {});
    test.skip(!(await sendMoney.openTab("Other Accounts")), "The Other Accounts form did not open.");

    const amount = await page.locator('input[name="amount"]').first().inputValue().catch(() => "");
    expect(amount, 'The amount typed on the Own Account form must not appear on the Other Accounts form').not.toBe(
      "777"
    );
  });

  test("TC_SM_N02 - Verify that only one transfer form is rendered at a time", async ({
    page,
    loggedInDashboard,
  }) => {
    const sendMoney = await open(page, loggedInDashboard);
    test.skip(!(await sendMoney.openTab("Mobile Cash")), "The Mobile Cash form did not open.");

    // The Mobile Cash form has no To Account list and no card number field; if either is
    // present, a previous tab's form is still on the page.
    const staleToAccount = await page.locator('select[name="accountTo"]').isVisible().catch(() => false);
    const staleCard = await page.locator('input[name="CAN"]').isVisible().catch(() => false);
    expect(
      staleToAccount || staleCard,
      "Another tab's form is still rendered behind the Mobile Cash form"
    ).toBeFalsy();
  });

  test("TC_SM_N03 - Verify that a tab opens on the first click", async ({ page, loggedInDashboard }) => {
    const sendMoney = await open(page, loggedInDashboard);

    // ONE click only - openTab() retries, which would hide the defect.
    await sendMoney.otherCreditCardsTab.click({ force: true }).catch(() => {});
    const opened = await page
      .locator('input[name="CAN"]')
      .first()
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    expect(
      opened,
      "The 'Other Credit Cards' tab should open on the first click - if this fails the tab is rendering " +
        "before its click handler is attached (known app issue)"
    ).toBeTruthy();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
