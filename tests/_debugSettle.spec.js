const { test } = require("../utils/fixtures");
const { OwnCardSettlementPage } = require("../pages/OwnCardSettlementPage");
const { ownCardSettlement } = require("../test-data/testData");
const fs = require("fs");

/** TEMP debug: click Next on the Settle modal and capture what the app does. */
test("debug settle next", async ({ page, loggedInDashboard }) => {
  const log = (m) => fs.appendFileSync("/private/tmp/settle-next.log", m + "\n");
  fs.writeFileSync("/private/tmp/settle-next.log", "");

  // Capture POST responses (Next likely fires a Server Action / API call).
  page.on("response", async (res) => {
    try {
      const req = res.request();
      if (req.method() !== "POST") return;
      let body = "";
      try {
        body = (await res.text()).slice(0, 500);
      } catch {}
      log(`RES ${res.status()} ${req.url()}\n   BODY: ${body}\n`);
    } catch {}
  });

  const settle = new OwnCardSettlementPage(page);
  await loggedInDashboard.goToCreditCards();
  await settle.assertLoaded();
  await settle.selectCard(ownCardSettlement.card);
  await settle.clickSettle();
  await settle.fillSettlement(ownCardSettlement);

  log("=== clicking Next ===");
  await settle.submitButton.click();

  // Watch the screen for 8s after Next.
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(1000);
    const modalVisible = await page.locator("div.fixed.inset-0.z-50").first().isVisible().catch(() => false);
    const url = page.url();
    let modalText = "";
    if (modalVisible) modalText = (await page.locator("div.fixed.inset-0.z-50").first().innerText().catch(() => "")).slice(0, 300);
    const otp = await page.locator('input[maxlength="1"]').count().catch(() => 0);
    log(`t=${i + 1}s url=${url} modal=${modalVisible} otpBoxes=${otp} modalText=${JSON.stringify(modalText)}`);
  }
});
