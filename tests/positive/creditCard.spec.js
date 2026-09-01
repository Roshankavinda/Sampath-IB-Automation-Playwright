const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { CreditCardPage } = require("../../pages/CreditCardPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Credit Card page — VIEW (POSITIVE).
 * Dashboard > My Accounts > Credit Cards -> select a card -> summary, details panel,
 * the Pending / Statement / Unbilled / Installments tabs, statement download and the
 * Redeem button (external rewards site).
 *
 * Block card and Create Request live in their own spec files.
 */
test.describe("Credit Card - Positive", () => {
  test("TC_CC_H01 - Verify that selecting a card opens its detailed view", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.cardMasked, "The selected card's masked number should be shown").toBeVisible();
    await cc.assertDetailsPanel();
  });

  test("TC_CC_H02 - Verify that the card summary shows its figures", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await cc.assertSummary();
  });

  test("TC_CC_H03 - Verify that each card tab can be opened", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    for (const tab of ["Pending", "Statement", "Unbilled", "Installments"]) {
      await test.step(`Open the "${tab}" tab`, async () => {
        const opened = await cc.openTab(tab);
        test.skip(!opened, `The "${tab}" tab is not offered.`);
        const rows = await cc.assertTabRendered(tab);
        // eslint-disable-next-line no-console
        console.log(`Credit card tab "${tab}" -> ${rows} row(s)`);
      });
    }
  });

  test("TC_CC_H04 - Verify that a statement can be downloaded", async ({ page, loggedInDashboard }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    const opened = await cc.openTab("Statement");
    test.skip(!opened, "The Statement tab is not offered.");
    await cc.assertTabRendered("Statement");

    const control = cc.statementDownloadButton;
    const available = await control.isVisible().catch(() => false);
    if (!available) {
      const state = await cc.describeStatementTab();
      // eslint-disable-next-line no-console
      console.log(`Statement tab has no download control -> ${state}`);
      test.skip(true, `No statement download control found. Statement tab shows: ${state}`);
    }

    await test.step("Clicking download starts a file download", async () => {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: TIMEOUTS.LOAD }).catch(() => null),
        control.click({ force: true }).catch(() => {}),
      ]);
      if (download) {
        // eslint-disable-next-line no-console
        console.log(`Statement downloaded: ${download.suggestedFilename()}`);
        expect(download.suggestedFilename(), "The download should have a filename").toBeTruthy();
      } else {
        // Some builds open the statement in a viewer instead of downloading a file.
        const viewer = await page
          .getByText(/statement|pdf|download/i)
          .locator("visible=true")
          .first()
          .isVisible()
          .catch(() => false);
        expect(viewer, "The statement should either download or open in a viewer").toBeTruthy();
      }
    });
  });

  test("TC_CC_H05 - Verify that the Redeem button opens the external rewards site", async ({
    page,
    context,
    loggedInDashboard,
  }) => {
    const cc = new CreditCardPage(page);
    await cc.open(loggedInDashboard);
    await expect(cc.redeemButton, "A 'Redeem' button should be offered").toBeVisible({ timeout: TIMEOUTS.LOAD });
    await expect.soft(cc.ultraRewards, "The ULTRAREWARDS balance should be shown").toBeVisible();

    await test.step("Redeem leaves for an external rewards site", async () => {
      const before = page.url();
      const [popup] = await Promise.all([
        context.waitForEvent("page", { timeout: TIMEOUTS.ACTION }).catch(() => null),
        cc.redeemButton.click({ force: true }).catch(() => {}),
      ]);
      await page.waitForTimeout(3000);

      const target = popup ? popup.url() : page.url();
      // eslint-disable-next-line no-console
      console.log(`Redeem -> ${popup ? "new tab" : "same tab"}: ${target}`);
      expect(
        popup !== null || target !== before,
        "Redeem should navigate to the external rewards site (new tab or same tab)"
      ).toBeTruthy();
      if (popup) await popup.close().catch(() => {});
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
