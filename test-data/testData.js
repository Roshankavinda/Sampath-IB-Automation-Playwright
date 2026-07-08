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

module.exports = {
  credentials,
  invalidCredentials,
  ownTransfer,
  otherBankTransfer,
  billPayment,
};
