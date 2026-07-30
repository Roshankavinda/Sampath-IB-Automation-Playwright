// @ts-check
const { defineConfig, devices } = require("@playwright/test");
require("dotenv").config();
const TIMEOUTS = require("./config/timeouts");

/**
 * Sampath Vishwa Retail Web - Playwright configuration.
 *
 * Only the FIRST page (login) is opened via URL (config.use.baseURL).
 * Every subsequent page is reached by CLICKING in the UI, and each page
 * is validated by asserting a heading / key element (not by URL).
 */

// Regression mode (SUITE=regression) runs ONLY the aggregator files
// (tests/*/regression.spec.js), which require every feature spec. A normal run does the
// opposite: it runs the individual feature specs and skips the aggregators, so the suite is
// never counted twice.
const isRegression = process.env.SUITE === "regression";

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: isRegression ? "**/regression.spec.js" : "**/*.spec.js",
  testIgnore: isRegression ? undefined : "**/regression.spec.js",
  timeout: TIMEOUTS.TEST,
  expect: { timeout: TIMEOUTS.EXPECT },

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
    actionTimeout: TIMEOUTS.ACTION,
    navigationTimeout: TIMEOUTS.NAV,

    // Evidence for the final report
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
