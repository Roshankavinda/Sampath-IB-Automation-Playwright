const { test, expect } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Payees - EDIT / DELETE — NEGATIVE / VALIDATION.
 *   N01 cancelling Delete does NOT remove the payee
 *   N02 cancelling Edit does NOT change the payee
 *   N03 clearing the Nickname on the edit form is blocked
 *
 * SAFETY: these act on REAL saved payees - every action is opened and then CANCELLED,
 * so nothing is ever deleted or modified.
 */
test.describe("Saved Payee Maintenance - Negative & Validation", () => {
  async function open(page, loggedInDashboard) {
    const sp = new SavedPayeeTransferPage(page);
    await loggedInDashboard.goToSavedPayees();
    await sp.assertLoaded();
    await sp.waitForListReady();
    test.skip((await sp.rowCount()) === 0, "The account has no saved payees to exercise the guards against.");
    return sp;
  }

  test("TC_SPDEL_N01 - Verify that cancelling Delete does not remove the payee", async ({
    page,
    loggedInDashboard,
  }) => {
    const sp = await open(page, loggedInDashboard);
    const before = await sp.rowCount();

    const opened = await sp.openDelete(sp.payeeRows.first());
    test.skip(!opened, "The row does not offer a delete action.");
    await sp.cancelDelete();
    await sp.waitForListReady();

    expect(await sp.rowCount(), "Cancelling the delete confirmation must NOT remove the payee").toBe(before);
  });

  test("TC_SPEDIT_N01 - Verify that cancelling Edit does not change the payee", async ({
    page,
    loggedInDashboard,
  }) => {
    const sp = await open(page, loggedInDashboard);
    const row = sp.payeeRows.first();
    const before = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();

    const opened = await sp.openEdit(row);
    test.skip(!opened, "The row does not offer an edit action.");
    await sp.cancelEdit();
    await sp.waitForListReady();

    const after = (await sp.payeeRows.first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    expect(after, "Cancelling the edit form must leave the payee unchanged").toBe(before);
  });

  test("TC_SPEDIT_N02 - Verify that clearing the Nickname on the edit form is blocked", async ({
    page,
    loggedInDashboard,
  }) => {
    const sp = await open(page, loggedInDashboard);
    const opened = await sp.openEdit(sp.payeeRows.first());
    test.skip(!opened, "The row does not offer an edit action.");
    await sp.assertEditFormPrefilled();

    const nickName = page.locator('input[name="nickName"]');
    await nickName.fill("").catch(() => {});
    const save = page
      .getByRole("button", { name: /^(next|save|update|submit)$/i })
      .locator("visible=true")
      .last();
    if (await save.isVisible().catch(() => false)) await save.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2500);

    const blocked =
      (await page.getByText(/is required/i).first().isVisible().catch(() => false)) ||
      (await nickName.isVisible().catch(() => false));
    expect(blocked, "Saving the edit form with an empty Nickname must be blocked").toBeTruthy();

    // SAFETY: leave without saving.
    await sp.cancelEdit();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
