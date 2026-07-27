// @ts-check
const { defineConfig, devices } = require("@playwright/test");
require("dotenv").config();

/**
 * Sampath Vishwa Retail Web - Playwright configuration.
 *
 * Only the FIRST page (login) is opened via URL (config.use.baseURL).
 * Every subsequent page is reached by CLICKING in the UI, and each page
 * is validated by asserting a heading / key element (not by URL).
 */
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 15_000 },

  fullyParallel: false,
  workers: 1, // single session against the stateful banking environment
  retries: 0,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
    // Allure results are written to ./allure-results. Turn them into a report with
    // `npm run allure:serve` (temporary) or `npm run allure:report` (static ./allure-report).
    ["allure-playwright", { resultsDir: "allure-results" }],
  ],

  use: {
    // The login page URL. Everything else is reached by clicking.
    baseURL: process.env.BASE_URL || "http://3.130.59.179:4200/SVRClientWebV4/home",
    headless: false, // GUI by default; CI can override with --headless
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    actionTimeout: 20_000,
    navigationTimeout: 45_000,

    // Evidence for the final report
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
