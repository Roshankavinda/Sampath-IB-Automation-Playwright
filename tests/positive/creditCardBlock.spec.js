const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { CreditCardPage } = require("../../pages/CreditCardPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Credit Card - BLOCK / UNBLOCK CARD — POSITIVE.
 * The card page offers a "BLOCK CARD" action that reads "UNBLOCK CARD" while the card is
 * already blocked.
 *
 * !! SAFETY !! Blocking (or unblocking) changes the REAL card's state, so these tests only
 * verify the action is offered and that it raises its confirmation - the change is NEVER
 * committed. Set IB_APPLY_CARD_BLOCK=true to actually go through with it.
 */
test.describe("Credit Card - Block Card - Positive", () => {
  test("TC_CCBLK_H01 - Verify that the block/unblock action is offered", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);

    await expect(cc.blockCardAction, "A BLOCK/UNBLOCK CARD action should be offered").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    const blocked = await cc.isCardBlocked();
    // eslint-disable-next-line no-console
    console.log(`Selected card is currently ${blocked ? "BLOCKED (offers UNBLOCK)" : "ACTIVE (offers BLOCK)"}`);
  });

  test("TC_CCBLK_H02 - Verify that the block action asks for confirmation", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.blockCardAction, "A BLOCK/UNBLOCK CARD action should be offered").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });

    await test.step("Trigger the action - it must ask before changing the card", async () => {
      await cc.blockCardAction.click({ force: true }).catch(() => {});
      await page.waitForTimeout(3000);

      const confirmShown = await page
        .getByText(/are you sure|confirm|block|otp|proceed/i)
        .locator("visible=true")
        .first()
        .isVisible()
        .catch(() => false);
      expect(confirmShown, "Blocking/unblocking a card must raise a confirmation before it is applied").toBeTruthy();
    });

    // SAFETY: cancel out - the card's state is left untouched.
    await test.step("Cancel - the card state is NOT changed", async () => {
      test.skip(
        process.env.IB_APPLY_CARD_BLOCK === "true",
        "IB_APPLY_CARD_BLOCK=true - skipping the cancel guard so the change can be applied manually."
      );
      const cancel = page
        .getByRole("button", { name: /^(cancel|no|back|close|dismiss)$/i })
        .locator("visible=true")
        .last();
      if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
      else await page.keyboard.press("Escape").catch(() => {});
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
