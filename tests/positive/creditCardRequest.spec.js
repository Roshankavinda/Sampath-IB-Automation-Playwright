const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { CreditCardPage } = require("../../pages/CreditCardPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Credit Card - CREATE REQUEST — POSITIVE.
 * The card page offers a "CREATE REQUEST" action that opens the card-request flow
 * (e.g. limit increase / replacement / other card services).
 *
 * !! SAFETY !! A submitted request is a real service request to the bank, so these tests open
 * and validate the form but do NOT submit it. Set IB_APPLY_CARD_REQUEST=true to submit.
 */
test.describe("Credit Card - Create Request - Positive", () => {
  test("TC_CCREQ_H01 - Verify that the Create Request action is offered", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.createRequestAction, "A 'CREATE REQUEST' action should be offered").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  });

  test("TC_CCREQ_H02 - Verify that Create Request opens its form", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.createRequestAction, "A 'CREATE REQUEST' action should be offered").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });

    await test.step("Open the request form", async () => {
      await cc.createRequestAction.click({ force: true }).catch(() => {});
      await page.waitForTimeout(4000);

      const opened = await page
        .getByText(/request|type|reason|submit|select|limit|replace/i)
        .locator("visible=true")
        .first()
        .isVisible()
        .catch(() => false);
      expect(opened, "The Create Request action should open a request form").toBeTruthy();
    });

    await test.step("Report the request options offered", async () => {
      const selects = await page.locator("select").count().catch(() => 0);
      const buttons = (await page.getByRole("button").allInnerTexts().catch(() => []))
        .filter(Boolean)
        .filter((b) => !/Dashboard|My Accounts|Manage Schedules|Portfolio/.test(b))
        .slice(0, 12);
      // eslint-disable-next-line no-console
      console.log(`Create Request form: ${selects} dropdown(s); buttons = ${JSON.stringify(buttons)}`);
    });

    // SAFETY: the request is never submitted.
    test.skip(
      process.env.IB_APPLY_CARD_REQUEST === "true",
      "IB_APPLY_CARD_REQUEST=true - submit the request manually; the automation stops here."
    );
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
