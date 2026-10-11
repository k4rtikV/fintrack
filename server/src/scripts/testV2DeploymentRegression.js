// Dependency-free, deployment-gate rechecks for bugs found after PAR-SPR-MISC/CCRA.
// Database race behaviour still requires a disposable replica-set integration test.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeInvestmentTradeAmounts } from "../utils/investmentMath.js";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const source = (relative) => readFileSync(path.join(base, relative), "utf8");
const trade = (quantity, price, fees = 0, type = "BUY") =>
  assertSafeInvestmentTradeAmounts({ quantity, price, fees, type });

// Previously these inputs were accepted with grossAmount=0. An investment
// lot cannot be created for zero shares or with an unrepresentable cash amount.
for (const [quantity, price, fees] of [
  [0.0000001, 1000, 0],
  [1, 0.001, 0],
  [0.000001, 0.01, 0],
  [0.000001, 0.01, 12],
  [0, 125, 0],
  [-1, 125, 0],
  [1, 20, -1],
]) {
  assert.throws(() => trade(quantity, price, fees), /exact paise/, `${quantity} x ${price} + ${fees}`);
}
for (const args of [
  [1, Number.NaN], [Number.NaN, 1], [1, Infinity], [Infinity, 1],
]) assert.throws(() => trade(...args), /exact paise/);
assert.equal(trade(1, 0.01), 0.01);
assert.equal(trade(0.000001, 10000), 0.01);
assert.equal(trade(333, 3, 1.01), 999);
assert.equal(trade(1, 2, 3, "SELL"), 2,
  "A genuine negative cash receipt from SELL fees exceeding proceeds remains supported");
assert.throws(() => trade(1_000_000_000, 1_000_000_000), /exact paise/);

// Running parallel awaits with the SAME session in a MongoDB transaction is
// explicitly unsupported. This helper serves both create/edit transfer paths.
const transactions = source("server/src/services/transaction.service.js");
const pair = transactions.split("const ensureTransferPair =")[1].split("const populateTransaction =")[0];
assert.doesNotMatch(pair, /Promise\.all\(/,
  "Transfer pair ownership reads must not run concurrently on one Mongo session");
assert.match(pair, /const sourceAccount = await ensureAccountBelongsToUser/);
assert.match(pair, /const destinationAccount = await ensureAccountBelongsToUser/);

// Defensively enforce the resulting type+currency pair for service callers,
// including simultaneous edits and changes to unused legacy accounts.
const accounts = source("server/src/services/account.service.js");
assert.match(accounts, /const nextType = updates\.type \?\? account\.type/);
assert.match(accounts, /const nextCurrency = updates\.currency \?\? account\.currency/);
assert.match(accounts, /nextType === "INVESTMENT" && nextCurrency !== "INR"/);

console.log("FinTrack final deployment-regression: trade precision, serial transfer reads, and investment account currency guards PASSED.");
