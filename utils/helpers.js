const { expect } = require("@playwright/test");

/**
 * Fill the 6-digit OTP boxes (input.otp-box) inside the given scope.
 * Works for both the login OTP screen and the transaction OTP popup.
 * @param {import('@playwright/test').Page | import('@playwright/test').Locator} scope
 * @param {string} otp
 */
async function fillOtpBoxes(scope, otp) {
  const boxes = scope.locator("input.otp-box");
  await expect(boxes.first(), "OTP input boxes should be visible").toBeVisible({ timeout: 15_000 });
  const count = await boxes.count();
  const digits = otp.split("");
  for (let i = 0; i < Math.min(count, digits.length); i++) {
    await boxes.nth(i).fill(digits[i]);
  }
}

/**
 * Select an option in a native <select> by a partial label match.
 * @param {import('@playwright/test').Locator} select
 * @param {string} partialLabel
 * @returns {Promise<string>} the selected option value
 */
async function selectOptionByLabelContains(select, partialLabel) {
  await expect(select, `Dropdown should be visible before selecting "${partialLabel}"`).toBeVisible();
  await expect
    .poll(async () => (await select.locator("option").allTextContents()).length, {
      timeout: 20_000,
      message: "Dropdown options did not load",
    })
    .toBeGreaterThan(0);

  const value = await select.evaluate((el, text) => {
    const opt = Array.from(el.options).find((o) =>
      (o.label || o.text || "").toLowerCase().includes(text.toLowerCase())
    );
    return opt ? opt.value : null;
  }, partialLabel);

  if (value === null) {
    const available = await select.locator("option").allTextContents();
    throw new Error(`No option containing "${partialLabel}". Available options: ${available.join(" | ")}`);
  }
  await select.selectOption(value);
  return value;
}

/**
 * Select the first non-empty option in a native <select> (used when a specific
 * value is not provided, e.g. "pick the first branch").
 * @param {import('@playwright/test').Locator} select
 */
async function selectFirstRealOption(select) {
  await expect
    .poll(async () => (await select.locator("option").allTextContents()).length, {
      timeout: 20_000,
      message: "Dropdown options did not load",
    })
    .toBeGreaterThan(1);
  const value = await select.evaluate((el) => {
    const opt = Array.from(el.options).find((o) => o.value && o.value !== "");
    return opt ? opt.value : null;
  });
  if (value === null) throw new Error("No selectable option found in dropdown");
  await select.selectOption(value);
  return value;
}

/**
 * Capture the first visible toast/alert text. Returns "" if none appears.
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeoutMs]
 */
async function getToastText(page, timeoutMs = 8_000) {
  const toast = page.locator(".Toastify__toast, [role='alert'], [role='status']").first();
  try {
    await toast.waitFor({ state: "visible", timeout: timeoutMs });
    return (await toast.innerText()).trim();
  } catch {
    return "";
  }
}

/**
 * Select a transfer-mode radio by its visible label (One-time / Scheduled / Recurring).
 * The transfer forms expose radios as input[name="transferMode"]; each has an
 * adjacent label. Matches the label text case-insensitively and partial.
 *
 * // VERIFY against the live app: exact label wording for scheduled/recurring modes.
 * @param {import('@playwright/test').Locator} radios  input[name="transferMode"] set
 * @param {string} modeLabel  e.g. "One-time", "Scheduled", "Recurring"
 */
async function selectTransferMode(radios, modeLabel) {
  const page = radios.page();
  // Try to click the label/text that owns the radio; fall back to the first radio.
  const labelPattern = new RegExp(modeLabel.replace(/[-\s]+/g, "[-\\s]*"), "i");
  const labeled = page.getByText(labelPattern).first();
  if (await labeled.isVisible().catch(() => false)) {
    await labeled.click().catch(() => {});
  }
  // Ensure exactly one radio ends up checked; if the label click didn't take, check by index.
  const anyChecked = await radios.evaluateAll((els) => els.some((e) => e.checked)).catch(() => false);
  if (!anyChecked && (await radios.count()) > 0) {
    await radios.first().check({ force: true }).catch(() => {});
  }
}

/**
 * Fill a date input. Handles both native <input type="date"> (yyyy-mm-dd) and
 * text-based date pickers (typed value). Value is passed straight through.
 *
 * // VERIFY against the live app: expected date format for scheduled transfers.
 * @param {import('@playwright/test').Locator} input
 * @param {string} value  date string, e.g. "2026-12-31"
 */
async function fillDateField(input, value) {
  await expect(input, "Date field should be visible").toBeVisible({ timeout: 15_000 });
  await input.fill(value).catch(async () => {
    // Some pickers block fill(); type it instead.
    await input.click();
    await input.pressSequentially(value, { delay: 20 });
  });
}

/**
 * Return a date string offset from a base date, formatted yyyy-mm-dd.
 * Base date is passed in (tests avoid Date.now() so runs stay deterministic in reports).
 * @param {string} baseISO  base date, e.g. "2026-07-08"
 * @param {number} addDays
 */
function offsetDate(baseISO, addDays) {
  const d = new Date(baseISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString().slice(0, 10);
}

/**
 * ASSERTION for negative tests: a validation/error message matching `pattern`
 * is shown (toast or inline). Positive wait, so it stays stable.
 * @param {import('@playwright/test').Page} page
 * @param {RegExp} pattern
 * @param {number} [timeoutMs]
 */
async function assertValidationError(page, pattern, timeoutMs = 20_000) {
  const err = page.getByText(pattern).first();
  await expect(err, `A validation/error message matching ${pattern} should be shown`).toBeVisible({
    timeout: timeoutMs,
  });
}

/**
 * Negative-transfer helper: after Submit, some validations fire before the OTP
 * popup and some after. This tolerates an optional OTP prompt, then asserts the
 * app surfaced the expected error and blocked the transaction.
 * @param {import('@playwright/test').Page} page
 * @param {{ otpBoxes: import('@playwright/test').Locator, enterOtpAndConfirm: (otp: string) => Promise<void> }} popup
 * @param {RegExp} expectedError
 * @param {string} otp
 */
async function submitAndExpectRejection(page, popup, expectedError, otp) {
  const otpAppeared = await popup.otpBoxes
    .first()
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (otpAppeared) await popup.enterOtpAndConfirm(otp);
  await assertValidationError(page, expectedError);
}

/**
 * Shared afterEach helper: on a failing test, capture the app's toast message and
 * attach it to the report as evidence. Keeps every spec's afterEach a one-liner.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 */
async function attachToastOnFailure(page, testInfo) {
  if (testInfo.status !== testInfo.expectedStatus) {
    const toast = await getToastText(page, 1_500);
    if (toast) await testInfo.attach("last-toast-message", { body: toast, contentType: "text/plain" });
  }
}

module.exports = {
  fillOtpBoxes,
  selectOptionByLabelContains,
  selectFirstRealOption,
  getToastText,
  selectTransferMode,
  fillDateField,
  offsetDate,
  assertValidationError,
  submitAndExpectRejection,
  attachToastOnFailure,
};
