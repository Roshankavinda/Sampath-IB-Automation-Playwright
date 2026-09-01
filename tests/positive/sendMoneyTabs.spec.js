const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Send Money screen - TABS & ENTRY POINTS — POSITIVE.
 * Method tabs: Send Money | Saved Payees | Transaction History.
 * Type tabs:   Own Account | Other Accounts | Other Credit Cards | Mobile Cash.
 *
 * VIEW ONLY - a form is opened per tab, but nothing is ever submitted.
 */
const TYPE_TABS = ["Own Account", "Other Accounts", "Other Credit Cards", "Mobile Cash"];

test.describe("Send Money Tabs - Positive", () => {
  async function open(page, loggedInDashboard) {
    const sendMoney = new SendMoneyPage(page);
    await loggedInDashboard.goToSendMoney();
    await sendMoney.assertLoaded();
    return sendMoney;
  }

  test("TC_SM_H01 - Verify that all Send Money tabs are offered", async ({ page, loggedInDashboard }) => {
    const sendMoney = await open(page, loggedInDashboard);
    await sendMoney.assertTabsOffered();
  });

  test("TC_SM_H02 - Verify that each transfer type tab opens its own form", async ({ page, loggedInDashboard }) => {
    const sendMoney = await open(page, loggedInDashboard);

    for (const tabName of TYPE_TABS) {
      await test.step(`Open the "${tabName}" tab`, async () => {
        const opened = await sendMoney.openTab(tabName);
        expect(opened, `The "${tabName}" tab should open its own form`).toBeTruthy();
        await sendMoney.assertTabOpen(tabName);
      });
    }
  });

  test("TC_SM_H03 - Verify that each method tab opens its own screen", async ({ page, loggedInDashboard }) => {
    const sendMoney = await open(page, loggedInDashboard);

    for (const tabName of ["Saved Payees", "Transaction History"]) {
      await test.step(`Open the "${tabName}" tab`, async () => {
        const opened = await sendMoney.openTab(tabName);
        expect(opened, `The "${tabName}" tab should open its own screen`).toBeTruthy();
      });
    }

    await test.step("Return to the transfer forms", async () => {
      const back = await sendMoney.openTab("Own Account");
      expect(back, "The Own Account form should be reachable again after browsing the method tabs").toBeTruthy();
    });
  });

  test("TC_SM_H04 - Verify that tabs can be switched back and forth", async ({ page, loggedInDashboard }) => {
    const sendMoney = await open(page, loggedInDashboard);

    for (const tabName of ["Own Account", "Mobile Cash", "Own Account", "Other Accounts", "Own Account"]) {
      const opened = await sendMoney.openTab(tabName);
      expect(opened, `"${tabName}" should still open after switching back and forth`).toBeTruthy();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
