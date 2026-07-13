# Sampath Vishwa Retail Web — Playwright Automation

Automated end-to-end tests for **Sampath Vishwa Retail Web (Internet Banking)** built with **Playwright** and the **Page Object Model (POM)** in JavaScript.

Navigation is done by **clicking through the UI** (only the login page is opened by URL). Every page is validated with **assertions on headings / key elements** — no URL assertions.

## Phase 1 scope

Positive paths and negative/validation cases are split into **two folders**
(`tests/positive/` and `tests/negative/`), one `<feature>.spec.js` per feature in each,
and every page object asserts key UI elements.

| Feature | Positive spec | Negative spec |
|---------|-----------|---------------|
| Login (Username & Password) | `positive/login.spec.js` | `negative/login.spec.js` |
| Forgot Password | `positive/forgotPassword.spec.js` | `negative/forgotPassword.spec.js` |
| Dashboard (all validations) | `positive/dashboard.spec.js` | `negative/dashboard.spec.js` |
| Fund Transfer - Own Account | `positive/fundTransferOwnAccount.spec.js` | `negative/fundTransferOwnAccount.spec.js` |
| Fund Transfer - Intra Bank (Sampath) | `positive/fundTransferIntraBank.spec.js` | `negative/fundTransferIntraBank.spec.js` |
| Fund Transfer - Other Bank | `positive/fundTransferOtherBank.spec.js` | `negative/fundTransferOtherBank.spec.js` |
| Fund Transfer - Mobile Cash | `positive/fundTransferMobileCash.spec.js` | `negative/fundTransferMobileCash.spec.js` |
| Fund Transfer - Other Bank Credit Card | `positive/fundTransferOtherCreditCard.spec.js` | `negative/fundTransferOtherCreditCard.spec.js` |
| Own Card Settlement | `positive/ownCardSettlement.spec.js` | `negative/ownCardSettlement.spec.js` |
| Stop Card (Credit/Debit/Web) | `positive/stopCard.spec.js` | `negative/stopCard.spec.js` |
| Bill Payment (Dialog & Mobitel) | `positive/billPayment.spec.js` | `negative/billPayment.spec.js` |
| Add New Payee (Payees & Billers) | `positive/addPayee.spec.js` | `negative/addPayee.spec.js` |
| Add New Biller (Payees & Billers) | `positive/addBiller.spec.js` | `negative/addBiller.spec.js` |

> ⚠️ **Some selectors are still inferred rather than confirmed against the live DOM.**
> Every place that needs confirming against the real UAT app is marked with a `// VERIFY`
> comment in the page object, or an inline note in `test-data/testData.js`. Run each flow
> once in `--headed --slowmo` and adjust the flagged `name`/label values as needed.

### Entering the OTP by hand

A real OTP is sent to the registered phone. To type it in yourself instead of using the
UAT bypass code, run headed with manual-OTP mode — the test pauses at the OTP popup until
you enter the code and click Confirm:

```bash
npm run test:manual-otp                 # whole suite, headed, one worker
IB_MANUAL_OTP=true npx playwright test tests/positive/fundTransferOwnAccount.spec.js --headed
```

`IB_MANUAL_OTP_TIMEOUT` (default `180000` ms) controls how long it waits for you.

## Project structure

```
sampath-ib-automation/
├── playwright.config.js        # Runner config: login URL, timeouts, reporters, evidence
├── .env.example                # Copy to .env — URL / credentials / OTP
├── package.json                # Scripts
├── test-data/
│   └── testData.js             # ★ EDIT HERE: accounts, banks, cards, billers, amounts + negative data
├── pages/                      # Page Objects (one per screen)
│   ├── LoginPage.js             # + Forgot Password link
│   ├── ForgotPasswordPage.js    # reset flow (username → OTP → new password)
│   ├── DashboardPage.js         # top-nav + Quick Actions + assertAllValidations()
│   ├── SendMoneyPage.js         # shared Send Money tabs (Own / Other / Cards / Mobile Cash / Own Cards)
│   ├── OwnAccountPage.js        # Own Account transfer
│   ├── OtherBankTransferPage.js # Other Accounts — Intra Bank (auto-fetch) & Other Bank (typed)
│   ├── OtherCreditCardsPage.js  # Other Bank Credit Card
│   ├── MobileCashPage.js        # Mobile Cash
│   ├── OwnCardSettlementPage.js # Own Card Settlement
│   ├── StopCardPage.js          # Stop Card (Credit / Debit / Web)
│   ├── BillPaymentPage.js       # Bill Payment (Dialog & Mobitel)
│   └── ConfirmationPopup.js     # transaction OTP + success (shared)
├── tests/                      # Specs — one <feature>.spec.js per feature in each folder
│   ├── positive/                  # positive-path spec per feature
│   └── negative/               # negative / validation spec per feature
└── utils/
    ├── helpers.js              # OTP filler, dropdown-by-label, validation-error assert,
    │                           # toast capture, submitAndExpectRejection, attachToastOnFailure
    └── fixtures.js             # "loggedInDashboard" fixture (shared login)
```

---

## Setup (step by step)

### 1. Prerequisites
- Install **Node.js 18 or newer** — check with `node -v`.
- Have this project folder open in VS Code (or any terminal).

### 2. Install dependencies
In the project folder, run:
```bash
npm install
```

### 3. Install the Playwright browser
```bash
npx playwright install chromium
```

### 4. Create your `.env` file
Copy the example and edit if needed:
```bash
cp .env.example .env
```
`.env` contents (replace with your own UAT credentials - never commit real values):
```
BASE_URL=http://your-uat-host:4200/SVRClientWebV4/home
IB_USERNAME=your-username
IB_PASSWORD=your-password
IB_OTP=111111
```
> `.env` is gitignored. Without it, `BASE_URL` falls back to the default in `playwright.config.js`, and `IB_USERNAME`/`IB_PASSWORD` are empty until you set them.

### 5. Edit your test data
Open **`test-data/testData.js`** and set your accounts / bank / biller values. Every dropdown value is a **partial match**, so the account number or part of the name shown in the dropdown is enough. If a value doesn't match, the error message lists all available options so you can copy the right one.

---

## Running the tests

Run everything (GUI/headed by default):
```bash
npm test
```

Run only the positive paths, or only the negative/validation cases:
```bash
npm run test:positive        # every *.positive.spec.js
npm run test:negative     # every *.negative.spec.js
```

Run one feature (both its positive + negative specs open the browser so you can watch):
```bash
npm run test:login          # Login
npm run test:forgot         # Forgot Password
npm run test:dashboard      # Dashboard (all validations)
npm run test:own            # Fund Transfer - Own Account
npm run test:intra          # Fund Transfer - Intra Bank (Sampath)
npm run test:otherbank      # Fund Transfer - Other Bank
npm run test:mobilecash     # Fund Transfer - Mobile Cash
npm run test:cards          # Fund Transfer - Other Bank Credit Card
npm run test:cardsettlement # Own Card Settlement
npm run test:stopcard       # Stop Card (Credit / Debit / Web)
npm run test:billpay        # Bill Payment (Dialog & Mobitel)
```

Run a single test by title:
```bash
npx playwright test -g "TC_FT_OWN_H01" --headed
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

---

## The report

After any run, open the HTML report:
```bash
npm run report
```
It shows every named step (login → navigate → fill → submit → OTP → success). On failure you get the failing step, the captured **toast message**, a **screenshot**, a **video**, and a **trace** (open it for a full step-by-step timeline). A machine-readable summary is written to `test-results/results.json`.

---

## Design notes

- **Click-based navigation.** Only the login page is opened by URL. Dashboard → Send Money / Bill Payment is done through the **Quick Actions** menu, exactly like a user.
- **Assertions on every page.** Each page object exposes `assertLoaded()` that checks a heading or key field (e.g. "Make Transactions" for Send Money, the billers heading for Bill Payment). Forms also assert entered values and, for own transfers, that From ≠ To.
- **Shared login fixture.** `utils/fixtures.js` provides `loggedInDashboard`, so each flow test starts from an already-validated dashboard without repeating login code.
- **No hard waits.** All interactions use Playwright's auto-waiting and explicit `expect(...)` visibility/enabled checks; dropdown options are polled until loaded before selecting.
- **Stable locators.** Tabs/buttons use `getByRole("button", { name, exact: true })`; form fields use their real `name` attributes taken from the application source.

## Note on current environment issues

If the banking environment currently has open backend defects (e.g. transaction validation or OTP-service failures), the transfer/bill-payment tests will fail at the **Submit / OTP** step and the report will capture the app's error toast as evidence. Once those are fixed, the same suite passes end-to-end with no code changes — it doubles as your regression retest.
