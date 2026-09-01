const { test, expect } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Payees - EDIT / DELETE a saved payee — POSITIVE.
 * Each payee row's "Actions" cell holds a pencil (edit) and a bin (delete); the edit form
 * reuses the "Add New Payee" modal.
 *
 * !! SAFETY !! Editing changes a real beneficiary and deleting removes it for good, so by
 * default these tests only prove the actions are OFFERED and that they OPEN their form /
 * confirmation - the change is always cancelled. Set the flags to really apply them:
 *   IB_APPLY_PAYEE_EDIT=true    - saves the edited payee
 *   IB_APPLY_PAYEE_DELETE=true  - confirms the deletion
 */
test.describe("Saved Payee Maintenance (Edit / Delete) - Positive", () => {
  async function open(page, loggedInDashboard) {
    const sp = new SavedPayeeTransferPage(page);
    await loggedInDashboard.goToSavedPayees();
    await sp.assertLoaded();
    await sp.waitForListReady();
    test.skip((await sp.rowCount()) === 0, "The account has no saved payees to edit or delete.");
    return sp;
  }

  test("TC_SPEDIT_H01 - Verify that a saved payee offers an edit action", async ({ page, loggedInDashboard }) => {
    const sp = await open(page, loggedInDashboard);
    await expect(
      sp.editControl(sp.payeeRows.first()),
      "Each saved-payee row should offer an edit (pencil) action"
    ).toBeVisible({ timeout: 20_000 });
  });

  test("TC_SPEDIT_H02 - Verify that edit opens the payee pre-filled", async ({ page, loggedInDashboard }) => {
    const sp = await open(page, loggedInDashboard);
    const row = sp.payeeRows.first();

    const opened = await sp.openEdit(row);
    expect(opened, "The edit (pencil) action should open the payee's form").toBeTruthy();

    const values = await sp.assertEditFormPrefilled();
    // eslint-disable-next-line no-console
    console.log(`Editing saved payee: ${JSON.stringify(values)}`);
    expect(values.accountNumber.trim(), "The edit form should carry the payee's account number").not.toBe("");

    await test.step("Cancel - the payee is left untouched", async () => {
      test.skip(
        process.env.IB_APPLY_PAYEE_EDIT === "true",
        "IB_APPLY_PAYEE_EDIT=true - skipping the cancel guard so the edit can be applied manually."
      );
      await sp.cancelEdit();
    });
  });

  test("TC_SPDEL_H01 - Verify that a saved payee offers a delete action", async ({ page, loggedInDashboard }) => {
    const sp = await open(page, loggedInDashboard);
    await expect(
      sp.deleteControl(sp.payeeRows.first()),
      "Each saved-payee row should offer a delete (bin) action"
    ).toBeVisible({ timeout: 20_000 });
  });

  test("TC_SPDEL_H02 - Verify that delete asks for confirmation before removing", async ({
    page,
    loggedInDashboard,
  }) => {
    const sp = await open(page, loggedInDashboard);
    const before = await sp.rowCount();

    const opened = await sp.openDelete(sp.payeeRows.first());
    expect(opened, "The delete (bin) action should be clickable").toBeTruthy();
    await sp.assertDeleteConfirmationShown();

    if (process.env.IB_APPLY_PAYEE_DELETE === "true") {
      await test.step("!! DESTRUCTIVE !! Confirm the deletion", async () => {
        await sp.confirmDelete();
        await sp.waitForListReady();
        expect(await sp.rowCount(), "Confirming the deletion should remove the payee from the list").toBeLessThan(
          before
        );
      });
      return;
    }

    // SAFETY: cancel out - the payee is left in place.
    await sp.cancelDelete();
    await sp.waitForListReady();
    expect(await sp.rowCount(), "Cancelling the confirmation must leave the payee in the list").toBe(before);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
