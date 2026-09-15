const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { CreditCardPage } = require("../../pages/CreditCardPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Credit Card - Block Card — NEGATIVE / VALIDATION.
 *   N01 blocking is GUARDED - it never applies straight from a single click
 *   N02 cancelling the confirmation leaves the card's state unchanged
 *
 * !! SAFETY !! No test here ever confirms a block/unblock.
 */
test.describe("Credit Card - Block Card - Negative & Validation", () => {
  test("TC_CCBLK_N01 - Verify that blocking is guarded by a confirmation", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.blockCardAction, "A BLOCK/UNBLOCK CARD action should be offered").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });

    const before = (await cc.blockCardAction.innerText().catch(() => "")) || "";
    await cc.blockCardAction.click({ force: true }).catch(() => {});
    await page.waitForTimeout(3000);

    // A single click must NOT have applied the change - the action's label must not have
    // flipped without a confirmation being shown.
    const confirmShown = await page
      .getByText(/are you sure|confirm|otp|proceed|cancel/i)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    const after = (await cc.blockCardAction.innerText().catch(() => "")) || "";
    expect(
      confirmShown || before === after,
      "Blocking/unblocking must be confirmed before it is applied - it must not toggle on a single click"
    ).toBeTruthy();

    // Leave the card untouched.
    const cancel = page.getByRole("button", { name: /^(cancel|no|back|close|dismiss)$/i }).locator("visible=true").last();
    if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
  });

  test("TC_CCBLK_N02 - Verify that cancelling leaves the card state unchanged", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.blockCardAction).toBeVisible({ timeout: TIMEOUTS.LOAD });

    const before = await cc.isCardBlocked();
    await cc.blockCardAction.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2500);

    const cancel = page.getByRole("button", { name: /^(cancel|no|back|close|dismiss)$/i }).locator("visible=true").last();
    if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(3000);

    const after = await cc.isCardBlocked();
    expect(after, `Cancelling must leave the card ${before ? "blocked" : "active"} as it was`).toBe(before);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
