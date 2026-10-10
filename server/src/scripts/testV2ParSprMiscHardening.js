// Dependency-free PAR–SPR–MISC hardening regressions.
// Data-backed concurrency cases are intentionally left to the staging gate.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalizeStatementRows } from "../utils/statementImportRows.js";
import { planFifoSale } from "../utils/investmentMath.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const source = (relative) => readFileSync(path.join(root, relative), "utf8");
const mapping = { headerRow: 0, mode: "DEBIT_CREDIT", dateColumn: 0,
  descriptionColumn: 1, debitColumn: 2, creditColumn: 3 };
const row = (debit, credit, mode = "DEBIT_CREDIT") => normalizeStatementRows({
  rows: [["date", "desc", "debit", "credit"], ["2026-10-10", "Test bank entry", debit, credit]],
  mapping: mode === "DEBIT_CREDIT" ? mapping : {
    headerRow: 0, mode: "SIGNED_AMOUNT", dateColumn: 0, descriptionColumn: 1, amountColumn: 3,
  },
}).rows[0];

for (const amount of ["-123", "₹-123", "INR-123", "Rs. -123", "₹(123)",
  "Rs. (123)", "INR -0.00", "₹ (0.00)", "₹-123 CR", "INR(123)DR"]) {
  assert.match(row("", amount).error || "", /nonnegative/, `Credit should reject ${amount}`);
  assert.match(row(amount, "").error || "", /nonnegative/, `Debit should reject ${amount}`);
}
for (const [amount, type] of [["₹123.45 CR", "INCOME"], ["INR 123.45 DR", "EXPENSE"]]) {
  assert.equal(row(type === "EXPENSE" ? amount : "", type === "INCOME" ? amount : "").type, type);
}
assert.equal(row("", "₹-123.45", "SIGNED_AMOUNT").type, "EXPENSE", "Signed mode still supports negative withdrawals");
assert.equal(row("", "₹-123.45", "SIGNED_AMOUNT").paise, 12345);

// 333-share purchase at 3.00 + 1.01 in fees: rounded unit cost would lose INR 1.01.
const totalPaise = 100001;
const first = planFifoSale({ lots: [{ _id: "new-lot", quantityRemaining: 333,
  unitCost: 3, costBasisRemainingPaise: totalPaise }], quantity: 111, holdingCostBasis: 1000.01 });
assert.equal(first.unallocated, 0);
assert.equal(first.allocations[0].quantityRemaining, 222);
const second = planFifoSale({ lots: [{ _id: "new-lot", quantityRemaining: 222,
  unitCost: 3, costBasisRemainingPaise: first.allocations[0].costBasisRemainingPaise }],
  quantity: 222, holdingCostBasis: 1000.01 - first.costBasis });
assert.equal(first.allocations[0].costBasisPaise + second.allocations[0].costBasisPaise, totalPaise);
assert.equal(second.allocations[0].costBasisRemainingPaise, 0);
assert.equal(first.costBasis + second.costBasis, 1000.01);
const all = planFifoSale({ lots: [{ _id: "exact", quantityRemaining: 333,
  unitCost: 3, costBasisRemainingPaise: totalPaise }], quantity: 333, holdingCostBasis: 1000.01 });
assert.equal(all.costBasis, 1000.01);
const legacy = planFifoSale({ lots: [{ _id: "legacy", quantityRemaining: 333, unitCost: 3 }],
  quantity: 333, holdingCostBasis: 1000.01 });
assert.equal(legacy.costBasis, 1000.01, "Closing a legacy holding consumes its remaining basis");
const mixed = planFifoSale({ lots: [
  { _id: "legacy", quantityRemaining: 10, unitCost: 1 },
  { _id: "new", quantityRemaining: 10, unitCost: 1, costBasisRemainingPaise: 1003 },
], quantity: 20, holdingCostBasis: 20.13 });
assert.equal(mixed.costBasis, 20.13, "Mixed legacy/new closing liquidation preserves holding basis");
const partialLegacy = planFifoSale({ lots: [
  { _id: "first", quantityRemaining: 10, unitCost: 1 },
  { _id: "second", quantityRemaining: 10, unitCost: 1 },
], quantity: 10, holdingCostBasis: 20.13 });
assert.equal(partialLegacy.costBasis, 10, "Closing one lot must not consume the basis of unsold lots");
assert.equal(partialLegacy.allocations[0].quantityRemaining, 0);

const lotModel = source("server/src/models/InvestmentLot.js");
const investment = source("server/src/services/investment.service.js");
assert.match(lotModel, /costBasisRemainingPaise/);
assert.match(investment, /costBasisOriginalPaise: Math.round\(totalCashOut \* 100\)/);
assert.match(investment, /lot\.costBasisRemainingPaise = allocation\.costBasisRemainingPaise/);
const account = source("server/src/services/account.service.js");
assert.match(account, /ACCOUNT_TYPE_LOCKED/);
assert.match(account, /mongoose\.connection\.transaction/);
for (const reference of ["Transaction.exists", "RecurringTransaction.exists", "InvestmentTrade.exists",
  "InvestmentHolding.exists", "InvestmentLot.exists", "StatementImportEntry.exists", "StatementImportBatch.exists"]) {
  assert(account.includes(reference), `Account type/currency check must cover ${reference}`);
}
const txn = source("server/src/services/transaction.service.js");
assert.match(txn, /StatementImportBatch\.updateOne/);
assert.match(txn, /superseded:/);
assert.match(txn, /importEntry\.deleteOne\(\{ session \}\)/);
const importService = source("server/src/services/statementImport.service.js");
assert.match(importService, /oldBatch && !ready\.length/);
assert.match(importService, /StatementImportBatch\.updateOne/);
assert.match(importService, /ready = requested\.filter/);
assert(!importService.includes("if (oldBatch) return { batch: oldBatch"), "Reconciliation must not blindly replay stale receipts");
for (const service of ["budget", "notification"]) {
  assert(source(`server/src/services/${service}.service.js`).includes('buildCurrencyScopedTransactionStages("INR")'),
    `${service} must scope INR budgets to INR transaction accounts`);
}
const analytics = source("server/src/services/analytics.service.js");
const validator = source("server/src/validators/analytics.validator.js");
assert.match(analytics, /monthSpan > 24/);
assert.match(validator, /MAX_TREND_MONTHS = 24/);
assert.match(validator, /Invalid calendar date/);
const security = source("server/src/services/security.service.js");
assert.match(security, /_id: \{ \$lt: session\._id \}/);
assert.match(security, /_id: \{ \$gt: session\._id \}/);
assert.match(security, /CONCURRENT_BROWSER_SIGN_IN/);
console.log("FinTrack PAR–SPR–MISC hardening: parser/FIFO adversarial + source invariants PASSED.");
