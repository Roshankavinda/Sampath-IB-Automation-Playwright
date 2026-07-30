const { test } = require("../../utils/fixtures");
const { MessagesPage } = require("../../pages/MessagesPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const message = require("../../test-data/message");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Secure Messaging — POSITIVE. Send a message + Reply.
 * Inbox -> Compose New Message -> subject / sub-category / body -> Send -> SMS OTP ->
 * Confirm -> sent. Reply opens an existing message and responds.
 */
test.describe("Secure Messaging - Positive", () => {
  test("TC_MSG_H01 - Verify that Send a message to the bank", async ({ page, loggedInDashboard }) => {
    const messages = new MessagesPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Open the messaging inbox", async () => {
      await loggedInDashboard.goToInbox();
      await messages.assertLoaded();
    });

    await test.step("Open Compose New Message and validate the form", async () => {
      await messages.openCompose();
      await messages.assertComposeValidations();
    });

    await test.step("Fill the subject, sub-category and message body", async () => {
      await messages.fillMessage(message);
    });

    await test.step("Send and validate the OTP/confirmation popup", async () => {
      await messages.send();
      await popup.assertVisible();
    });

    await test.step("Enter the OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the message was sent", async () => {
      await messages.assertSent();
    });
  });

  test("TC_MSG_H02 - Verify that Reply to a message", async ({ page, loggedInDashboard }) => {
    const messages = new MessagesPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Open the messaging inbox", async () => {
      await loggedInDashboard.goToInbox();
      await messages.assertLoaded();
    });

    await test.step("Open a message and reply to it", async () => {
      await messages.openFirstMessage();
      await messages.reply(message.reply);
    });

    await test.step("Confirm the reply (OTP if prompted) and validate it was sent", async () => {
      if (await popup.otpBoxes.first().isVisible().catch(() => false)) {
        await popup.enterOtpAndConfirm(credentials.otp);
      }
      await messages.assertSent();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
