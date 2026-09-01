/**
 * @Regression - POSITIVE suite.
 *
 * A single entry point that runs EVERY positive feature spec. Run it with:
 *   npm run test:regression:positive
 *   (or)  SUITE=regression npx playwright test tests/positive/regression.spec.js
 *
 * Uses the shared fixtures `test` so each required spec nests under "@Regression - Positive".
 * These aggregator files are excluded from a normal run (see testMatch/testIgnore in
 * playwright.config.js), so the suite is never executed twice.
 */
const { test } = require("../../utils/fixtures");

test.describe("@Regression - Positive", () => {
  require("./login.spec");
  require("./forgotPassword.spec");
  require("./dashboard.spec");
  require("./portfolio.spec");
  require("./myAccounts.spec");
  require("./transactionHistory.spec");
  require("./billPaymentCreditCard.spec");
  require("./sliplessOtherAccount.spec");
  require("./addPayeeCard.spec");
  require("./savedPayeeRemoveFavourite.spec");
  require("./savedBillerRemoveFavourite.spec");
  require("./quickActions.spec");
  require("./freezeAccounts.spec");
  require("./openSavingAccount.spec");
  require("./fundTransferOwnAccount.spec");
  require("./fundTransferIntraBank.spec");
  require("./fundTransferOtherBank.spec");
  require("./fundTransferMobileCash.spec");
  require("./fundTransferOtherCreditCard.spec");
  require("./ownCardSettlement.spec");
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
  require("./manageScheduleFundTransfer.spec");
  require("./manageScheduleBiller.spec");
  require("./fdCreate.spec");
  require("./loanSettlement.spec");
  require("./webCardOpening.spec");
  require("./slipless.spec");
  require("./selfServices.spec");
  require("./messages.spec");
  require("./settings.spec");
});
