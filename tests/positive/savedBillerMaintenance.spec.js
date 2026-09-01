const { test, expect } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Billers - EDIT / DELETE a saved biller — POSITIVE.
 * Each saved-biller row's "Actions" cell holds a pencil (edit) and a bin (delete).
 *
 * !! SAFETY !! Editing changes a real payment template and deleting removes it for good, so
 * by default these tests only prove the actions are OFFERED and that they OPEN their form /
 * confirmation - the change is always cancelled. Set the flags to really apply them:
 *   IB_APPLY_BILLER_EDIT=true    - saves the edited amount
 *   IB_APPLY_BILLER_DELETE=true  - confirms the deletion
 */
test.describe("Saved Biller Maintenance (Edit / Delete) - Positive", () => {
  async function open(page, loggedInDashboard) {
    const sb = new SavedBillerPaymentPage(page);
    await loggedInDashboard.goToSavedBillers();
    await sb.assertLoaded();
    await sb.waitForListReady();
    test.skip((await sb.rowCount()) === 0, "The account has no saved billers to edit or delete.");
    return sb;
  }

  test("TC_SBEDIT_H01 - Verify that a saved biller offers an edit action", async ({ page, loggedInDashboard }) => {
    const sb = await open(page, loggedInDashboard);
    const row = sb.billerRows.first();
    await expect(sb.editControl(row), "Each saved-biller row should offer an edit (pencil) action").toBeVisible({
      timeout: 20_000,
    });
  });

  test("TC_SBEDIT_H02 - Verify that edit opens the biller pre-filled", async ({ page, loggedInDashboard }) => {
    const sb = await open(page, loggedInDashboard);
    const row = sb.billerRows.first();
    const rowText = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();

    const opened = await sb.openEdit(row);
    expect(opened, "The edit (pencil) action should open the biller's form").toBeTruthy();

    const values = await sb.assertEditFormPrefilled();
    // eslint-disable-next-line no-console
    console.log(`Editing saved biller "${values.templateName}" (amount ${values.amount}) from row: ${rowText}`);

    await test.step("Cancel - the template is left untouched", async () => {
      test.skip(
        process.env.IB_APPLY_BILLER_EDIT === "true",
        "IB_APPLY_BILLER_EDIT=true - skipping the cancel guard so the edit can be applied manually."
      );
      await sb.cancelEdit();
    });
  });

  test("TC_SBDEL_H01 - Verify that a saved biller offers a delete action", async ({ page, loggedInDashboard }) => {
    const sb = await open(page, loggedInDashboard);
    const row = sb.billerRows.first();
    await expect(sb.deleteControl(row), "Each saved-biller row should offer a delete (bin) action").toBeVisible({
      timeout: 20_000,
    });
  });

  test("TC_SBDEL_H02 - Verify that delete asks for confirmation before removing", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);
    const before = await sb.rowCount();
    const row = sb.billerRows.first();

    const opened = await sb.openDelete(row);
    expect(opened, "The delete (bin) action should be clickable").toBeTruthy();
    await sb.assertDeleteConfirmationShown();

    if (process.env.IB_APPLY_BILLER_DELETE === "true") {
      await test.step("!! DESTRUCTIVE !! Confirm the deletion", async () => {
        await sb.confirmDelete();
        await sb.waitForListReady();
        const after = await sb.rowCount();
        expect(after, "Confirming the deletion should remove the biller from the list").toBeLessThan(before);
      });
      return;
    }

    // SAFETY: cancel out - the biller is left in place.
    await sb.cancelDelete();
    await sb.waitForListReady();
    expect(await sb.rowCount(), "Cancelling the confirmation must leave the biller in the list").toBe(before);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
