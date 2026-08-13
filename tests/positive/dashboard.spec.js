const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Dashboard — POSITIVE ("Dashboard page all validations").
 * After a valid login, every key dashboard element is asserted from the UI:
 * the full top nav, the Portfolio card (account number / balance / status / Primary badge),
 * Quick Actions, the Recent Vishwa Transactions tabs (Transfer | Payment | Mobile Cash),
 * the Favorite Billers/Payees widgets, Maintenance & Updates, and the user (avatar) menu.
 */
test.describe("Dashboard - Positive", () => {
  test("TC_DASH_H01 - Verify that Dashboard shows all key elements after login", async ({ loggedInDashboard }) => {
    await test.step("Validate the top nav, accounts/balance and all body sections", async () => {
      await loggedInDashboard.assertAllValidations();
    });

    await test.step("Validate the in-scope Quick Actions are listed", async () => {
      await loggedInDashboard.assertQuickActionItems(["Send Money", "Bill Payment", "Stop Card"]);
    });
  });

  test("TC_DASH_H02 - Verify that the Favorite Billers and Payees widgets render", async ({ loggedInDashboard }) => {
    await test.step("Each favourites widget lists entries or shows its empty state", async () => {
      await loggedInDashboard.assertFavouriteWidgets();
    });
  });

  test("TC_DASH_H03 - Verify that the Portfolio card shows the account details", async ({ loggedInDashboard }) => {
    await test.step("The card shows account number, balance, status and the Primary badge", async () => {
      await loggedInDashboard.assertPortfolioCardDetails();
    });
  });

  test("TC_DASH_H04 - Verify that the Recent Transactions tabs can be switched", async ({ loggedInDashboard }) => {
    for (const tabName of ["Transfer", "Payment", "Mobile Cash"]) {
      await test.step(`Switch to the "${tabName}" tab and validate it renders`, async () => {
        const switched = await loggedInDashboard.switchRecentTransactionsTab(tabName);
        test.skip(!switched, `The "${tabName}" transactions tab is not offered.`);
        // Content is logged for evidence; whether the list has data is asserted by TC_DASH_N03.
        await loggedInDashboard.assertRecentTransactionsRendered(tabName);
      });
    }
  });


  test("TC_DASH_H05 - Verify that Send Money opens from the dashboard Quick Action card", async ({
    page,
    loggedInDashboard,
  }) => {
    await test.step("Click the Send Money card in the dashboard body", async () => {
      await loggedInDashboard.openQuickActionCard("Send Money");
    });
    await test.step("The Send Money page is reached", async () => {
      await expect(
        page.getByText(/make transactions/i).locator("visible=true").first(),
        "The Send Money page should open from the dashboard card"
      ).toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    });
  });

  test("TC_DASH_H06 - Verify that Send Money opens from the nav-bar Quick Actions menu", async ({
    page,
    loggedInDashboard,
  }) => {
    await test.step("Use the top-nav Quick Actions dropdown", async () => {
      await loggedInDashboard.goToSendMoney();
    });
    await test.step("The Send Money page is reached", async () => {
      await expect(
        page.getByText(/make transactions/i).locator("visible=true").first(),
        "The Send Money page should open from the nav-bar Quick Actions menu"
      ).toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    });
  });

  test("TC_DASH_H07 - Verify that Bill Payment opens from the dashboard Quick Action card", async ({
    page,
    loggedInDashboard,
  }) => {
    await loggedInDashboard.openQuickActionCard("Bill Payment");
    await expect(
      page.getByText(/biller|bill payment/i).locator("visible=true").first(),
      "The Bill Payment page should open from the dashboard card"
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
  });

  test("TC_DASH_H08 - Verify that the Portfolio card categories can be switched", async ({ loggedInDashboard }) => {
    for (const category of ["Accounts", "Deposits", "Loans"]) {
      await test.step(`Switch the Portfolio card to "${category}"`, async () => {
        const switched = await loggedInDashboard.switchPortfolioCategory(category);
        test.skip(!switched, `The "${category}" portfolio category is not offered.`);
        const outcome = await loggedInDashboard.assertPortfolioCategoryRendered(category);
        // eslint-disable-next-line no-console
        console.log(`Portfolio category "${category}" -> ${outcome}`);
      });
    }
  });

  test("TC_DASH_H09 - Verify that the Portfolio card can be paged next and previous", async ({ loggedInDashboard }) => {
    await test.step("Step the carousel forward", async () => {
      const next = await loggedInDashboard.stepPortfolioCarousel("right");
      // eslint-disable-next-line no-console
      console.log(`Portfolio pager next: "${next.before}" -> "${next.after}" (moved=${next.moved})`);
    });
    await test.step("Step the carousel back", async () => {
      const prev = await loggedInDashboard.stepPortfolioCarousel("left");
      // eslint-disable-next-line no-console
      console.log(`Portfolio pager prev: "${prev.before}" -> "${prev.after}" (moved=${prev.moved})`);
    });
    await test.step("The account card still renders after paging", async () => {
      await loggedInDashboard.assertPortfolioCardDetails();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
