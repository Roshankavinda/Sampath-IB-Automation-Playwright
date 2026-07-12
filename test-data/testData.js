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
  wrongPassword: {
    username: process.env.IB_USERNAME || "v11user8",
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
  toAccount: "0018 5002 2719",
  amount: "100",
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
  dialog: {
    category: "Mobile",             // VERIFY: category tile for mobile operators
    biller: "Dialog",              // VERIFY: exact Dialog biller name once category opens
    fromAccount: "1018 5010 4310",
    referenceFieldName: "Mobile No", // VERIFY: exact reference field label for Dialog
    referenceValue: "0771234567",   // EDIT: a valid Dialog number/account
    amount: "500",                  // EDIT: amount (if editable)
  },
  mobitel: {
    category: "Mobile",             // VERIFY
    biller: "Mobitel",             // VERIFY: exact Mobitel biller name
    fromAccount: "1018 5010 4310",
    referenceFieldName: "Mobile No", // VERIFY
    referenceValue: "0712345678",   // EDIT: a valid Mobitel number/account
    amount: "500",                  // EDIT
  },
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
      expectedError: /insufficient|balance|exceed/i,
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
      expectedError: /minimum|greater than|amount|valid/i,
    },
  },

  billPayment: {
    // Dialog with a mismatched "Re Enter" reference number.
    mismatchedReference: {
      category: "Mobile",
      biller: "Dialog",
      fromAccount: "1018 5010 4310",
      referenceFieldName: "Mobile No",
      referenceValue: "0771234567",
      reEnterValue: "0770000000",       // intentionally different
      amount: "500",
      expectedError: /match|same|re-?enter|do not/i,
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
  negative,
};
