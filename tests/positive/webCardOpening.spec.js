const { test } = require("../../utils/fixtures");
const { LoginPage } = require("../../pages/LoginPage");
const { DashboardPage } = require("../../pages/DashboardPage");
const { WebCardPage } = require("../../pages/WebCardPage");
const { webCard } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Web Card Opening ("Apply Web Card") — POSITIVE.
 * Uses a SEPARATE, web-card-eligible profile (webCard.username), not the default account.
 * Login -> dashboard "Apply Web Card" tile -> modal: resident type -> terms ->
 * agreement + OTP -> Confirm -> success.
 */
test.describe("Web Card Opening - Positive", () => {
  test("TC_WEBCARD_H01 - Apply for a web card", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);
    const web = new WebCardPage(page);

    await test.step("Log in as the web-card-eligible profile", async () => {
      await loginPage.login(webCard.username, webCard.password, webCard.otp);
      await dashboard.assertLoaded();
    });

    await test.step("Open the Apply Web Card modal", async () => {
      await web.openApply();
    });

    await test.step(`Step 1: choose resident type (${webCard.residentType})`, async () => {
      await web.assertResidentStep();
      await web.selectResidentAndContinue(webCard.residentType);
    });

    await test.step("Step 2: review the web card terms and continue", async () => {
      await web.assertTermsStep();
      await web.continueThroughTerms();
    });

    await test.step("Step 3: the agreement + OTP step is reached", async () => {
      await web.assertAgreementOtpStep();
    });

    await test.step("Accept the agreement and confirm with the OTP", async () => {
      await web.acceptAgreementAndConfirm(webCard.otp);
    });

    await test.step("Validate the web card application success", async () => {
      await web.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
