// Dependency-free post-CCRA regression checks. Live replica-set races, real
// OAuth, V1 data reconciliation and UI/browser E2E remain separate gates.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertTradeDateNotBeforeLatest } from "../utils/investmentChronology.js";
import { assertSafeInvestmentTradeAmounts } from "../utils/investmentMath.js";
import { isValidDateKey } from "../utils/dateOnly.js";
import { getReportCurrencySafety } from "../utils/reportCurrencyPolicy.js";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const source = (name) => readFileSync(path.join(base, name), "utf8");
const dt = (key) => new Date(`${key}T00:00:00.000Z`);

// Chronology: same-day FIFO order is insertion order, but neither an older
// purchase nor an older sale may silently change prior realized P&L.
assert.doesNotThrow(() => assertTradeDateNotBeforeLatest({
  tradeDate: dt("2026-10-10"), latestTradeDate: dt("2026-10-10"),
}));
assert.doesNotThrow(() => assertTradeDateNotBeforeLatest({
  tradeDate: dt("2026-10-11"), latestTradeDate: dt("2026-10-10"),
}));
assert.doesNotThrow(() => assertTradeDateNotBeforeLatest({ tradeDate: dt("2026-10-10") }));
assert.throws(() => assertTradeDateNotBeforeLatest({
  tradeDate: dt("2026-10-09"), latestTradeDate: dt("2026-10-10"),
}), (error) => error.statusCode === 409 && error.details?.code === "INVESTMENT_TRADE_BACKDATED");
for (const invalid of ["2026-02-30", "2026-13-11", "2026-1-11", "10/11/2026", "2026-10-10T00:00:00Z"]) {
  assert.equal(isValidDateKey(invalid), false, invalid);
}
assert.equal(isValidDateKey("2024-02-29"), true);

// Amount validator checks the COMBINED notional; the individual price and
// quantity limits were not sufficient to bound multiplication in paise.
assert.equal(assertSafeInvestmentTradeAmounts({ quantity: 333, price: 3, fees: 1.01, type: "BUY" }), 999);
assert.equal(assertSafeInvestmentTradeAmounts({ quantity: 1, price: 1, fees: 0, type: "SELL" }), 1);
assert.equal(assertSafeInvestmentTradeAmounts({ quantity: 1, price: 2, fees: 3, type: "SELL" }), 2,
  "Fees exceeding proceeds may produce a valid negative cash movement");
for (const input of [
  { quantity: 1_000_000_000, price: 1_000_000_000, type: "BUY" },
  { quantity: 1_000_000_000, price: 1, fees: 100_000_000, type: "BUY" },
]) assert.throws(() => assertSafeInvestmentTradeAmounts(input), /cash amount including fees/);

const accounts = [
  { currency: "INR", isArchived: false },
  { currency: "USD", isArchived: true },
];
assert.equal(getReportCurrencySafety({ accounts, preferredCurrency: "INR" }).supported, true,
  "An archived USD account cannot prevent an active INR-only monthly report");
assert.equal(getReportCurrencySafety({ accounts: [
  ...accounts, { currency: "EUR", isArchived: false },
], preferredCurrency: "INR" }).supported, false,
"Mixed active currencies are not convertible into an INR balance");
assert.equal(getReportCurrencySafety({ accounts: [{ currency: "USD", isArchived: false }], preferredCurrency: "INR" }).supported, false,
  "A single USD account cannot be presented as an INR balance without FX rates");

const trade = source("server/src/services/investment.service.js");
assert.match(trade, /sort\(\{ tradeDate: -1, createdAt: -1, _id: -1 \}\)\.session\(session\)/,
  "Latest trade date must be retrieved inside the same transaction that updates account cash");
assert.match(trade, /assertTradeDateNotBeforeLatest\(/);
assert.match(trade, /assertSafeInvestmentTradeAmounts\(/);
const report = source("server/src/services/monthlyReport.service.js");
assert.match(report, /getReportCurrencySafety\(/);
assert.match(report, /Account\.distinct\("_id", \{ user: userId, currency \}\)/,
  "Recurring PDF totals must include only report-currency accounts, including archived INR history");
assert.match(report, /account: \{ \$in: currencyAccountIds \}/);

const recurring = source("server/src/services/recurring.service.js");
const account = source("server/src/services/account.service.js");
assert.match(recurring, /claimRecurringAccounts/);
assert.match(recurring, /\$inc: \{ referenceRevision: 1 \}/);
assert.match(recurring, /const recurringId = await mongoose\.connection\.transaction/);
assert.match(recurring, /const updatedId = await mongoose\.connection\.transaction/);
assert.match(account, /archiveAccountForUser/);
assert.match(account, /return mongoose\.connection\.transaction/);
assert.match(account, /Account\.findOne\(\{ _id: accountId, user: userId, isArchived: false \}\)\.session\(session\)/);
const security = source("server/src/services/security.service.js");
assert.match(security, /User\.findByIdAndUpdate\(userId/);
assert.match(security, /\$inc: \{ browserSignInSequence: 1 \}/);
assert.match(security, /browserSignInSequence: \{ \$lt: browserSignInSequence \}/);
assert.match(security, /browserSignInSequence: \{ \$gt: browserSignInSequence \}/);
assert(!security.includes("_id: { $lt: session._id }"), "ObjectId must not establish login precedence");
assert.match(source("server/src/models/User.js"), /browserSignInSequence/);
assert.match(source("server/src/models/UserSession.js"), /browserSignInSequence/);

console.log("FinTrack V2 post-CCRA financial/date/currency/session guard regressions PASSED.");
