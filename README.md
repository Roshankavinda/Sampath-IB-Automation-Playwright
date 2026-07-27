# Sampath Vishwa Retail Web — Playwright Automation

Automated end-to-end tests for **Sampath Vishwa Retail Web (Internet Banking)** built with **Playwright** and the **Page Object Model (POM)** in JavaScript.

Navigation is done by **clicking through the UI** (only the login page is opened by URL). Every page is validated with **assertions on headings / key elements** — no URL assertions.

**Suite size:** 73 tests across 47 spec files — **43 positive** and **30 negative** — covering 25 features.

## Features & coverage

Positive paths and negative/validation cases are split into two folders — `tests/positive/` and `tests/negative/` — with one `<feature>.spec.js` per feature in each.

| Feature | Positive | Negative | Spec file |
|---------|:---:|:---:|-----------|
| Login (Username & Password) | ✅ | ✅ | `login.spec.js` |
| Forgot Password | ✅ | ✅ | `forgotPassword.spec.js` |
| Dashboard (all validations) | ✅ | ✅ | `dashboard.spec.js` |
| Fund Transfer — Own Account | ✅ | ✅ | `fundTransferOwnAccount.spec.js` |
| Fund Transfer — Intra Bank (Sampath) | ✅ | ✅ | `fundTransferIntraBank.spec.js` |
| Fund Transfer — Other Bank | ✅ | ✅ | `fundTransferOtherBank.spec.js` |
| Fund Transfer — Mobile Cash | ✅ | ✅ | `fundTransferMobileCash.spec.js` |
| Fund Transfer — Other Bank Credit Card | ✅ | ✅ | `fundTransferOtherCreditCard.spec.js` |
| Own Card Settlement | ✅ | ✅ | `ownCardSettlement.spec.js` |
| Stop Card (Credit / Debit / Web) | ✅ | ✅ | `stopCard.spec.js` |
| Bill Payment (Dialog & Mobitel) | ✅ | ✅ | `billPayment.spec.js` |
| Add New Payee | ✅ | ✅ | `addPayee.spec.js` |
| Add New Biller | ✅ | ✅ | `addBiller.spec.js` |
| Fund Transfer by Saved Payee | ✅ | ✅ | `transferSavedPayee.spec.js` |
| Bill Payment by Saved Biller | ✅ | ✅ | `billPaymentSavedBiller.spec.js` |
| Schedule Payment — Fund Transfer (Own / Intra / Other, single + recurring) | ✅ | ✅ | `scheduleFundTransfer.spec.js` |
| Schedule Payment — Bill Payment (single + recurring) | ✅ | ✅ | `scheduleBillPayment.spec.js` |
| Manage Schedules — Fund Transfer (Pay Now / Skip / Stop / Modify) | ✅ | — | `manageScheduleFundTransfer.spec.js` |
| Manage Schedules — Biller (Pay Now / Skip / Stop / Modify) | ✅ | — | `manageScheduleBiller.spec.js` |
| FD Create (Open New Fixed Deposit) | ✅ | ✅ | `fdCreate.spec.js` |
| Loan Settlement | ✅ | — | `loanSettlement.spec.js` |
| Web Card Opening (Apply Web Card) | ✅ | ✅ | `webCardOpening.spec.js` |
| Slipless Banking (Deposit & Withdrawal) | ✅ | ✅ | `slipless.spec.js` |
| Self Services (Tax Certificate & Balance Confirmation) | ✅ | ✅ | `selfServices.spec.js` |
| Secure Messaging (Send & Reply) | ✅ | ✅ | `messages.spec.js` |

> Three features have no negative spec yet — **Loan Settlement**, **Manage Schedules (Fund Transfer)** and **Manage Schedules (Biller)** — because they are currently blocked by missing backend data (no loans / empty schedule lists), so a negative case can't be authored against the real DOM.

### OTP handling

- **Login OTP** — always auto-filled with the UAT bypass code (`111111`). Nothing to do.
- **Transaction OTP** (fund transfers, bill payments, card settlement, stop card, add payee/biller,
  saved payee/biller, slipless, messages, …) — **entered manually by default.** A real OTP is sent to
  your phone; the test pauses at the OTP popup until you type it in the browser and click Confirm, then
  continues. Because it pauses, run these headed (all the per-feature `npm run test:*` scripts already
  pass `--headed`):

  ```bash
  npm run test:own          # pauses for you to enter the transaction OTP
  npm run test:savedpayee
  ```

  `IB_MANUAL_OTP_TIMEOUT` (default `180000` ms) sets how long it waits for you.

- **Unattended / CI run** — set `IB_MANUAL_OTP=false` to auto-fill the bypass code for transaction OTP
  too (no pausing):

  ```bash
  npm run test:auto-otp
  IB_MANUAL_OTP=false npx playwright test tests/negative
  ```

## Project structure

```
sampath-ib-automation/
├── playwright.config.js        # Runner config: login URL, timeouts, reporters (list/html/json/allure)
├── .env / .env.example         # BASE_URL + optional overrides (see "Environment" below)
├── package.json                # npm scripts
├── test-data/                  # ★ EDIT HERE — one JSON file per feature, imported by name
│   ├── accounts.json           #   ★ all logins: credentials (gsuser4), invalidCredentials,
│   │                           #     webCard (v11user8), debitCardUser (v11user8)
│   ├── negative.json           #   shared negative/validation data (error patterns as strings)
│   ├── mobileCash.json         #   … one file per feature (ownTransfer, billPayments, stopCard, …)
│   └── …
├── pages/                      # Page Objects (one per screen) — 25 files
│   ├── LoginPage.js  ForgotPasswordPage.js  DashboardPage.js
│   ├── SendMoneyPage.js  OwnAccountPage.js  OtherBankTransferPage.js  OtherCreditCardsPage.js
│   ├── MobileCashPage.js  OwnCardSettlementPage.js  StopCardPage.js  BillPaymentPage.js
│   ├── AddPayeePage.js  AddBillerPage.js  SavedPayeeTransferPage.js  SavedBillerPaymentPage.js
│   ├── ScheduleModal.js  ManageSchedulePage.js  FixedDepositPage.js  LoanSettlementPage.js
│   ├── WebCardPage.js  SliplessPage.js  TaxCertificatePage.js  BalanceConfirmationPage.js  MessagesPage.js
│   └── ConfirmationPopup.js    # shared transaction OTP + success popup
├── tests/
│   ├── positive/               # positive-path spec per feature + regression.spec.js
│   └── negative/               # negative / validation spec per feature + regression.spec.js
└── utils/
    ├── helpers.js              # OTP filler, dropdown-by-label, validation-error assert, toRegExp,
    │                           # random nickname, success-message wait, submitAndExpectRejection, …
    └── fixtures.js             # "loggedInDashboard" fixture (shared gsuser4 login)
```

---

## Setup (step by step)

### 1. Prerequisites
- Install **Node.js 18 or newer** — check with `node -v`.
- **Java 11+** — only needed to view the Allure report (`java -version`).

### 2. Install dependencies
```bash
npm install
```

### 3. Install the Playwright browser
```bash
npx playwright install chromium
```

### 4. Create your `.env` file
```bash
cp .env.example .env
```
`.env` mainly holds the app URL:
```
BASE_URL=http://3.130.59.179:4200/SVRClientWebV4/home
```
> `.env` is gitignored. Without it, `BASE_URL` falls back to the default in `playwright.config.js`.
> Runtime toggles are also read from the environment: `IB_MANUAL_OTP`, `IB_MANUAL_OTP_TIMEOUT`.

### 5. Set your test data
Test data lives in **`test-data/*.json`**, one file per feature, imported into each spec by name
(e.g. `const mobileCash = require("../../test-data/mobileCash")`).

- **Logins** — edit **`test-data/accounts.json`** (`credentials` = gsuser4; `webCard`/`debitCardUser`
  = v11user8). Credentials are stored here, **not** in `.env`.
- **Feature values** (accounts, banks, cards, billers, amounts) — edit the matching feature file,
  e.g. `test-data/ownTransfer.json`, `test-data/billPayments.json`.
- **Negative/validation data** — `test-data/negative.json` (the `expectedError` fields are string
  patterns, compiled to case-insensitive RegExps at runtime by `helpers.toRegExp`).

Every dropdown value is a **partial match**, so the account number or part of the name shown in the
dropdown is enough. If a value doesn't match, the error message lists all available options.

---

## Running the tests

Run everything (GUI/headed by default):
```bash
npm test
```

Run only the positive paths, or only the negative/validation cases:
```bash
npm run test:positive        # every spec in tests/positive
npm run test:negative        # every spec in tests/negative
```

Run one feature (opens the browser so you can watch and enter OTPs):
```bash
npm run test:login          # Login              npm run test:payee         # Add New Payee
npm run test:forgot         # Forgot Password    npm run test:biller        # Add New Biller
npm run test:dashboard      # Dashboard          npm run test:savedpayee    # Saved-payee transfer
npm run test:own            # FT — Own Account   npm run test:savedbiller   # Saved-biller payment
npm run test:intra          # FT — Intra Bank    npm run test:messages      # Secure Messaging
npm run test:otherbank      # FT — Other Bank    npm run test:selfservice   # Self Services
npm run test:mobilecash     # FT — Mobile Cash   npm run test:slipless      # Slipless banking
npm run test:cards          # FT — Other Card    npm run test:webcard       # Web Card opening
npm run test:cardsettlement # Own Card Settlement
npm run test:stopcard       # Stop Card
npm run test:billpay        # Bill Payment
```

Run a single test by title:
```bash
npx playwright test -g "TC_FT_OWN_H01"
```

Interactive UI mode (best for debugging — pick and re-run individual tests, scrub the timeline):
```bash
npm run test:ui
```

Slow the actions down so you can follow them:
```bash
npx playwright test -g "TC_FT_OWN_H01" --headed --slowmo=500
```

Run headless (e.g. for CI):
```bash
npx playwright test --headless
```

> **Note:** passing `--reporter=...` on the command line *replaces* the config reporters, so the
> HTML/JSON/Allure reports won't be produced. Just run `playwright test` (or the npm scripts), or use
> `--reporter=line,allure-playwright` if you need to add one.

---

## Regression suites

Two aggregator files run the whole positive or negative suite from a single entry point
(`tests/positive/regression.spec.js` and `tests/negative/regression.spec.js`, each `require`-ing every
feature spec under an `@Regression` group):

```bash
npm run test:regression            # full regression (positive + negative) — 73 tests
npm run test:regression:positive   # positive only — 43 tests
npm run test:regression:negative   # negative only — 30 tests
```

These are driven by the `SUITE=regression` environment flag. In a **normal** run the aggregators are
ignored and the individual feature specs run instead, so nothing is ever counted twice
(see `testMatch` / `testIgnore` in `playwright.config.js`). When you add a new feature spec, add one
`require("./newFeature.spec");` line to the matching `regression.spec.js`.

---

## Reports

**Playwright HTML report** (after any run):
```bash
npm run report
```
It shows every named step (login → navigate → fill → submit → OTP → success). On failure you get the
failing step, the captured **toast message**, a **screenshot**, a **video**, and a **trace**. A
machine-readable summary is written to `test-results/results.json`.

**Allure report** (richer history/trends; needs Java):
```bash
npm run allure:serve      # build + open a temporary report from ./allure-results
npm run allure:report     # build a static report into ./allure-report
npm run allure:open       # open the static ./allure-report
npm run allure:clean      # wipe allure-results + allure-report
npm run test:allure       # clean → run all tests → open the Allure report
```

`allure-results/`, `allure-report/`, `test-results/` and `playwright-report/` are all git-ignored.

---

## Design notes

- **Click-based navigation.** Only the login page is opened by URL. Dashboard → Send Money / Bill
  Payment / Quick Actions is done through the UI, exactly like a user.
- **Assertions on every page.** Each page object exposes `assertLoaded()` that checks a heading or key
  field. Forms also assert entered values.
- **Shared login fixture.** `utils/fixtures.js` provides `loggedInDashboard` (gsuser4), so most flows
  start from an already-validated dashboard. Flows that need a different account (Web Card / Stop-Card
  Debit) log in explicitly with the profile from `accounts.json`.
- **Manual transaction OTP.** Real OTPs are entered by hand by default (see "OTP handling"); only the
  login OTP is auto-bypassed.
- **No hard waits.** All interactions use Playwright's auto-waiting and explicit `expect(...)` checks;
  async dropdowns are polled until populated before selecting.
- **Stable locators.** Buttons/tabs use `getByRole(...)`; form fields use their real `name` attributes
  from the application source. Visible-only matching avoids the app's many hidden nav duplicates.

## Note on current environment issues

The UAT backend has intermittent defects — most transaction Submits return a **"Session TimeOut"** and
bounce to the dashboard, and some lookups (e.g. the intra-bank beneficiary-name fetch) return nothing.
When that happens the affected tests fail at the **Submit / OTP** step (or a data step) and the report
captures the app's error as evidence, with a clear message distinguishing an environment/backend issue
from a locator problem. Once the backend is healthy, the same suite passes end-to-end with no code
changes — it doubles as your regression retest.
