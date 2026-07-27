const { test } = require("../../utils/fixtures");
const { LoginPage } = require("../../pages/LoginPage");
const { DashboardPage } = require("../../pages/DashboardPage");
const { StopCardPage } = require("../../pages/StopCardPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, debitCardUser } = require("../../test-data/accounts");
const stopCard = require("../../test-data/stopCard");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Stop Card (Credit / Debit / Web) — POSITIVE (temporary block).
 * Login -> Quick Actions -> Stop Card -> pick card type -> click the card's STOP button ->
 * Confirm the "block this card?" modal -> OTP -> success. Runs once per card type.
 *
 * The Debit case logs in with the v11user8 profile (the account that has the debit card);
 * Credit and Web use the default gsuser4 profile.
 *
 * This is a REVERSIBLE temporary block ("You can unblock your card later"), gated by an OTP.
 */
test.describe("Stop Card - Positive", () => {
  const cases = [
    { id: "TC_STOPCARD_H01", label: "Credit", data: stopCard.credit, profile: credentials },
    { id: "TC_STOPCARD_H02", label: "Debit", data: stopCard.debit, profile: debitCardUser }, // v11user8
    { id: "TC_STOPCARD_H03", label: "Web", data: stopCard.web, profile: credentials },
  ];

  for (const { id, label, data, profile } of cases) {
    test(`${id} - Stop a ${label} card`, async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboard = new DashboardPage(page);
      const stop = new StopCardPage(page);
      const popup = new ConfirmationPopup(page);

      await test.step(`Log in as ${profile.username}`, async () => {
        await loginPage.login(profile.username, profile.password, profile.otp);
        await dashboard.assertLoaded();
      });

      await test.step("Navigate to Stop Card via Quick Actions", async () => {
        await stop.openWithRetry(dashboard);
        await stop.assertLoaded();
      });

      await test.step(`Select the ${label} card type and click STOP on the card`, async () => {
        await stop.selectCardType(data.cardType);
        await stop.clickStop(data.card);
      });

      await test.step("Confirm the temporary-block modal", async () => {
        await stop.confirmStop();
      });

      await test.step("Handle the OTP (if requested) and validate the card is now INACTIVE", async () => {
        const otpRequested = await popup.otpBoxes
          .first()
          .waitFor({ state: "visible", timeout: 12_000 })
          .then(() => true)
          .catch(() => false);
        if (otpRequested) {
          await popup.enterOtpAndConfirm(profile.otp);
        }
        // The app shows no success screen for a card block - success == the card flips to
        // INACTIVE in the list (and loses its STOP button).
        await stop.assertCardStopped();
      });
    });
  }

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
