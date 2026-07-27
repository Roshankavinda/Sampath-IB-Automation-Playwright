const { expect } = require("@playwright/test");
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
    this.replyInput = page.locator('textarea[name="reply"], textarea[name="message"]').first();
  }

  /** ASSERTION: the messaging page is displayed. */
  async assertLoaded() {
    await expect(this.composeButton, "'Compose New Message' should be visible on the messaging page").toBeVisible({
      timeout: 60_000,
    });
  }

  // ---- Compose / Send ----

  async openCompose() {
    await this.composeButton.click();
    await expect(this.subjectSelect, "Compose: the Subject dropdown should be shown").toBeVisible({ timeout: 30_000 });
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
        timeout: 20_000,
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
      timeout: 15_000,
    });
    await this.sendButton.click();
  }

  // ---- Reply ----

  /**
   * Opens the first message to reply to. Fails with an actionable message when the list
   * shows "Error loading data" (its current state) - there is nothing to reply to.
   */
  async openFirstMessage() {
    const outcome = await Promise.race([
      this.messageRows.first().waitFor({ state: "visible", timeout: 30_000 }).then(() => "rows").catch(() => null),
      this.errorLoading.first().waitFor({ state: "visible", timeout: 30_000 }).then(() => "error").catch(() => null),
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
      timeout: 30_000,
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
    await expect(done, "A message-sent confirmation should be shown").toBeVisible({ timeout: 30_000 });
  }
}

module.exports = { MessagesPage };
