# Sampath Vishwa Retail Web — Playwright Automation

Automated end-to-end tests for **Sampath Vishwa Retail Web (Internet Banking)** built with **Playwright** and the **Page Object Model (POM)** in JavaScript.

Navigation is done by **clicking through the UI** (only the login page is opened by URL). Every page is validated with **assertions on headings / key elements** — no URL assertions.

## Automated flows

| Test ID | Flow | Type |
|---------|------|------|
| TC_LOGIN_01 | Valid login → dashboard | happy |
| TC_LOGIN_02 | Invalid login → failure message | negative |
| TC_OWN_01 | Login → Own Fund Transfer (One-time) | happy |
| TC_OTHER_01 | Login → Other Bank Transfer (One-time) | happy |
| TC_BILL_01 | Login → Bill Payment (One-time) | happy |
| **TC_CARD_01** | **Login → Send Money → Other Credit Cards** (One-time) | happy |
| **TC_MCASH_01** | **Login → Send Money → Mobile Cash** (One-time) | happy |
| **TC_PAYEE_01** | **Login → Payees & Billers → Add Payee** | happy |
| **TC_SAVED_01** | **Login → Send Money → Saved Payees → transfer** (One-time) | happy |
| **TC_SCHED_01** | **Login → Own Transfer → Scheduled (future-dated)** | happy |
| **TC_SCHED_02** | **Login → Own Transfer → Recurring (frequency + end date)** | happy |
| **TC_FD_01** | **Login → Quick Actions → Fixed Deposit** (open FD) | happy |
| **TC_STOPCHQ_01** | **Login → Quick Actions → Stop Cheque** | happy |
| **TC_NEG_01** | **Own transfer above available balance → rejected** | negative |
| **TC_NEG_02** | **Other-bank transfer to invalid account → rejected** | negative |
| **TC_NEG_03** | **Own transfer with zero/below-min amount → blocked** | negative |
| **TC_NEG_04** | **Empty transfer form → Submit stays disabled** | negative |

> ⚠️ **Selectors in the new flows are inferred from the existing patterns, not from the live DOM.**
> Every place that needs confirming against the real UAT app is marked with a `// VERIFY`
> comment in the page object, or an inline note in `test-data/testData.js`. Run each new
> flow once in `--headed --slowmo` and adjust the flagged `name`/label values as needed.
> The confirmed flows (login, own/other transfer, bill payment) are untouched.

## Project structure

```
sampath-ib-automation/
├── playwright.config.js        # Runner config: login URL, timeouts, reporters, evidence
├── .env.example                # Copy to .env — URL / credentials / OTP
├── package.json                # Scripts
├── test-data/
│   └── testData.js             # ★ EDIT HERE: accounts, banks, billers, amounts
├── pages/                      # Page Objects (one per screen)
│   ├── LoginPage.js
│   ├── DashboardPage.js        # Quick Actions + top-nav navigation (click-based)
│   ├── SendMoneyPage.js        # shared Send Money tabs + heading assertion
│   ├── OwnAccountPage.js        # + scheduled/recurring transfer mode
│   ├── OtherBankTransferPage.js # + scheduled/recurring transfer mode
│   ├── OtherCreditCardsPage.js  # Send Money → Other Credit Cards
│   ├── MobileCashPage.js        # Send Money → Mobile Cash
│   ├── SavedPayeesPage.js       # Send Money → Saved Payees → transfer
│   ├── PayeesBillersPage.js     # Payees & Billers → add payee
│   ├── ManageSchedulesPage.js   # verify a scheduled/recurring transfer
│   ├── FixedDepositPage.js      # Quick Actions → Fixed Deposit
│   ├── StopChequePage.js        # Quick Actions → Stop Cheque
│   ├── BillPaymentPage.js
│   └── ConfirmationPopup.js    # transaction OTP + success (shared)
├── tests/                      # Specs (one flow per file)
│   ├── login.spec.js
│   ├── ownFundTransfer.spec.js
│   ├── otherBankTransfer.spec.js
│   ├── billPayment.spec.js
│   ├── otherCreditCards.spec.js
│   ├── mobileCash.spec.js
│   ├── payeesBillers.spec.js
│   ├── savedPayeesTransfer.spec.js
│   ├── scheduledTransfer.spec.js
│   ├── fixedDeposit.spec.js
│   ├── stopCheque.spec.js
│   └── negativeTransfers.spec.js
└── utils/
    ├── helpers.js              # OTP filler, dropdown-by-label, transfer-mode/date,
    │                           # validation-error assert, toast capture
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

Run one flow (each opens the browser so you can watch):
```bash
npm run test:login        # login only
npm run test:own          # Login → Own Fund Transfer
npm run test:otherbank    # Login → Other Bank Transfer
npm run test:billpay      # Login → Bill Payment
npm run test:cards        # Login → Other Credit Cards
npm run test:mobilecash   # Login → Mobile Cash
npm run test:payees       # Login → Payees & Billers → Add Payee
npm run test:savedpayee   # Login → Saved Payees transfer (run test:payees first)
npm run test:scheduled    # Login → Scheduled + Recurring own transfer
npm run test:fd           # Login → Fixed Deposit
npm run test:stopcheque   # Login → Stop Cheque
npm run test:negative     # Negative / validation cases
```

Run a single test by title:
```bash
npx playwright test -g "TC_OWN_01" --headed
```

Interactive UI mode (best for debugging — pick and re-run individual tests, scrub the timeline):
```bash
npm run test:ui
```

Slow the actions down so you can follow them:
```bash
npx playwright test -g "TC_OWN_01" --headed --slowmo=500
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
