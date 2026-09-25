import assert from "node:assert/strict";

import {
  addMonthsDateOnlyClamped,
  addYearsDateOnlyClamped,
} from "../utils/dateOnly.js";
import {
  addCurrencyRelativePercentages,
  buildCurrencyScopedTransactionStages,
  isAccountCurrencyChangeLocked,
  summarizeRecurringAggregateRows,
} from "../utils/financialPolicy.js";

const dateKey = (value) => value.toISOString().slice(0, 10);

const jan31 = new Date("2025-01-31T00:00:00.000Z");
const feb28 = addMonthsDateOnlyClamped(jan31, 1, jan31);
const mar31 = addMonthsDateOnlyClamped(feb28, 1, jan31);
const apr30 = addMonthsDateOnlyClamped(mar31, 1, jan31);
assert.equal(dateKey(feb28), "2025-02-28");
assert.equal(dateKey(mar31), "2025-03-31");
assert.equal(dateKey(apr30), "2025-04-30");

const jan30 = new Date("2025-01-30T00:00:00.000Z");
const febFrom30 = addMonthsDateOnlyClamped(jan30, 1, jan30);
const marFrom30 = addMonthsDateOnlyClamped(febFrom30, 1, jan30);
assert.equal(dateKey(febFrom30), "2025-02-28");
assert.equal(dateKey(marFrom30), "2025-03-30");

const feb29 = new Date("2024-02-29T00:00:00.000Z");
let yearly = addYearsDateOnlyClamped(feb29, 1, feb29);
assert.equal(dateKey(yearly), "2025-02-28");
yearly = addYearsDateOnlyClamped(yearly, 1, feb29);
assert.equal(dateKey(yearly), "2026-02-28");
yearly = addYearsDateOnlyClamped(yearly, 1, feb29);
assert.equal(dateKey(yearly), "2027-02-28");
yearly = addYearsDateOnlyClamped(yearly, 1, feb29);
assert.equal(dateKey(yearly), "2028-02-29");

assert.equal(
  isAccountCurrencyChangeLocked({
    currentCurrency: "INR",
    nextCurrency: "USD",
    hasFinancialReferences: true,
  }),
  true,
);
assert.equal(
  isAccountCurrencyChangeLocked({
    currentCurrency: "INR",
    nextCurrency: "USD",
    hasFinancialReferences: false,
  }),
  false,
);
assert.equal(
  isAccountCurrencyChangeLocked({
    currentCurrency: "INR",
    nextCurrency: "INR",
    hasFinancialReferences: true,
  }),
  false,
);

assert.equal(
  isAccountCurrencyChangeLocked({
    currentCurrency: "INR",
    nextCurrency: "USD",
    hasFinancialReferences: false,
    currentBalance: 500,
  }),
  true,
);

const accountPercentages = addCurrencyRelativePercentages([
  { name: "INR A", currency: "INR", balance: 75 },
  { name: "INR B", currency: "INR", balance: 25 },
  { name: "USD A", currency: "USD", balance: 10 },
  { name: "USD B", currency: "USD", balance: 30 },
]);
assert.equal(accountPercentages[0].percentage, 75);
assert.equal(accountPercentages[1].percentage, 25);
assert.equal(accountPercentages[2].percentage, 25);
assert.equal(accountPercentages[3].percentage, 75);
assert.equal(accountPercentages[0].currencyTotal, 100);
assert.equal(accountPercentages[2].currencyTotal, 40);

const currencyStages = buildCurrencyScopedTransactionStages("INR");
assert.equal(currencyStages.length, 3);
assert.equal(currencyStages[0].$lookup.from, "accounts");
assert.equal(currencyStages[2].$match["analyticsAccount.currency"], "INR");
assert.deepEqual(buildCurrencyScopedTransactionStages(), []);

const recurringSummary = summarizeRecurringAggregateRows([
  { _id: "INCOME", count: 17, amount: 17000 },
  { _id: "EXPENSE", count: 29, amount: 29000 },
]);
assert.deepEqual(recurringSummary, {
  count: 46,
  income: 17000,
  expense: 29000,
});

console.log("FinTrack V2 foundation regression tests passed.");
