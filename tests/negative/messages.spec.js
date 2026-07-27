const { test, expect } = require("../../utils/fixtures");
const { MessagesPage } = require("../../pages/MessagesPage");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Secure Messaging — NEGATIVE / VALIDATION.
 * An empty message must not be sendable: either "Send" stays disabled, or submitting
 * raises a required-field validation.
 */
test.describe("Secure Messaging - Negative & Validation", () => {
  test("TC_MSG_N01 - Empty message cannot be sent", async ({ page, loggedInDashboard }) => {
    const messages = new MessagesPage(page);

    await test.step("Open the messaging inbox and Compose", async () => {
      await loggedInDashboard.goToInbox();
      await messages.assertLoaded();
      await messages.openCompose();
    });

    await test.step("With no message body, sending must be blocked", async () => {
      if (await messages.sendButton.isEnabled().catch(() => false)) {
        await messages.sendButton.click();
        await assertValidationError(page, /required|message|subject|category|select/i);
      } else {
        await expect(messages.sendButton, "Send should stay disabled for an empty message").toBeDisabled();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
