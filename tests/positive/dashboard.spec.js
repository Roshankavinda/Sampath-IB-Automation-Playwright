const { test } = require("../../utils/fixtures");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Dashboard — POSITIVE ("Dashboard page all validations").
 * After a valid login, every key dashboard element is asserted from the UI.
 */
test.describe("Dashboard - Positive", () => {
  test("TC_DASH_H01 - Verify that Dashboard shows all key elements after login", async ({ loggedInDashboard }) => {
    await test.step("Validate the top nav, account summary, account tiles and logout", async () => {
      await loggedInDashboard.assertAllValidations();
    });

    await test.step("Validate the in-scope Quick Actions are listed", async () => {
      await loggedInDashboard.assertQuickActionItems(["Send Money", "Bill Payment", "Stop Card"]);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
