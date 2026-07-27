const { expect } = require("@playwright/test");

/**
 * Quick Actions > Stop Card - temporarily block a Credit / Debit / Web card.
 * Confirmed against the live app (/dashboard/myaccount/stop-card):
 *
 *   - A page titled "Stop Card / Your Cards can be temporarily blocked".
 *   - Three card-type buttons: "Credit Card", "Web Card", "Debit Card".
 *   - A list of that type's cards, each showing the masked number, balance and status
 *     (ACTIVE / INACTIVE). ACTIVE cards carry a "STOP" button (accessible name
 *     "Stop hand STOP"); INACTIVE cards have none.
 *   - Clicking STOP opens a "Want to temporally block this card?" modal with Back / Confirm.
 *   - Confirm triggers the OTP/confirmation popup, then success.
 *
 * There is NO card dropdown and NO reason selector - the earlier version of this page
 * object assumed both and was wrong on every locator.
 *
 * The card list loads asynchronously and the page occasionally bounces back to the
 * Dashboard, so navigation is retried via openWithRetry().
 */
class StopCardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    // The visible page subtitle - unique, unlike the bare "Stop Card" which also matches
    // the (hidden) nav submenu item.
    this.heading = page.getByText(/cards can be temporarily blocked/i).first();
    // Each ACTIVE card's block button ("Stop hand STOP").
    this.stopButtons = page.getByRole("button", { name: /stop hand|stop$/i });
    // Confirmation modal shown after clicking STOP (note the app's "temporally" typo).
    this.blockModalText = page.getByText(/want to (temporally|temporarily) block this card/i).first();
    // The modal names the exact card, e.g. "block your card ending ****1071".
    this.blockModalEnding = page.getByText(/ending\s*\*+\s*\d{3,4}/i).first();
    this.confirmButton = page.getByRole("button", { name: /^confirm$/i }).first();
    this.backButton = page.getByRole("button", { name: /^back$/i }).first();

    // The masked ending of the card being stopped, captured from the confirm modal so the
    // block can be verified afterwards (the app shows NO success screen - the card simply
    // flips to INACTIVE in the list).
    this.stoppedCardEnding = "";
  }

  /** The "<type> Card" selector button, e.g. cardTypeButton("Credit"). */
  cardTypeButton(type) {
    return this.page.getByRole("button", { name: new RegExp(`^${type}\\s*card$`, "i") }).first();
  }

  /**
   * Opens Stop Card via Quick Actions, retrying if the app bounces back to the Dashboard
   * or the card list does not load. Leaves the page on a loaded Stop Card screen.
   * @param {import('./DashboardPage').DashboardPage} dashboard
   */
  async openWithRetry(dashboard, attempts = 4) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await dashboard.goToStopCard();
      const loaded = await this.heading
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      if (loaded) return;
    }
    throw new Error(
      "The Stop Card page did not load after several attempts - Quick Actions > Stop Card kept bouncing back to the " +
        "Dashboard (the intermittent backend session drop), so the card list never appeared."
    );
  }

  /** ASSERTION: the Stop Card page is displayed with its card-type buttons. */
  async assertLoaded() {
    await expect(this.heading, "Stop Card page subtitle should be visible").toBeVisible({ timeout: 30_000 });
    await expect(this.cardTypeButton("Credit"), "'Credit Card' type button should be visible").toBeVisible({
      timeout: 20_000,
    });
    await expect(this.cardTypeButton("Debit"), "'Debit Card' type button should be visible").toBeVisible();
    await expect(this.cardTypeButton("Web"), "'Web Card' type button should be visible").toBeVisible();
  }

  /**
   * Chooses the card type and waits for at least one stoppable (ACTIVE) card to appear.
   * @param {string} cardType - "Credit" | "Debit" | "Web"
   */
  async selectCardType(cardType = "Credit") {
    const btn = this.cardTypeButton(cardType);
    await expect(btn, `'${cardType} Card' type button should be visible`).toBeVisible({ timeout: 20_000 });
    await btn.click();
    await this.waitForStoppableCard(cardType);
  }

  /** Polls for at least one ACTIVE card's STOP button (the list loads asynchronously). */
  async waitForStoppableCard(cardType = "the selected type") {
    const appeared = await this.stopButtons
      .first()
      .waitFor({ state: "visible", timeout: 25_000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) {
      throw new Error(
        `No stoppable (ACTIVE) ${cardType} card is available on the Stop Card page - either the card list did not load, ` +
          "or every card of this type is already INACTIVE (INACTIVE cards have no STOP button)."
      );
    }
  }

  /**
   * Clicks the STOP button of the target card. If `cardPartial` matches a specific card's
   * (masked) number it clicks that card's STOP button; otherwise it clicks the first
   * ACTIVE card's STOP button.
   * @param {string} [cardPartial] e.g. "1071"
   */
  async clickStop(cardPartial) {
    await this.waitForStoppableCard();

    let target = this.stopButtons.first();
    if (cardPartial) {
      // The deepest card container that shows this ending AND owns a STOP button.
      const container = this.page
        .locator("div")
        .filter({ hasText: new RegExp(cardPartial) })
        .filter({ has: this.page.getByRole("button", { name: /stop hand|stop$/i }) })
        .last();
      const scoped = container.getByRole("button", { name: /stop hand|stop$/i }).first();
      if (await scoped.isVisible().catch(() => false)) target = scoped;
    }

    await expect(target, "A card STOP button should be clickable").toBeVisible({ timeout: 15_000 });
    await target.click();

    // ASSERTION: the block-confirmation modal opened.
    await expect(this.blockModalText, "The 'block this card?' confirmation modal should open after STOP").toBeVisible({
      timeout: 15_000,
    });

    // Capture which card is being stopped (from "…block your card ending ****1071…") so the
    // block can be verified afterwards.
    const endingText = (await this.blockModalEnding.textContent().catch(() => "")) || "";
    const m = endingText.match(/ending\s*\*+\s*(\d{3,4})/i);
    this.stoppedCardEnding = (m && m[1]) || cardPartial || "";
  }

  /** Confirms the temporary-block intent in the modal (this triggers the OTP step). */
  async confirmStop() {
    await expect(this.confirmButton, "The modal's 'Confirm' button should be enabled").toBeEnabled({ timeout: 15_000 });
    await this.confirmButton.click();
  }

  /**
   * ASSERTION of SUCCESS: the stopped card now shows INACTIVE status in the list.
   * The app shows no success screen/toast for a card block - after the OTP it returns to
   * the Stop Card list where the blocked card is now INACTIVE and no longer has a STOP
   * button. Verifies the specific card captured at STOP time (falls back to a passed ending).
   * @param {string} [cardEnding]
   */
  async assertCardStopped(cardEnding) {
    const ending = cardEnding || this.stoppedCardEnding;

    // Wait for the list to come back after the OTP.
    await expect(this.heading, "The Stop Card list should reappear after confirming the block").toBeVisible({
      timeout: 30_000,
    });

    if (ending) {
      const inactiveCard = this.page
        .locator("div")
        .filter({ hasText: new RegExp(ending) })
        .filter({ hasText: /INACTIVE/i })
        .last();
      await expect(
        inactiveCard,
        `The stopped card ending ${ending} should now show INACTIVE status`
      ).toBeVisible({ timeout: 30_000 });

      // And it should no longer offer a STOP action.
      const stillStoppable = this.page
        .locator("div")
        .filter({ hasText: new RegExp(ending) })
        .filter({ has: this.page.getByRole("button", { name: /stop hand|stop$/i }) });
      await expect(stillStoppable, `The stopped card ending ${ending} should no longer have a STOP button`).toHaveCount(
        0,
        { timeout: 15_000 }
      );
      return;
    }

    // No ending captured - fall back to a general INACTIVE status being present.
    await expect(
      this.page.getByText(/INACTIVE/i).first(),
      "A card should now show INACTIVE status after being stopped"
    ).toBeVisible({ timeout: 30_000 });
  }

  /** Cancels the block via the modal's "Back" button (no card is blocked, no OTP). */
  async cancelStop() {
    await expect(this.backButton, "The modal's 'Back' button should be available").toBeVisible({ timeout: 10_000 });
    await this.backButton.click();
    // ASSERTION: the modal closed without triggering an OTP.
    await expect(this.blockModalText, "The block-confirmation modal should close on Back").toBeHidden({
      timeout: 10_000,
    });
    await expect(
      this.page.locator("input.otp-box").first(),
      "No OTP should be requested when the block is cancelled"
    ).toBeHidden();
  }
}

module.exports = { StopCardPage };
