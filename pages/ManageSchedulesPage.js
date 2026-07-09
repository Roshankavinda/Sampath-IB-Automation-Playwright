const { expect } = require("@playwright/test");

/**
 * Manage Schedules page (top-nav "Manage Schedules").
 * Lists scheduled and recurring transactions the user has set up, and lets the
 * user cancel/delete one. Used to verify a scheduled transfer was created.
 *
 * // VERIFY against the live app: the heading text, how a schedule row is matched
 * // (by remark/beneficiary/amount), and the cancel control label.
 */
class ManageSchedulesPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/manage schedules|scheduled transactions|standing orders/i).first();
  }

  /** ASSERTION: the Manage Schedules page is displayed. */
  async assertLoaded() {
    await expect(this.heading, "Manage Schedules heading should be visible").toBeVisible({ timeout: 60_000 });
  }

  /** ASSERTION: a schedule row matching the given text (e.g. remark) is listed. */
  async assertScheduleListed(matchText) {
    const row = this.page.getByText(new RegExp(matchText, "i")).first();
    await expect(row, `A scheduled transaction matching "${matchText}" should be listed`).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * Cancel/delete the schedule row matching the given text. Best-effort cleanup:
   * finds the row, clicks a cancel/delete control within it, confirms if prompted.
   */
  async cancelSchedule(matchText) {
    const row = this.page
      .locator("tr, li, [role='row']")
      .filter({ hasText: new RegExp(matchText, "i") })
      .first();
    if (!(await row.isVisible().catch(() => false))) return false;

    const cancelBtn = row.getByRole("button", { name: /cancel|delete|remove|stop/i }).first();
    if (!(await cancelBtn.isVisible().catch(() => false))) return false;
    await cancelBtn.click();

    // Confirm dialog, if any.
    const confirm = this.page.getByRole("button", { name: /^(yes|confirm|ok|delete)$/i }).first();
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    return true;
  }
}

module.exports = { ManageSchedulesPage };
