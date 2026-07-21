const { test } = require("../../utils/fixtures");
const { LoginPage } = require("../../pages/LoginPage");
const { DashboardPage } = require("../../pages/DashboardPage");
const { WebCardPage } = require("../../pages/WebCardPage");
const { webCard } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Web Card Opening — NEGATIVE / VALIDATION.
 * On step 1 of the Apply Web Card modal, "Next" must stay disabled until a resident type
 * is chosen.
 */
test.describe("Web Card Opening - Negative & Validation", () => {
  test("TC_WEBCARD_N01 - Next stays disabled until a resident type is chosen", async ({ page }) => {
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

    await test.step("With no resident type chosen, 'Next' must be disabled", async () => {
      await web.assertResidentStep();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
