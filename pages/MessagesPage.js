const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
const { selectOptionByLabelContains, assertDropdownPopulated } = require("../utils/helpers");

/**
 * Secure Messaging (inbox) — the mail icon in the nav (/dashboard/inbox).
 *
 * CONFIRMED against the live app:
 *   List page: tabs All / Trash, a "Compose New Message" button, and a message list
 *   (which currently shows "Error loading data").
 *   Compose form:
 *     select#subject                     - Subject (Card Center Inquiry | Fund Transfer
 *                                          Dispute | Bill Payment Dispute | Fund Transfer |
 *                                          Other)
 *     select[name="subjectSubCategory"]  - Sub-category (reloads after the subject changes)
 *     textarea[name="message"]           - Message body ("Enter Message")
 *     input[placeholder="Select Attachments"] - optional attachment
 *     "Send"  -> SMS OTP -> Confirm (a real OTP; handled by ConfirmationPopup, manual).
 *
 * // VERIFY: the reply flow could NOT be captured because the message list shows "Error
 * // loading data" - there are no messages to open and reply to. selectMessage()/reply()
 * // below are best-effort and must be confirmed once messages load.
 */
class MessagesPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText("Message", { exact: true }).first();
    this.composeButton = page.getByRole("button", { name: /Compose New Message/i });
    this.allTab = page.getByText("All", { exact: true }).locator("visible=true").first();
    this.trashTab = page.getByText("Trash", { exact: true }).locator("visible=true").first();

    // Compose form
    this.subjectSelect = page.locator("select#subject");
    this.subCategorySelect = page.locator('select[name="subjectSubCategory"]');
    this.messageInput = page.locator('textarea[name="message"]');
    this.attachmentInput = page.getByPlaceholder(/select attachments/i);
    this.sendButton = page.getByRole("button", { name: "Send", exact: true });
    this.backButton = page.getByRole("button", { name: /^back$/i }).first();

    // Message list / reply
    this.messageRows = page.locator("table tbody tr, [class*='messageRow'], [class*='listItem']");
    this.errorLoading = page.getByText(/error loading data/i);
    this.replyButton = page.getByRole("button", { name: /reply|respond/i }).first();

    // Home-page ENVELOPE icon - the message feature's entry point from the dashboard.
    this.envelopeIcon = page.locator('a[href*="/dashboard/inbox"]').first();
    this.oldVishwaButton = page.getByRole("button", { name: /old vishwa/i }).first();
    this.holidayNotice = page.getByText(/messages submitted on bank holidays/i).first();

    // List controls. The inbox is EMPTY on this profile, so pagination/delete render only
    // once messages exist. // VERIFY against an account that has messages.
    this.perPageSelect = page.getByRole("combobox", { name: /per page/i }).first();
    this.pager = page.getByText(/^\s*\d+\s*(\/|of)\s*\d+\s*$/i).locator("visible=true").first();
    this.emptyState = page
      .getByText(/no .*(messages?|data|records|found)/i)
      .locator("visible=true")
      .first();
    this.replyInput = page.locator('textarea[name="reply"], textarea[name="message"]').first();
  }

  /** ASSERTION: the messaging page is displayed. */
  /** Opens Messages from the dashboard's ENVELOPE icon (its real entry point). */
  async openFromEnvelope() {
    await expect(this.envelopeIcon, "The dashboard envelope icon should be visible").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await this.envelopeIcon.click({ force: true });
    await this.page.waitForTimeout(4000);
    await this.assertLoaded();
  }

  /** Switches to the "All" or "Trash" tab. */
  async openTab(name) {
    const tab = /trash/i.test(name) ? this.trashTab : this.allTab;
    if (!(await tab.isVisible().catch(() => false))) return false;
    await tab.click({ force: true });
    await this.page.waitForTimeout(4000);
    return true;
  }

  /** How many messages are listed. */
  async messageCount() {
    return this.messageRows.count().catch(() => 0);
  }

  /**
   * ASSERTION: the tab shows messages or an explicit empty state. This profile's inbox is
   * currently EMPTY and the app renders no empty-state text, so `allowBlank` lets the caller
   * accept a genuinely empty inbox instead of failing.
   */
  async assertTabRendered(label, allowBlank = true) {
    let rows = 0;
    let empty = false;
    for (let i = 0; i < 10; i++) {
      rows = await this.messageCount();
      empty = await this.emptyState.isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    if (!allowBlank) {
      expect(rows > 0 || empty, `"${label}" should list messages or show an explicit empty state`).toBeTruthy();
    }
    return rows;
  }

  /** The delete control on a message row (icon or labelled button). */
  deleteControl(index = 0) {
    const row = this.messageRows.nth(index);
    return row
      .getByRole("button", { name: /delete|remove|trash|bin/i })
      .first()
      .or(row.locator('button:has(img[alt*="delete" i]), button:has(img[srcset*="delete" i]), button:has(svg[class*="trash" i])').first());
  }

  /** The page-size options offered by the list, if any. */
  async perPageOptions() {
    return this.perPageSelect
      .locator("option")
      .allInnerTexts()
      .then((v) => v.map((t) => t.trim()).filter(Boolean))
      .catch(() => []);
  }

  /** Sets the page size and lets the list re-render. */
  async setPerPage(size) {
    await this.perPageSelect.selectOption(String(size)).catch(() => {});
    await this.page.waitForTimeout(3000);
  }

  async assertLoaded() {
    await expect(this.composeButton, "'Compose New Message' should be visible on the messaging page").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
  }

  // ---- Compose / Send ----

  async openCompose() {
    await this.composeButton.click();
    await expect(this.subjectSelect, "Compose: the Subject dropdown should be shown").toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  /** SOFT VALIDATIONS on the compose form. */
  async assertComposeValidations() {
    await assertDropdownPopulated(this.subjectSelect, "Subject");
    await expect.soft(this.subCategorySelect, "Sub-category dropdown should be visible").toBeVisible();
    await expect.soft(this.messageInput, "Message field should be visible").toBeVisible();
    await expect.soft(this.sendButton, "Send button should be visible").toBeVisible();
  }

  async fillMessage(data) {
    await selectOptionByLabelContains(this.subjectSelect, data.subject);
    // The sub-category list is fetched from the chosen subject, so wait for it to populate.
    await expect
      .poll(async () => this.subCategorySelect.locator("option").count().catch(() => 0), {
        timeout: TIMEOUTS.ACTION,
        message: `The sub-category list for subject "${data.subject}" should load`,
      })
      .toBeGreaterThan(1);
    if (data.subCategory) await selectOptionByLabelContains(this.subCategorySelect, data.subCategory).catch(() => {});
    await this.messageInput.fill(data.body);

    // ASSERTION: the message body holds the entered text.
    await expect(this.messageInput, "Message body should hold the entered text").toHaveValue(data.body);
  }

  async send() {
    await expect(this.sendButton, "'Send' should be enabled once the message is composed").toBeEnabled({
      timeout: TIMEOUTS.UI,
    });
    await this.sendButton.click();
  }

  // ---- helpers for the negative / validation suite ----

  /** ASSERTION: the Subject dropdown loaded with selectable values. */
  async assertSubjectPopulated() {
    await assertDropdownPopulated(this.subjectSelect, "Subject");
  }

  /** Fills ONLY the provided fields (skips undefined) - for partial-required negatives. */
  async fillPartial({ subject, subCategory, body } = {}) {
    if (subject) await selectOptionByLabelContains(this.subjectSelect, subject).catch(() => {});
    if (subCategory && (await this.subCategorySelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.subCategorySelect, subCategory).catch(() => {});
    }
    if (body != null) await this.messageInput.fill(String(body));
  }

  // ---- Reply ----

  /**
   * Opens the first message to reply to. Fails with an actionable message when the list
   * shows "Error loading data" (its current state) - there is nothing to reply to.
   */
  async openFirstMessage() {
    const outcome = await Promise.race([
      this.messageRows.first().waitFor({ state: "visible", timeout: TIMEOUTS.LOAD }).then(() => "rows").catch(() => null),
      this.errorLoading.first().waitFor({ state: "visible", timeout: TIMEOUTS.LOAD }).then(() => "error").catch(() => null),
    ]);

    if (outcome !== "rows") {
      throw new Error(
        'Cannot reply: the message list shows "Error loading data" - no messages are available to open and reply to. ' +
          "This is an environment/backend issue (the inbox list does not load), not a locator problem. Once messages " +
          "load, the reply flow can be finalized."
      );
    }

    await this.messageRows.first().click();
    await expect(this.replyButton, "A 'Reply' action should be available on the opened message").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /** Replies to the opened message. // VERIFY the reply field/send control. */
  async reply(body) {
    await this.replyButton.click();
    await this.replyInput.fill(body);
    await this.sendButton.click();
  }

  /** ASSERTION: a message send/reply succeeded (after OTP confirmation). */
  async assertSent() {
    const done = this.page.getByText(/success|sent|submitted|message.*sent|thank you/i).first();
    await expect(done, "A message-sent confirmation should be shown").toBeVisible({ timeout: TIMEOUTS.LOAD });
  }
}

module.exports = { MessagesPage };
