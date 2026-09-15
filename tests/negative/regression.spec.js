/**
 * @Regression - NEGATIVE suite.
 *
 * A single entry point that runs EVERY negative / validation spec. Run it with:
 *   npm run test:regression:negative
 *   (or)  SUITE=regression npx playwright test tests/negative/regression.spec.js
 *
 * Uses the shared fixtures `test` so each required spec nests under "@Regression - Negative".
 * These aggregator files are excluded from a normal run (see testMatch/testIgnore in
 * playwright.config.js), so the suite is never executed twice.
 */
const { test } = require("../../utils/fixtures");

test.describe("@Regression - Negative", () => {
  require("./login.spec");
  require("./forgotPassword.spec");
  require("./dashboard.spec");
  require("./portfolio.spec");
  require("./crossCutting.spec");
  require("./manageScheduleFundTransfer.spec");
  require("./manageScheduleBiller.spec");
  require("./manageScheduleFilters.spec");
  require("./loanSettlement.spec");
  require("./quickActions.spec");
  require("./freezeAccounts.spec");
  require("./openSavingAccount.spec");
  require("./fundTransferOwnAccount.spec");
  require("./fundTransferIntraBank.spec");
  require("./fundTransferOtherBank.spec");
  require("./fundTransferMobileCash.spec");
  require("./fundTransferOtherCreditCard.spec");
  require("./ownCardSettlement.spec");
  require("./transactionHistory.spec");
  require("./myAccounts.spec");
  require("./creditCardRequest.spec");
  require("./creditCardBlock.spec");
  require("./creditCard.spec");
  require("./stopCard.spec");
  require("./billPayment.spec");
  require("./addPayee.spec");
  require("./addBiller.spec");
  require("./transferSavedPayee.spec");
  require("./savedPayeesList.spec");
  require("./savedPayeeMaintenance.spec");
  require("./sendMoneyTabs.spec");
  require("./sendMoneyTransactionHistory.spec");
  require("./transferSavedPayeeMultiple.spec");
  require("./billPaymentSavedBiller.spec");
  require("./billPaymentSavedBillerMultiple.spec");
  require("./savedBillerFavourite.spec");
  require("./savedBillersList.spec");
  require("./billPaymentHistory.spec");
  require("./savedBillerMaintenance.spec");
  require("./savedPayeeFavourite.spec");
  require("./scheduleFundTransfer.spec");
  require("./scheduleBillPayment.spec");
  require("./fdCreate.spec");
  require("./webCardOpening.spec");
  require("./slipless.spec");
  require("./sliplessPayeesInquiry.spec");
  require("./selfServices.spec");
  require("./messages.spec");
  require("./settings.spec");
});
