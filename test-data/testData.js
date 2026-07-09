require("dotenv").config();

/**
 * ============================================================
 *  EDIT YOUR TEST DATA HERE
 *  All dropdown values are PARTIAL label matches - the account
 *  number or part of the name shown in the dropdown is enough.
 * ============================================================
 */

const credentials = {
  // Set IB_USERNAME / IB_PASSWORD / IB_OTP in your local .env file (see .env.example).
  // No real credentials are hardcoded here - this repo is safe to share/push.
  username: process.env.IB_USERNAME || "",
  password: process.env.IB_PASSWORD || "",
  otp: process.env.IB_OTP || "111111", // Login & transaction OTP (bypassed in UAT)
};

const invalidCredentials = {
  username: "invaliduser01",
  password: "Wrong@1234",
};

/** Flow 1: Send Money > Own Account */
const ownTransfer = {
  fromAccount: "1018 5010 4310",
  toAccount: "0018 5002 2719",
  amount: "100",
  senderRemark: "PW Own Transfer",
  beneficiaryRemark: "PW Own Transfer",
};

/** Flow 2: Send Money > Other Accounts (other bank - branch + manual beneficiary name) */
const otherBankTransfer = {
  fromAccount: "1018 5010 4310",
  bank: "TEST BANK B",             // EDIT: part of the bank option label
  toAccountNumber: "9901234561",
  beneficiaryName: "Test User", // typed manually for other banks
  amount: "100",
  purpose: "Wages & Salaries",     // part of the purpose option label
  beneficiaryRemark: "PW Other Bank",
};

/** Flow 3: Bill Payment — Cable TV > Dialog TV */
const billPayment = {
  category: "Cable - TV",           // exact label as shown on screen
  biller: "Dialog TV",              // EDIT: exact biller name once the category opens
  fromAccount: "1018 5010 4310",
  referenceFieldName: "Account No", // EDIT: exact reference field label for Dialog TV
  referenceValue: "60688381",       // EDIT: your Dialog TV account number
  amount: "500",                    // EDIT: amount (if editable)
};

/** Flow 4: Send Money > Other Credit Cards (pay a credit card by card number) */
const otherCreditCardTransfer = {
  fromAccount: "1018 5010 4310",
  cardNumber: "4111111111111111", // VERIFY: beneficiary credit card number field
  beneficiaryName: "Card Holder",  // typed manually
  amount: "100",
  beneficiaryRemark: "PW Credit Card",
};

/** Flow 5: Send Money > Mobile Cash (cardless cash to a mobile number) */
const mobileCash = {
  fromAccount: "1018 5010 4310",
  mobileNumber: "0771234567",     // VERIFY: recipient mobile number field
  amount: "1000",                  // Mobile Cash usually has fixed denominations
  remark: "PW Mobile Cash",
};

/** Flow 6: Payees & Billers — add a new payee (beneficiary) */
const newPayee = {
  payeeType: "Other Bank",        // VERIFY: option label (Own Bank / Other Bank / etc.)
  bank: "TEST BANK B",            // part of the bank option label
  accountNumber: "9901234561",
  beneficiaryName: "Saved Payee One",
  nickname: "PW Saved Payee",     // display name / nickname for the saved payee
};

/** Flow 7: Send Money > Saved Payees — transfer to an already-saved payee */
const savedPayeeTransfer = {
  fromAccount: "1018 5010 4310",
  payeeName: "PW Saved Payee",    // must match a saved payee's nickname/name
  amount: "100",
  beneficiaryRemark: "PW To Saved Payee",
};

/** Flow 8: Scheduled / recurring transfer (reuses own-transfer accounts) */
const scheduledTransfer = {
  fromAccount: "1018 5010 4310",
  toAccount: "0018 5002 2719",
  amount: "100",
  senderRemark: "PW Scheduled",
  beneficiaryRemark: "PW Scheduled",
  // Provide a base date; specs offset from it so runs stay deterministic in reports.
  baseDate: "2026-07-08",
  effectiveInDays: 3,             // scheduled date = baseDate + 3 days
  frequency: "Monthly",           // for recurring: VERIFY option label
  endInDays: 90,                  // recurring end date = baseDate + 90 days
};

/** Flow 9: Quick Actions > Fixed Deposit (open a new FD) */
const fixedDeposit = {
  fromAccount: "1018 5010 4310",
  amount: "10000",
  period: "12",                   // VERIFY: tenure/period option (months) label
  maturityInstruction: "Renew Principal Only", // VERIFY: maturity option label
};

/** Flow 10: Quick Actions > Stop Cheque */
const stopCheque = {
  account: "1018 5010 4310",
  chequeNumber: "123456",         // VERIFY: cheque number field
  reason: "Lost",                 // VERIFY: reason option label
};

/**
 * Negative / validation data. Each block intentionally triggers a specific
 * validation error; specs assert the app rejects the transaction.
 */
const negativeTransfers = {
  insufficientFunds: {
    fromAccount: "1018 5010 4310",
    toAccount: "0018 5002 2719",
    amount: "999999999",          // above available balance
    senderRemark: "PW Neg InsufficientFunds",
    beneficiaryRemark: "PW Neg InsufficientFunds",
    expectedError: /insufficient|balance|exceed/i,
  },
  invalidOtherBankAccount: {
    fromAccount: "1018 5010 4310",
    bank: "TEST BANK B",
    toAccountNumber: "1",         // clearly invalid account number
    beneficiaryName: "Neg Test",
    amount: "100",
    purpose: "Wages & Salaries",
    beneficiaryRemark: "PW Neg InvalidAccount",
    expectedError: /invalid|not valid|account number|not found/i,
  },
  zeroAmount: {
    fromAccount: "1018 5010 4310",
    toAccount: "0018 5002 2719",
    amount: "0",                  // below minimum
    senderRemark: "PW Neg ZeroAmount",
    beneficiaryRemark: "PW Neg ZeroAmount",
    expectedError: /minimum|greater than|amount|valid/i,
  },
};

module.exports = {
  credentials,
  invalidCredentials,
  ownTransfer,
  otherBankTransfer,
  billPayment,
  otherCreditCardTransfer,
  mobileCash,
  newPayee,
  savedPayeeTransfer,
  scheduledTransfer,
  fixedDeposit,
  stopCheque,
  negativeTransfers,
};
