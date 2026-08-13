const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Cross-cutting behaviour — NEGATIVE / RESILIENCE.
 *   N01 protected routes are not reachable without a session
 *   N02 an unknown route shows the app's 404, not a crash
 *   N03 the dashboard is usable at a small (mobile) viewport
 *   N04 browser Back after navigating keeps the session usable
 *   N05 "Old Vishwa" listings are offered and state their read-only nature
 */
test.describe("Cross-cutting - Negative & Resilience", () => {
  const PROTECTED = ["dashboard/settings", "dashboard/sendmoney", "dashboard/billpayment"];

  test("TC_XC_N01 - Verify that protected routes are not reachable without a session", async ({ page }) => {
    for (const route of PROTECTED) {
      await page.goto(`/SVRClientWebV4/${route}`, { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForTimeout(2500);
      // No account data may be exposed without logging in.
      const balance = await page
        .getByText(/(lkr|usd)\s*[\d,]+\.\d{2}/i)
        .first()
        .isVisible()
        .catch(() => false);
      expect(balance, `"${route}" must not expose balances without a session`).toBeFalsy();
    }
  });

  test("TC_XC_N02 - Verify that an unknown route shows a 404 rather than crashing", async ({ page }) => {
    const resp = await page
      .goto("/SVRClientWebV4/dashboard/zzz-no-such-page", { waitUntil: "domcontentloaded" })
      .catch(() => null);
    await page.waitForTimeout(2000);
    const body = (await page.locator("body").innerText().catch(() => "")) || "";
    expect(
      /404|not found/i.test(body) || (resp && resp.status() === 404),
      "An unknown route should render the app's 404 page"
    ).toBeTruthy();
  });

  test("TC_XC_N03 - Verify that the dashboard is usable at a mobile viewport", async ({ page, loggedInDashboard }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(2500);
    // The core landmarks must still render (no horizontal collapse into nothing).
    await expect(
      page.getByRole("heading", { name: /quick actions/i }).first(),
      "Quick Actions should still render on a small viewport"
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("TC_XC_N04 - Verify that browser Back keeps the session usable", async ({ page, loggedInDashboard }) => {
    await loggedInDashboard.goToSendMoney();
    await page.waitForTimeout(2500);
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(3000);

    // After going back the app must still be authenticated (not bounced to login).
    const onLogin = await page.locator('input[name="username"]').first().isVisible().catch(() => false);
    expect(onLogin, "Browser Back must not log the user out").toBeFalsy();
  });

  test("TC_XC_N05 - Verify that Old Vishwa listings are offered as read-only", async ({ page, loggedInDashboard }) => {
    await loggedInDashboard.goToSavedPayees();
    await page.waitForTimeout(2500);
    const oldVishwa = page.getByRole("button", { name: /old vishwa saved payees/i }).first();
    test.skip(!(await oldVishwa.isVisible().catch(() => false)), "No 'Old Vishwa Saved Payees' control on this page.");

    await oldVishwa.click({ force: true }).catch(() => {});
    await page.waitForTimeout(3000);
    // The app states these are reference-only and must be re-saved in New Vishwa.
    const rows = await page.locator("table tbody tr").count().catch(() => 0);
    const note = await page
      .getByText(/reference only|save them again|new vishwa|no .*(found|data)/i)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    expect(rows > 0 || note, "Old Vishwa listings should show entries or explain their read-only status").toBeTruthy();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
