require("dotenv").config();

/**
 * ============================================================
 *  EDIT YOUR TEST DATA HERE
 *  Scope (phase 1): Login, Forgot Password, Dashboard,
 *  Fund Transfer (Own / Intra Bank / Other Bank / Mobile Cash /
 *  Other Bank Credit Card), Own Card Settlement, Stop Card,
 *  Bill Payment (Dialog & Mobitel).
 *
 *  All dropdown values are PARTIAL label matches - the account
 *  number or part of the name shown in the dropdown is enough.
 *  Values marked // VERIFY must be confirmed against the live UAT app.
 * ============================================================
 */

/* ----------------------------------------------------------------
 * 1. Login
 * ---------------------------------------------------------------- */
const credentials = {
  // Set IB_USERNAME / IB_PASSWORD / IB_OTP in your local .env file (see .env.example).
  username: process.env.IB_USERNAME || "gsuser4",
  password: process.env.IB_PASSWORD || "Hoax@1234",
  otp: process.env.IB_OTP || "111111", // Login & transaction OTP (bypassed in UAT)
};

const invalidCredentials = {
  // IMPORTANT: never point this at the real IB_USERNAME. The app counts failed attempts
  // ("REMAINING LOGIN ATTEMPTS: 4") and locks the account, which would break every other
  // test. Use a throwaway username that exists but is not the one under test.
  wrongPassword: {
    username: process.env.IB_INVALID_USERNAME || "v11user8",
    password: "Wrong@1234",
  },
  unknownUser: {
    username: "invaliduser01",
    password: "Wrong@1234",
  },
};

/* ----------------------------------------------------------------
 * 2. Forgot Password
 * ---------------------------------------------------------------- */
const forgotPassword = {
  // A username the "Forgot Password" flow will accept (usually your own).
  username: process.env.IB_USERNAME || "gsuser4",
  nic: process.env.IB_NIC || "", // VERIFY: NIC / other identifier the reset form asks for
  // A username that must NOT be found by the reset flow.
  unknownUsername: "nouser_zzz999",
};

/* ----------------------------------------------------------------
 * 3. Fund Transfer - Own Account
 * ---------------------------------------------------------------- */
const ownTransfer = {
  fromAccount: "1018 5010 4310",
  toAccount: "1018 5525 0495",
  amount: "500",
  senderRemark: "PW Own Transfer",
  beneficiaryRemark: "PW Own Transfer",
};

/* ----------------------------------------------------------------
 * 4. Fund Transfer - Intra Bank (Sampath Bank, to another person)
 *    Same "Other Accounts" screen as Other Bank, but the bank is Sampath,
 *    so the beneficiary name is auto-fetched (read-only) instead of typed.
 * ---------------------------------------------------------------- */
const intraBankTransfer = {
  fromAccount: "1018 5010 4310",    // must be one of YOUR OWN accounts (the From dropdown)
  bank: "Sampath",                  // matches "SAMPATH BANK PLC - COMPANY NO PQ 144"
  toAccountNumber: "101358394971",  // the Sampath beneficiary account you send TO
  amount: "100",
  purpose: "Wages & Salaries",
  senderRemark: "PW Intra Bank",    // Sender Remark* is required on this form
  beneficiaryRemark: "PW Intra Bank",
};

/* ----------------------------------------------------------------
 * 5. Fund Transfer - Other Bank (SLIPS / CEFTS, manual beneficiary name)
 * ---------------------------------------------------------------- */
const otherBankTransfer = {
  fromAccount: "1018 5010 4310",
  bank: "TEST BANK B",              // EDIT: part of the other-bank option label
  toAccountNumber: "9901234561",
  beneficiaryName: "Test User",     // typed manually for other banks
  amount: "100",
  purpose: "Wages & Salaries",      // part of the purpose option label
  beneficiaryRemark: "PW Other Bank",
};

/* ----------------------------------------------------------------
 * 6. Fund Transfer - Mobile Cash (cardless cash to a mobile number)
 * ---------------------------------------------------------------- */
const mobileCash = {
  // From Account is a display card defaulted to your primary account (nothing to pick).
  nic: "199012345678",              // EDIT: receiver's NIC without V/X (9 or 12 digits)
  mobileNumber: "0771234567",       // receiver's mobile number
  receiverName: "PW Receiver",      // receiver's name
  purpose: "Family Remittances",    // Purpose*
  amount: "1000",
  remark: "PW Mobile Cash",
};

/* ----------------------------------------------------------------
 * 7. Fund Transfer - Other Bank Credit Card (pay another bank's card)
 * ---------------------------------------------------------------- */
const otherCreditCardTransfer = {
  fromAccount: "1018 5010 4310",    // From Account loads async (skeleton), defaults to primary
  bank: "Nations Trust",            // card-issuing bank (matches "NATIONS TRUST BANK")
  cardNumber: "376657973920377",   // input[name="CAN"] - beneficiary credit card number / CAN
  cardName: "Card Holder",          // input[name="cardName"] - name on card
  amount: "100",
  purpose: "Wages & Salaries",      // select[name="purposeofTransfer"]
  senderRemark: "PW Credit Card",
  beneficiaryRemark: "PW Credit Card",
};

/* ----------------------------------------------------------------
 * 8. Own Card Settlement (settle your OWN Sampath credit card)
 * ---------------------------------------------------------------- */
const ownCardSettlement = {
  // Flow: My Accounts > Credit Cards > select card > Settle > "Make payments to this card".
  card: "1071",                     // part of the card number shown on the card (5471 65XX XXXX 1071)
  fromAccount: "1018 5010 4310",    // funding account (select[name="account"] option)
  settlementType: "Minimum Payment", // "Last Statement O/S" | "Minimum Payment" | "Custom Amount"
  amount: "500",                    // used only when settlementType is "Custom Amount"
};

/* ----------------------------------------------------------------
 * 9. Stop Card (Credit / Debit / Web)
 * ---------------------------------------------------------------- */
const stopCard = {
  credit: {
    cardType: "Credit",             // VERIFY: card-type tab/option label
    card: "4321",                   // VERIFY: part of the card number shown in the list
    reason: "Lost",                 // VERIFY: reason option label
  },
  debit: {
    cardType: "Debit",
    card: "5678",
    reason: "Stolen",
  },
  web: {
    cardType: "Web",                // VERIFY: "Web Card" / "Virtual Card" label
    card: "9012",
    reason: "Suspected Fraud",
  },
};

/* ----------------------------------------------------------------
 * 10. Bill Payment - Dialog & Mobitel only
 * ---------------------------------------------------------------- */
const billPayments = {
  // Dialog and Mobitel both live under the "Telephone" category (there is no "Mobile"
  // category). Biller names are the full labels shown on the tiles.
  dialog: {
    category: "Telephone",
    biller: "Dialog Mobile",
    fromAccount: "1018 5010 4310",
    referenceFieldName: "Your GSM Phone Number", // located by name attr; label only
    referenceValue: "0771234567",   // EDIT: a valid Dialog number/account
    amount: "500",                  // EDIT: amount (if editable)
  },
  mobitel: {
    category: "Telephone",
    biller: "Mobitel Pvt Ltd",
    fromAccount: "1018 5010 4310",
    referenceFieldName: "Your GSM Phone Number", // located by name attr; label only
    referenceValue: "0712345678",   // EDIT: a valid Mobitel number/account
    amount: "500",                  // EDIT
  },
};

/* ----------------------------------------------------------------
 * 11. Add New Payee (Payees & Billers > Saved Payees > Add New Payee)
 * ---------------------------------------------------------------- */
const newPayee = {
  // An OTHER-BANK payee (mirrors the Other Bank transfer details).
  // NOTE: changing the Bank clears the Account Holder's Name, so the page object
  // selects the dropdowns before typing the text fields.
  type: "Account",                  // select[name="type"]: "Account" | "Card"
  bank: "TEST BANK B",              // Bank* - partial match on the bank option label
  accountName: "Test User",         // Account Holder's Name* (max 30 chars)
  nickName: "PWOtherBank",          // Nickname* (max 15 chars)
  accountNumber: "9901234561",      // Account Number*
};

/* ----------------------------------------------------------------
 * 12. Add New Biller (Payees & Billers > Saved Billers > Add New Biller)
 * ---------------------------------------------------------------- */
const newBiller = {
  category: "Telephone",            // select[name="categoryId"]
  biller: "Dialog Mobile",          // select[name="billerId"] - populated per category
  templateName: "PW Dialog Bill",   // Template Name*
  amount: "500",                    // Amount*
  referenceValue: "0771234567",     // the biller's own field (Dialog: GSM phone number)
};

/* ----------------------------------------------------------------
 * 13. Fund Transfer by a SAVED PAYEE
 *     (Payees & Billers > Saved Payees > pick the payee > amount > Submit)
 *     Requires a payee to already exist - use the nickname given in `newPayee`.
 * ---------------------------------------------------------------- */
const savedPayeeTransfer = {
  // Nickname as shown in the Saved Payees table (row: 9901234561 / Test Name User /
  // Roshan Test / TEST BANK B / Other Bank Transfer).
  payee: "Roshan Test",
  fromAccount: "1018 5010 4310",     // select[name="debitAccount"]
  amount: "100",                     // input[name="tranList.0.amount"]
  purpose: "Wages & Salaries",       // select[name="tranList.0.purpose"]
  beneficiaryRemark: "PW Saved Payee", // input[name="tranList.0.beneficiaryRemarks"]
};

/* ----------------------------------------------------------------
 * 14. Bill Payment by a SAVED BILLER
 *     (Payees & Billers > Saved Billers > pick the biller > amount > Next)
 *     Requires a biller to already exist - use the template name in `newBiller`.
 * ---------------------------------------------------------------- */
const savedBillerPayment = {
  biller: "PW Dialog Bill",          // template name of the saved biller to pay
  fromAccount: "1018 5010 4310",
  amount: "500",
};

/* ----------------------------------------------------------------
 * 15. Schedule Payment - Fund Transfer (Standing Order/Schedule)
 *     Covers 3 flows: Own Account, Intra Bank (Sampath), Other Bank.
 *     Flow: fill the transfer -> Standing Order/Schedule -> Submit -> schedule modal
 *     (Start Date defaults to tomorrow) -> frequency (+ schedule type / number for
 *     recurring) -> Submit -> OTP.
 *     Each spec merges the flow's `base` with a schedule config (`single`/`recurring`).
 * ---------------------------------------------------------------- */
const scheduledTransfer = {
  // Per-flow base transfer details (the same fields the non-scheduled transfers use).
  own: {
    base: {
      fromAccount: "1018 5010 4310",
      toAccount: "1018 5525 0495",
      amount: "500",
      senderRemark: "PW Sched Own",
      beneficiaryRemark: "PW Sched Own",
    },
  },
  intra: {
    base: {
      fromAccount: "1018 5010 4310",
      bank: "Sampath",                 // beneficiary name auto-fetched for Sampath accounts
      // VERIFY: this account must resolve to a real beneficiary name via the core-banking
      // lookup. "101358394971" does NOT resolve in UAT (the name stays "Retrieving
      // beneficiary name..." / empty), which blocks the intra flow. Replace with a valid
      // Sampath account number that returns a name.
      toAccountNumber: "101358394971",
      amount: "500",
      purpose: "Wages & Salaries",
      senderRemark: "PW Sched Intra",
      beneficiaryRemark: "PW Sched Intra",
    },
  },
  other: {
    base: {
      fromAccount: "1018 5010 4310",
      bank: "TEST BANK B",             // beneficiary name typed manually for other banks
      toAccountNumber: "9901234561",
      beneficiaryName: "Test User",
      amount: "500",
      purpose: "Wages & Salaries",
      beneficiaryRemark: "PW Sched Other",
    },
  },
  // Shared schedule configs, merged onto a flow's base.
  single: { frequency: "One Time" },   // a single future-dated transfer
  recurring: {
    frequency: "Monthly",              // repeats monthly
    scheduleType: "Number of Transfers", // "Number of Transfers" | "End Date"
    numberOfTransactions: "3",
  },
};

/* ----------------------------------------------------------------
 * 16. Schedule Payment - Bill Payment (Dialog, Standing Order/Schedule)
 *     Same as Bill Payment but with Standing Order/Schedule -> schedule modal
 *     (no schedule-type option; just Start Date + Frequency + Number of Payments).
 * ---------------------------------------------------------------- */
const scheduledBillPayment = {
  single: {
    category: "Telephone",
    biller: "Dialog Mobile",
    fromAccount: "1018 5010 4310",
    referenceFieldName: "Your GSM Phone Number",
    referenceValue: "0771234567",
    amount: "500",
    frequency: "One Time",
  },
  recurring: {
    category: "Telephone",
    biller: "Dialog Mobile",
    fromAccount: "1018 5010 4310",
    referenceFieldName: "Your GSM Phone Number",
    referenceValue: "0771234567",
    amount: "500",
    frequency: "Monthly",
    numberOfTransactions: "3",
  },
};

/* ----------------------------------------------------------------
 * 17. Manage Schedules (top-nav "Manage Schedules")
 *     Scheduled Transfers / Scheduled Payments tabs, each row with actions:
 *     Pay Now | Skip | Stop | Modify.
 *     `identifier` optionally matches a specific schedule row; leave "" to act on the
 *     first row. NOTE: the lists are currently empty (schedule creation is backend-blocked).
 * ---------------------------------------------------------------- */
const manageScheduleTransfer = {
  identifier: "",                    // e.g. a nickname / account / amount shown in the row
  modify: { amount: "600" },         // used by the Modify action (VERIFY the edit form)
};

const manageScheduleBiller = {
  identifier: "",                    // e.g. the biller/template name shown in the row
  modify: { amount: "600" },
};

/* ----------------------------------------------------------------
 *  NEGATIVE / VALIDATION DATA
 *  Each block intentionally triggers a specific validation error so the
 *  spec can assert the app blocks the transaction (before or after OTP).
 * ---------------------------------------------------------------- */
const negative = {
  ownTransfer: {
    insufficientFunds: {
      fromAccount: "1018 5010 4310",
      toAccount: "0018 5002 2719",
      amount: "999999999",
      senderRemark: "PW Neg InsufficientFunds",
      beneficiaryRemark: "PW Neg InsufficientFunds",
      // The app's real message, shown inline under Amount. Kept specific so it cannot be
      // satisfied by the "Available Balance" label that sits on the same screen.
      expectedError: /insufficient funds/i,
    },
    zeroAmount: {
      fromAccount: "1018 5010 4310",
      toAccount: "0018 5002 2719",
      amount: "0",
      senderRemark: "PW Neg ZeroAmount",
      beneficiaryRemark: "PW Neg ZeroAmount",
      expectedError: /minimum|greater than|amount|valid/i,
    },
  },

  intraBankTransfer: {
    invalidAccount: {
      fromAccount: "1018 5010 4310",
      bank: "Sampath",
      toAccountNumber: "1",             // clearly invalid Sampath account number
      amount: "100",
      purpose: "Wages & Salaries",
      beneficiaryRemark: "PW Neg IntraInvalid",
      expectedError: /invalid|not valid|account number|not found/i,
    },
  },

  otherBankTransfer: {
    invalidAccount: {
      fromAccount: "1018 5010 4310",
      bank: "TEST BANK B",
      toAccountNumber: "1",             // clearly invalid account number
      beneficiaryName: "Neg Test",
      amount: "100",
      purpose: "Wages & Salaries",
      beneficiaryRemark: "PW Neg InvalidAccount",
      expectedError: /invalid|not valid|account number|not found/i,
    },
  },

  mobileCash: {
    invalidMobile: {
      nic: "199012345678",
      mobileNumber: "123",              // too short to be a valid mobile number
      receiverName: "PW Neg Receiver",
      purpose: "Family Remittances",
      amount: "1000",
      remark: "PW Neg MobileCash",
      expectedError: /invalid|mobile|number|digits/i,
    },
  },

  otherCreditCardTransfer: {
    invalidCard: {
      fromAccount: "1018 5010 4310",
      cardNumber: "1234",               // too short / invalid card number
      beneficiaryName: "Neg Card",
      amount: "100",
      beneficiaryRemark: "PW Neg CardInvalid",
      expectedError: /invalid|card|number|valid/i,
    },
  },

  ownCardSettlement: {
    zeroAmount: {
      fromAccount: "1018 5010 4310",
      card: "1071",
      settlementType: "Custom Amount",
      amount: "0",
      // The app's real inline message: "Custom amount must be greater than 0.00".
      // It appears as soon as the amount is typed, before Next is clicked.
      expectedError: /custom amount must be greater than/i,
    },
  },

  billPayment: {
    // Dialog with a mismatched "Re Enter" reference number.
    mismatchedReference: {
      category: "Telephone",
      biller: "Dialog Mobile",
      fromAccount: "1018 5010 4310",
      referenceFieldName: "Your GSM Phone Number",
      referenceValue: "0771234567",
      reEnterValue: "0770000000",       // intentionally different
      amount: "500",
      expectedError: /match|same|re-?enter|do not/i,
    },
  },

  // Add New Payee: submitting an empty form must raise inline "is required" errors
  // ("Next" is NOT disabled once the bank list has loaded).
  newPayee: {
    emptyForm: {
      expectedError: /is required/i,
    },
  },

  // Add New Biller: submitting an empty form must raise inline "is required" errors
  // ("Next" is NOT disabled on this form).
  newBiller: {
    emptyForm: {
      expectedError: /is required/i,
    },
  },

  // Transfer to a saved payee with a zero amount must be blocked.
  savedPayeeTransfer: {
    zeroAmount: {
      payee: "Roshan Test",
      fromAccount: "1018 5010 4310",
      amount: "0",
      purpose: "Wages & Salaries",
      beneficiaryRemark: "PW Neg SavedPayee",
      expectedError: /greater than|invalid|required/i,
    },
  },

  // Paying a saved biller with a zero amount must be blocked.
  savedBillerPayment: {
    zeroAmount: {
      biller: "PW Dialog Bill",
      fromAccount: "1018 5010 4310",
      amount: "0",
      expectedError: /minimum|greater than|amount|valid|required/i,
    },
  },

  // Scheduled fund transfer with NO frequency chosen must be blocked in the modal.
  scheduledTransfer: {
    noFrequency: {
      fromAccount: "1018 5010 4310",
      toAccount: "1018 5525 0495",
      amount: "500",
      senderRemark: "PW Neg Sched",
      beneficiaryRemark: "PW Neg Sched",
      // frequency intentionally omitted (left as "Select Frequency")
      expectedError: /frequency|required|select/i,
    },
  },

  // Scheduled bill payment with NO frequency chosen must be blocked in the modal.
  scheduledBillPayment: {
    noFrequency: {
      category: "Telephone",
      biller: "Dialog Mobile",
      fromAccount: "1018 5010 4310",
      referenceFieldName: "Your GSM Phone Number",
      referenceValue: "0771234567",
      amount: "500",
      // frequency intentionally omitted
      expectedError: /frequency|required|select/i,
    },
  },
};

module.exports = {
  credentials,
  invalidCredentials,
  forgotPassword,
  ownTransfer,
  intraBankTransfer,
  otherBankTransfer,
  mobileCash,
  otherCreditCardTransfer,
  ownCardSettlement,
  stopCard,
  billPayments,
  newPayee,
  newBiller,
  savedPayeeTransfer,
  savedBillerPayment,
  scheduledTransfer,
  scheduledBillPayment,
  manageScheduleTransfer,
  manageScheduleBiller,
  negative,
};
