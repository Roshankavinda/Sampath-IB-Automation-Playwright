const { test, expect } = require("../../utils/fixtures");
const { MessagesPage } = require("../../pages/MessagesPage");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Secure Messaging — NEGATIVE / VALIDATION.
 *   N01 empty message cannot be sent
 *   N02 Subject dropdown displays selectable values
 *   N03 missing Subject is blocked
 *   N04 missing message body is blocked
 */
test.describe("Secure Messaging - Negative & Validation", () => {
  const neg = negative.message;

  async function openCompose(page, loggedInDashboard) {
    const messages = new MessagesPage(page);
    await loggedInDashboard.goToInbox();
    await messages.assertLoaded();
    await messages.openCompose();
    return messages;
  }

  test("TC_MSG_N01 - Empty message cannot be sent", async ({ page, loggedInDashboard }) => {
    const messages = await openCompose(page, loggedInDashboard);
    if (await messages.sendButton.isEnabled().catch(() => false)) {
      await messages.sendButton.click();
      await assertValidationError(page, "required|message|subject|category|select");
    } else {
      await expect(messages.sendButton, "Send should stay disabled for an empty message").toBeDisabled();
    }
  });

  test("TC_MSG_N02 - Subject dropdown displays selectable values", async ({ page, loggedInDashboard }) => {
    const messages = await openCompose(page, loggedInDashboard);
    await messages.assertSubjectPopulated();
  });

  test("TC_MSG_N03 - Missing Subject is blocked", async ({ page, loggedInDashboard }) => {
    const messages = await openCompose(page, loggedInDashboard);
    // A body only, no subject chosen.
    await messages.fillPartial({ body: neg.base.body });
    if (await messages.sendButton.isEnabled().catch(() => false)) {
      await messages.sendButton.click();
      await assertValidationError(page, neg.requiredFields.subject);
    } else {
      await expect(messages.sendButton, "Send should stay disabled without a subject").toBeDisabled();
    }
  });

  test("TC_MSG_N04 - Missing message body is blocked", async ({ page, loggedInDashboard }) => {
    const messages = await openCompose(page, loggedInDashboard);
    // Subject (+ sub-category) but no body.
    await messages.fillPartial({ subject: neg.base.subject, subCategory: neg.base.subCategory });
    if (await messages.sendButton.isEnabled().catch(() => false)) {
      await messages.sendButton.click();
      await assertValidationError(page, neg.requiredFields.body);
    } else {
      await expect(messages.sendButton, "Send should stay disabled without a message body").toBeDisabled();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
