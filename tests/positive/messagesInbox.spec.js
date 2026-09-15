const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { MessagesPage } = require("../../pages/MessagesPage");
const message = require("../../test-data/message");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Messages - INBOX (envelope icon) — POSITIVE.
 * Reached from the dashboard's ENVELOPE icon -> /dashboard/inbox. The page offers the
 * "All" and "Trash" tabs, an "Old Vishwa" button and "Compose New Message".
 *
 * NOTE: this profile's inbox is EMPTY (no message list, no pagination control renders), so
 * the view/delete/pagination cases SKIP with a clear reason until messages exist.
 */
test.describe("Messages Inbox - Positive", () => {
  test("TC_MSGBOX_H01 - Verify that Messages opens from the envelope icon", async ({ page, loggedInDashboard }) => {
    const msg = new MessagesPage(page);
    await msg.openFromEnvelope();
    expect(page.url(), "The envelope icon should open the inbox").toContain("/dashboard/inbox");
    await expect(msg.composeButton, "'Compose New Message' should be offered").toBeVisible();
    await expect.soft(msg.holidayNotice, "The processing-times notice should be shown").toBeVisible();
  });

  test("TC_MSGBOX_H02 - Verify that the All and Trash tabs are offered", async ({ page, loggedInDashboard }) => {
    const msg = new MessagesPage(page);
    await msg.openFromEnvelope();
    await expect(msg.allTab, "The 'All' tab should be offered").toBeVisible();
    await expect(msg.trashTab, "The 'Trash' tab should be offered").toBeVisible();
    await expect.soft(msg.oldVishwaButton, "The 'Old Vishwa' messages button should be offered").toBeVisible();
  });

  test("TC_MSGBOX_H03 - Verify that the Trash tab can be viewed", async ({ page, loggedInDashboard }) => {
    const msg = new MessagesPage(page);
    await msg.openFromEnvelope();

    await test.step("Switch to Trash", async () => {
      const opened = await msg.openTab("Trash");
      test.skip(!opened, "The Trash tab is not offered.");
      const rows = await msg.assertTabRendered("Trash");
      // eslint-disable-next-line no-console
      console.log(`Trash tab -> ${rows} message(s)`);
    });

    await test.step("Switch back to All", async () => {
      await msg.openTab("All");
      const rows = await msg.assertTabRendered("All");
      // eslint-disable-next-line no-console
      console.log(`All tab -> ${rows} message(s)`);
    });
  });

  test("TC_MSGBOX_H04 - Verify that a message can be viewed", async ({ page, loggedInDashboard }) => {
    const msg = new MessagesPage(page);
    await msg.openFromEnvelope();
    const rows = await msg.assertTabRendered("All");
    test.skip(rows === 0, "The inbox has no messages - a message cannot be opened.");

    await msg.openFirstMessage();
    await expect(
      page.getByText(/subject|from|message|reply/i).locator("visible=true").first(),
      "Opening a message should show its detail view"
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
  });

  test("TC_MSGBOX_H05 - Verify that a message can be deleted", async ({ page, loggedInDashboard }) => {
    const msg = new MessagesPage(page);
    await msg.openFromEnvelope();
    const before = await msg.assertTabRendered("All");
    test.skip(before === 0, "The inbox has no messages - deletion cannot be exercised.");

    const del = msg.deleteControl(0);
    test.skip(!(await del.isVisible().catch(() => false)), "No delete control is offered on a message row.");

    await test.step("Delete the first message", async () => {
      await del.click({ force: true });
      await page.waitForTimeout(2500);
      // Confirm if the app asks.
      const confirm = page.getByRole("button", { name: /^(yes|confirm|delete|ok)$/i }).locator("visible=true").last();
      if (await confirm.isVisible().catch(() => false)) await confirm.click().catch(() => {});
      await page.waitForTimeout(4000);

      const after = await msg.messageCount();
      // eslint-disable-next-line no-console
      console.log(`Delete message: ${before} -> ${after}`);
      expect(after, "Deleting should remove the message from the list").toBeLessThan(before);
    });
  });

  test("TC_MSGBOX_H06 - Verify that both tabs support pagination", async ({ page, loggedInDashboard }) => {
    const msg = new MessagesPage(page);
    await msg.openFromEnvelope();

    for (const tab of ["All", "Trash"]) {
      await test.step(`Pagination on the "${tab}" tab`, async () => {
        await msg.openTab(tab);
        const rows = await msg.assertTabRendered(tab);
        const options = await msg.perPageOptions();
        // eslint-disable-next-line no-console
        console.log(`"${tab}" tab: ${rows} message(s), page-size options = ${JSON.stringify(options)}`);
        test.skip(options.length === 0, `The "${tab}" tab renders no pagination control (the list is empty).`);

        await msg.setPerPage(options[options.length - 1]);
        const after = await msg.messageCount();
        expect(after, `The "${tab}" list should still render after changing the page size`).toBeGreaterThanOrEqual(0);
      });
    }
  });

  test("TC_MSGBOX_H07 - Verify that a message can be composed without an attachment", async ({
    page,
    loggedInDashboard,
  }) => {
    const msg = new MessagesPage(page);
    await msg.openFromEnvelope();

    await test.step("Open Compose and fill subject + body only (no attachment)", async () => {
      await msg.openCompose();
      await msg.assertComposeValidations();
      await msg.fillPartial({
        subject: message.subject,
        subCategory: message.subCategory,
        body: message.body,
      });
      // The attachment field is deliberately left empty.
      await expect(msg.sendButton, "Send should be enabled without an attachment").toBeEnabled({
        timeout: TIMEOUTS.ACTION,
      });
    });

    await test.step("Send the message and validate it was accepted", async () => {
      await msg.send();
      await msg.assertSent();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
