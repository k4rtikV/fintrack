import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBalanceDeltas, mergeBalanceDeltas } from "../utils/transactionSemantics.js";

const asObject = (map) => Object.fromEntries([...map.entries()].sort());
assert.deepEqual(asObject(buildBalanceDeltas({ type: "INCOME", amount: 100, accountId: "a" })), { a: 100 });
assert.deepEqual(asObject(buildBalanceDeltas({ type: "EXPENSE", amount: 40, accountId: "a" })), { a: -40 });
assert.deepEqual(asObject(buildBalanceDeltas({ type: "TRANSFER", amount: 25, accountId: "a", destinationAccountId: "b" })), { a: -25, b: 25 });
assert.deepEqual(asObject(buildBalanceDeltas({ type: "TRANSFER", amount: 25, accountId: "a", destinationAccountId: "b", direction: -1 })), { a: 25, b: -25 });
assert.deepEqual(
  asObject(mergeBalanceDeltas(
    buildBalanceDeltas({ type: "TRANSFER", amount: 25, accountId: "a", destinationAccountId: "b", direction: -1 }),
    buildBalanceDeltas({ type: "TRANSFER", amount: 40, accountId: "b", destinationAccountId: "c" }),
  )),
  { a: 25, b: -65, c: 40 },
);

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const transactionModel = read("server/src/models/Transaction.js");
const recurringModel = read("server/src/models/RecurringTransaction.js");
const transactionService = read("server/src/services/transaction.service.js");
const recurringService = read("server/src/services/recurring.service.js");
const accountService = read("server/src/services/account.service.js");
const analytics = read("server/src/services/analytics.service.js");
const assistantTools = read("server/src/services/assistantTools.service.js");
const assistantResponse = read("server/src/services/assistantResponse.service.js");
const app = read("client/src/App.jsx");
const workspaceNav = read("client/src/components/transactions/TransactionWorkspaceNav.jsx");
const transactionModal = read("client/src/components/transactions/TransactionModal.jsx");
const recurringModal = read("client/src/components/recurring/RecurringModal.jsx");
const transactionPage = read("client/src/pages/TransactionsPage.jsx");
const transactionFilters = read("client/src/components/transactions/TransactionFilters.jsx");
const recurringPage = read("client/src/pages/RecurringPage.jsx");

for (const source of [transactionModel, recurringModel]) {
  assert(source.includes('"TRANSFER"'), "Transaction schemas must support TRANSFER");
  assert(source.includes("destinationAccount"), "Transfer destination account must be persisted");
  assert(
    !/pre\(\s*["']validate["']\s*,\s*function\s+validateTransferShape\s*\(\s*next\s*\)/.test(source),
    "Mongoose 9 validation middleware must not use the removed callback-style next parameter",
  );
  assert(
    !/validateTransferShape[\s\S]{0,1200}\bnext\(\)/.test(source),
    "Transfer validation hooks must be synchronous and must not call next()",
  );
}
assert(transactionService.includes("ensureTransferPair"), "Transaction service must validate transfer account pairs");
assert(transactionService.includes("TRANSFER_CURRENCY_MISMATCH"), "Cross-currency transfers must be rejected explicitly");
assert(transactionService.includes("mergeBalanceDeltas"), "Transaction edits must reverse and reapply balance effects atomically");
assert(recurringService.includes('recurring.type === "TRANSFER"'), "Autopay processing must support transfers");
assert(accountService.includes("destinationAccount: account._id"), "Account archive/currency checks must include transfer destinations");
assert(analytics.includes('else if (item._id.type === "EXPENSE")'), "Transfers must not fall through into expense trend analytics");
assert(assistantTools.includes("transferByCurrency"), "Assistant Autopay summaries must separate transfers from expenses");
assert(assistantResponse.includes("Autopay transfers") && assistantResponse.includes("next30DaysTransferByCurrency"), "Assistant presentation must surface scheduled transfers separately");

assert(app.includes('path="/transactions/autopay"') && app.includes('path="/transactions/categories"'), "Autopay and Categories must live under the Transactions workspace");
assert(app.includes('Navigate to="/transactions/autopay"') && app.includes('Navigate to="/transactions/categories"'), "Legacy routes must redirect into the Transactions workspace");
assert(workspaceNav.includes('"Autopay"') && !workspaceNav.includes('"Recurring"'), "User-facing workspace must use Autopay terminology");
assert(transactionModal.includes('"TRANSFER"') && transactionModal.includes("destinationAccountId"), "Transaction form must expose first-class transfers");
assert(transactionFilters.includes('nextType === "TRANSFER" || nextType.startsWith("INVESTMENT")') && transactionFilters.includes('disabled={filters.type === "TRANSFER" || filters.type.startsWith("INVESTMENT")}'), "Transfer/investment filters must clear and disable category filtering");
assert(recurringModal.includes('"TRANSFER"') && recurringModal.includes("Set up Autopay"), "Autopay form must support scheduled transfers");
assert(transactionPage.includes("AccountModal") && transactionPage.includes("Account created — continue with your transaction"), "Zero-account transaction flow must onboard an account then resume");
assert(recurringPage.includes('title="Autopay"'), "Autopay page title must use the simpler product term");

console.log("FinTrack v2 Transactions/Autopay/Transfer regression tests passed.");
