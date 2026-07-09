const { test } = require("../../utils/fixtures");
const { StopCardPage } = require("../../pages/StopCardPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, stopCard } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Stop Card (Credit / Debit / Web) — HAPPY PATH.
 * Login -> Quick Actions -> Stop Card -> card type -> card -> reason ->
 * Submit -> OTP -> success. Runs once per card type.
 */
test.describe("Stop Card - Happy Path", () => {
  const cases = [
    { id: "TC_STOPCARD_H01", label: "Credit", data: stopCard.credit },
    { id: "TC_STOPCARD_H02", label: "Debit", data: stopCard.debit },
    { id: "TC_STOPCARD_H03", label: "Web", data: stopCard.web },
  ];

  for (const { id, label, data } of cases) {
    test(`${id} - Stop a ${label} card`, async ({ page, loggedInDashboard }) => {
      const stop = new StopCardPage(page);
      const popup = new ConfirmationPopup(page);

      await test.step("Navigate to Stop Card via Quick Actions", async () => {
        await loggedInDashboard.goToStopCard();
        await stop.assertLoaded();
      });

      await test.step(`Fill the Stop Card details for a ${label} card`, async () => {
        await stop.fillForm(data);
      });

      await test.step("Submit and validate the OTP/confirmation popup", async () => {
        await stop.submit();
        await popup.assertVisible();
      });

      await test.step("Enter transaction OTP and confirm", async () => {
        await popup.enterOtpAndConfirm(credentials.otp);
      });

      await test.step("Validate the stop-card success confirmation", async () => {
        await popup.assertSuccess();
      });
    });
  }

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
