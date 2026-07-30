require("dotenv").config();

/**
 * Central timeout budget (milliseconds) for the whole suite.
 *
 * Edit values HERE to tune waits everywhere - no more hunting through page objects/specs.
 *   - IB_TIMEOUT_SCALE (e.g. 1.5) in .env stretches EVERY wait for a slow environment.
 *   - IB_MANUAL_OTP_TIMEOUT overrides just the manual-OTP pause.
 *
 * Buckets (by intent, not by magic number):
 *   QUICK      small settles / enabled-disabled checks
 *   UI         default element visibility
 *   ACTION     clicks / fills that can lag
 *   LOAD       async dropdowns / skeleton loaders
 *   SLOW_LOAD  slow headings / account lists
 *   VERY_SLOW  the slowest skeletons (e.g. Own Account "To" list)
 * Plus the global budgets used by playwright.config.js (TEST / NAV / EXPECT) and the
 * dedicated MANUAL_OTP pause.
 */
const raw = Number(process.env.IB_TIMEOUT_SCALE);
const scale = Number.isFinite(raw) && raw > 0 ? raw : 1;
const T = (ms) => Math.round(ms * scale);

module.exports = {
  // per-call element / operation waits
  QUICK: T(10_000),
  UI: T(15_000),
  ACTION: T(20_000),
  LOAD: T(30_000),
  SLOW_LOAD: T(60_000),
  VERY_SLOW: T(90_000),

  // global budgets (playwright.config.js)
  TEST: T(120_000),
  NAV: T(45_000),
  EXPECT: T(15_000),

  // the manual-OTP pause keeps its own dedicated env override
  MANUAL_OTP: Number(process.env.IB_MANUAL_OTP_TIMEOUT) || 180_000,
};
