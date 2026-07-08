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

module.exports = { fillOtpBoxes, selectOptionByLabelContains, selectFirstRealOption, getToastText };
