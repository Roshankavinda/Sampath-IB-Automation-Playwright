const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

/**
 * Credit Card page (My Accounts > Credit Cards -> /dashboard/myaccount).
 *
 * Confirmed against the live app after selecting a card:
 *   Carousel  : "Credit Cards" | "Web Card" tabs, cards showing the masked number
 *               ("4375 09XX XXXX 0199"), status, Available balance, CAN and Expiry, pager "1/3".
 *   Summary   : "All Cards Summary" - Your Credit Limit / Available to spend / Last Statement /
 *               Unbilled / Installment.
 *   Rewards   : ULTRAREWARDS + ULTRAMILES balances with a "Redeem" button (external site).
 *   Actions   : "BLOCK CARD" / "UNBLOCK CARD" (toggles with the card's state) and
 *               "CREATE REQUEST".
 *   Details   : "Credit Card Details" - Card Number, Customer Account Number, Expiry Date,
 *               Card Status, Card Type, Available Balance - plus Recent Transactions + Settle.
 *   Tabs      : Pending | Statement | Unbilled | Installments.
 *
 * !! SAFETY !! Block/Unblock changes the real card's state and Redeem leaves for an external
 * rewards site, so those actions are only ever verified as reachable - never committed.
 */
class CreditCardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    this.breadcrumb = page.getByText(/accounts \/ credit cards/i).first();
    this.creditCardsTab = page.getByText("Credit Cards", { exact: true }).locator("visible=true").first();
    this.webCardTab = page.getByText("Web Card", { exact: true }).locator("visible=true").first();
    this.cardMasked = page.getByText(/\d{4}\s*\d{2}XX\s*XXXX\s*\d{4}/).locator("visible=true").first();
    this.pager = page.getByText(/^\d+\/\d+$/).locator("visible=true").first();

    // Summary block.
    this.summaryHeading = page.getByText(/all cards summary/i).first();
    this.creditLimit = page.getByText(/your credit limit/i).first();
    this.availableToSpend = page.getByText(/available to spend/i).first();
    this.lastStatement = page.getByText(/last statement/i).first();
    this.unbilledSummary = page.getByText(/^unbilled$/i).locator("visible=true").first();
    this.installmentSummary = page.getByText(/^installment$/i).locator("visible=true").first();

    // Rewards / Redeem (external site).
    this.redeemButton = page.getByRole("button", { name: /^redeem$/i }).first();
    // ULTRAREWARDS / ULTRAMILES render as IMAGES with alt text, not as text nodes.
    this.ultraRewards = page.getByRole("img", { name: /ultrarewards/i }).first();
    this.ultraMiles = page.getByRole("img", { name: /ultramiles/i }).first();

    // Card actions.
    this.blockCardAction = page.getByText(/^\s*(un)?block card\s*$/i).locator("visible=true").first();
    this.createRequestAction = page.getByText(/create request/i).locator("visible=true").first();
    this.settleButton = page.getByRole("button", { name: /^settle$/i }).first();

    // Details panel.
    this.detailsHeading = page.getByText(/credit card details/i).first();
    this.recentTransactions = page.getByText(/recent transactions/i).first();

    // Tabs.
    this.pendingTab = page.getByRole("button", { name: /^pending$/i }).first();
    this.statementTab = page.getByRole("button", { name: /^statement$/i }).first();
    this.unbilledTab = page.getByRole("button", { name: /^unbilled$/i }).first();
    this.installmentsTab = page.getByRole("button", { name: /^installments?$/i }).first();

    this.rows = page.locator("table tbody tr");
    this.emptyState = page.getByText(/no data found|no .*(records|transactions)/i).locator("visible=true").first();
  }

  /** Opens My Accounts > Credit Cards and selects the first card. */
  async open(dashboard) {
    await dashboard.goToCreditCards();
    await expect(this.breadcrumb, "The Credit Cards page should be displayed").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await this.page.waitForTimeout(3000);
    await this.selectCard();
  }

  /** Selects a card in the carousel to expand its detailed view. */
  async selectCard(partial) {
    const card = partial
      ? this.page.getByText(new RegExp(partial.replace(/\s+/g, "\\s*"), "i")).locator("visible=true").first()
      : this.cardMasked;
    await expect(card, `A credit card${partial ? ` matching "${partial}"` : ""} should be listed`).toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await card.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(3500);
  }

  /** SOFT ASSERTIONS: the "All Cards Summary" block shows its figures. */
  async assertSummary() {
    await expect(this.summaryHeading, "The 'All Cards Summary' block should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect.soft(this.creditLimit, "'Your Credit Limit' should be shown").toBeVisible();
    await expect.soft(this.availableToSpend, "'Available to spend' should be shown").toBeVisible();
    await expect.soft(this.lastStatement, "'Last Statement' should be shown").toBeVisible();
    // The summary figures must be real amounts, not placeholders.
    const text = (await this.summaryHeading.locator("xpath=..").innerText().catch(() => "")) || "";
    expect(text, "The summary should show currency amounts").toMatch(/LKR\s*-?[\d,]+\.\d{2}/);
    expect(text, "The summary must not show NaN/undefined").not.toMatch(/nan|undefined|null/i);
  }

  /** SOFT ASSERTIONS: the Credit Card Details panel lists the card's fields. */
  async assertDetailsPanel() {
    await expect(this.detailsHeading, "The 'Credit Card Details' panel should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    for (const field of ["Card Number", "Expiry Date", "Card Status", "Card Type", "Available Balance"]) {
      await expect
        .soft(this.page.getByText(new RegExp(field, "i")).locator("visible=true").first(), `Field "${field}"`)
        .toBeVisible();
    }
  }

  /** The tab locator by name. */
  tab(name) {
    if (/statement/i.test(name)) return this.statementTab;
    if (/unbilled/i.test(name)) return this.unbilledTab;
    if (/instal/i.test(name)) return this.installmentsTab;
    return this.pendingTab;
  }

  /** Opens one of the Pending | Statement | Unbilled | Installments tabs. */
  async openTab(name) {
    const tab = this.tab(name);
    if (!(await tab.isVisible().catch(() => false))) return false;
    await tab.click({ force: true });
    await this.page.waitForTimeout(3000);
    return true;
  }

  /** ASSERTION: the open tab shows rows or an explicit empty state (polls the async render). */
  async assertTabRendered(name) {
    let rows = 0;
    let empty = false;
    for (let i = 0; i < 12; i++) {
      rows = await this.rows.count().catch(() => 0);
      empty = await this.emptyState.isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    expect(rows > 0 || empty, `The "${name}" tab should show records or an explicit empty state`).toBeTruthy();
    return rows;
  }

  /**
   * The statement download control on the Statement tab. It has not been observable in this
   * environment (the Statement tab renders no rows/columns), so this matches broadly: a
   * button OR link carrying a download/PDF icon, alt text or label.
   * // VERIFY against a card whose Statement tab actually renders.
   */
  get statementDownloadButton() {
    return this.page
      .locator(
        'button:has(img[srcset*="Downlaod" i]), button:has(img[srcset*="download" i]), ' +
          'button:has(img[alt*="download" i]), a:has(img[alt*="download" i]), ' +
          'button:has(svg[class*="download" i]), a[download], a[href$=".pdf"]'
      )
      .first()
      .or(this.page.getByRole("button", { name: /download|statement|pdf/i }).first())
      .or(this.page.getByRole("link", { name: /download|statement|pdf/i }).first());
  }

  /** Describes what the Statement tab currently shows - used to explain a skip precisely. */
  async describeStatementTab() {
    const rows = await this.rows.count().catch(() => 0);
    const cols = (await this.page.getByRole("columnheader").allInnerTexts().catch(() => [])).filter(Boolean);
    const buttons = (await this.page.getByRole("button").allInnerTexts().catch(() => []))
      .filter(Boolean)
      .filter((b) => !/Dashboard|My Accounts|Manage Schedules|Portfolio/.test(b));
    return `rows=${rows}, columns=${JSON.stringify(cols)}, buttons=${JSON.stringify(buttons)}`;
  }

  /** True if the currently selected card is blocked (the action reads "UNBLOCK CARD"). */
  async isCardBlocked() {
    const text = (await this.blockCardAction.innerText().catch(() => "")) || "";
    return /unblock/i.test(text);
  }
}

module.exports = { CreditCardPage };
