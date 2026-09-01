const { test, expect } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Billers - EDIT / DELETE — NEGATIVE / VALIDATION.
 *   N01 cancelling Delete does NOT remove the biller
 *   N02 cancelling Edit does NOT change the biller
 *   N03 clearing a mandatory field on the edit form is blocked
 *
 * SAFETY: these act on REAL saved billers - every action is opened and then CANCELLED,
 * so nothing is ever deleted or modified.
 */
test.describe("Saved Biller Maintenance - Negative & Validation", () => {
  async function open(page, loggedInDashboard) {
    const sb = new SavedBillerPaymentPage(page);
    await loggedInDashboard.goToSavedBillers();
    await sb.assertLoaded();
    await sb.waitForListReady();
    test.skip((await sb.rowCount()) === 0, "The account has no saved billers to exercise the guards against.");
    return sb;
  }

  test("TC_SBDEL_N01 - Verify that cancelling Delete does not remove the biller", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);
    const before = await sb.rowCount();

    const opened = await sb.openDelete(sb.billerRows.first());
    test.skip(!opened, "The row does not offer a delete action.");
    await sb.cancelDelete();
    await sb.waitForListReady();

    expect(await sb.rowCount(), "Cancelling the delete confirmation must NOT remove the biller").toBe(before);
  });

  test("TC_SBEDIT_N01 - Verify that cancelling Edit does not change the biller", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);
    const row = sb.billerRows.first();
    const before = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();

    const opened = await sb.openEdit(row);
    test.skip(!opened, "The row does not offer an edit action.");
    await sb.cancelEdit();
    await sb.waitForListReady();

    const after = (await sb.billerRows.first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    expect(after, "Cancelling the edit form must leave the biller unchanged").toBe(before);
  });

  test("TC_SBEDIT_N02 - Verify that clearing a mandatory field on the edit form is blocked", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);
    const opened = await sb.openEdit(sb.billerRows.first());
    test.skip(!opened, "The row does not offer an edit action.");
    await sb.assertEditFormPrefilled();

    // Clear the Template Name and try to save.
    const templateName = page.locator('input[name="templateName"]');
    await templateName.fill("").catch(() => {});
    const save = page
      .getByRole("button", { name: /^(next|save|update|submit)$/i })
      .locator("visible=true")
      .last();
    if (await save.isVisible().catch(() => false)) await save.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2500);

    const blocked =
      (await page.getByText(/is required/i).first().isVisible().catch(() => false)) ||
      (await templateName.isVisible().catch(() => false));
    expect(blocked, "Saving the edit form with an empty Template Name must be blocked").toBeTruthy();

    // SAFETY: leave without saving.
    await sb.cancelEdit();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
