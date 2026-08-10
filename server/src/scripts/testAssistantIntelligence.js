import assert from "node:assert/strict";

import {
  getCurrencySafety,
  safePercent,
} from "../services/assistantGuardrails.service.js";
import {
  buildSpendingInsights,
} from "../services/assistantInsights.service.js";
import {
  buildMonthlyForecast,
} from "../services/assistantForecast.service.js";
import {
  simulateFinancialScenario,
} from "../services/assistantSimulation.service.js";

const asOf = "2026-08-10T12:00:00.000Z";
const currencySafety = getCurrencySafety({
  accounts: [
    {
      name: "Main Bank",
      currency: "INR",
    },
  ],
  preferredCurrency: "INR",
});

assert.equal(currencySafety.supported, true);
assert.equal(safePercent(100, 0), null);

const currentCategories = [
  {
    category: "Investment",
    amount: 400000,
    transactionCount: 2,
  },
  {
    category: "Entertainment",
    amount: 600,
    transactionCount: 2,
  },
];

const historicalCategoryWindows = [
  {
    period: "2026-07",
    categories: [
      {
        category: "Investment",
        amount: 50000,
        transactionCount: 1,
      },
      {
        category: "Entertainment",
        amount: 500,
        transactionCount: 2,
      },
    ],
  },
  {
    period: "2026-06",
    categories: [
      {
        category: "Investment",
        amount: 40000,
        transactionCount: 1,
      },
      {
        category: "Entertainment",
        amount: 700,
        transactionCount: 2,
      },
    ],
  },
  {
    period: "2026-05",
    categories: [
      {
        category: "Investment",
        amount: 60000,
        transactionCount: 1,
      },
      {
        category: "Entertainment",
        amount: 600,
        transactionCount: 2,
      },
    ],
  },
];

const baselineTransactions = [
  1000, 1200, 800, 1500, 950, 1100, 1400, 1000,
].map((amount, index) => ({
  title: `Expense ${index}`,
  type: "EXPENSE",
  amount,
  date: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
  category: "Other",
  isLinkedRecurring: false,
}));

const currentTransactions = [
  {
    title: "Investment",
    type: "EXPENSE",
    amount: 300000,
    date: asOf,
    category: "Investment",
    isLinkedRecurring: false,
  },
  {
    title: "Investment",
    type: "EXPENSE",
    amount: 100000,
    date: asOf,
    category: "Investment",
    isLinkedRecurring: false,
  },
];

const insights = buildSpendingInsights({
  asOf,
  currentRange: {
    startDate: "2026-08-01",
    endDate: "2026-08-10",
    daysIncluded: 10,
  },
  historicalRanges: [
    {
      period: "2026-07",
    },
    {
      period: "2026-06",
    },
    {
      period: "2026-05",
    },
  ],
  currentCategories,
  historicalCategoryWindows,
  currentTransactions,
  baselineTransactions,
  patternTransactions: [
    ...baselineTransactions,
    ...currentTransactions,
  ],
  monthlyTrend: [
    {
      key: "2026-05",
      income: 100000,
      expense: 50000,
      netSavings: 50000,
    },
    {
      key: "2026-06",
      income: 100000,
      expense: 60000,
      netSavings: 40000,
    },
    {
      key: "2026-07",
      income: 100000,
      expense: 70000,
      netSavings: 30000,
    },
  ],
  currencySafety,
});

assert.equal(insights.supported, true);
assert.ok(
  insights.anomalies.some(
    (item) =>
      item.type === "LARGE_TRANSACTION",
  ),
);
assert.ok(
  insights.anomalies.some(
    (item) =>
      item.type === "CATEGORY_SPIKE" &&
      item.category === "Investment",
  ),
);

const forecast = buildMonthlyForecast({
  asOf,
  currentOverview: {
    totalIncome: 420000,
    totalExpense: 400600,
  },
  monthlyTrend: [
    {
      key: "2026-05",
      income: 350000,
      expense: 250000,
      netSavings: 100000,
    },
    {
      key: "2026-06",
      income: 380000,
      expense: 280000,
      netSavings: 100000,
    },
    {
      key: "2026-07",
      income: 400000,
      expense: 300000,
      netSavings: 100000,
    },
    {
      key: "2026-08",
      income: 420000,
      expense: 400600,
      netSavings: 19400,
    },
  ],
  recurringDueBeforeMonthEnd: [],
  currentTransactionCount: 9,
  highSeverityAnomalyCount: 1,
  anomalySignals: insights.anomalies,
  currencySafety,
});

assert.equal(forecast.supported, true);
assert.ok(
  Number.isFinite(forecast.forecast.income),
);
assert.ok(
  Number.isFinite(forecast.forecast.expense),
);
assert.equal(
  forecast.forecast.confidence,
  "LOW",
);

// Large/spiking Investment activity must be included as already incurred but
// must not be blindly repeated as a 31-day linear pace.
assert.ok(
  forecast.expensePaceAdjustment.excludedFromPace >= 300000,
);
assert.ok(
  forecast.forecast.expense < 800000,
);
assert.ok(
  forecast.forecast.expense >= 400600,
);

// A zero historical expense baseline is a real absence of expense history,
// not permission to fall back to the full linearized ₹12.4L pace.
const zeroExpenseHistoryForecast = buildMonthlyForecast({
  asOf,
  currentOverview: {
    totalIncome: 420000,
    totalExpense: 400600,
  },
  monthlyTrend: [
    {
      key: "2026-07",
      income: 50000,
      expense: 0,
      netSavings: 50000,
    },
    {
      key: "2026-08",
      income: 420000,
      expense: 400600,
      netSavings: 19400,
    },
  ],
  recurringDueBeforeMonthEnd: [],
  currentTransactionCount: 9,
  highSeverityAnomalyCount: 1,
  anomalySignals: [
    {
      type: "NEW_CATEGORY_ACTIVITY",
      severity: "HIGH",
      category: "Investment",
      currentAmount: 400000,
      baselineAverage: 0,
    },
    {
      type: "NEW_CATEGORY_ACTIVITY",
      severity: "MEDIUM",
      category: "Entertainment",
      currentAmount: 600,
      baselineAverage: 0,
    },
  ],
  currencySafety,
});

assert.equal(
  zeroExpenseHistoryForecast.forecast.expense,
  401860,
);
assert.ok(
  zeroExpenseHistoryForecast.forecast.netSavings > 0,
);

const budgetAnalytics = {
  items: [
    {
      category: "Investment",
      budget: 500000,
      spent: 400000,
      remaining: 100000,
      percentageUsed: 80,
    },
  ],
};

const simulation = simulateFinancialScenario({
  scenario: "ADD_EXPENSE",
  amount: 150000,
  category: "Investment",
  currentOverview: {
    totalIncome: 420000,
    totalExpense: 400600,
  },
  currentCategories,
  budgetAnalytics,
  monthlyForecast: forecast,
  currencySafety,
  preferredCurrency: "INR",
});

assert.equal(simulation.supported, true);
assert.equal(
  simulation.currentMonth.after.netSavings,
  -130600,
);
assert.equal(
  simulation.budgetImpact.overBudgetAfter,
  true,
);
assert.equal(
  simulation.assessment,
  "HIGH_IMPACT",
);

const reduction = simulateFinancialScenario({
  scenario: "REDUCE_CATEGORY_SPENDING",
  category: "Entertainment",
  reductionPercent: 50,
  currentOverview: {
    totalIncome: 420000,
    totalExpense: 400600,
  },
  currentCategories,
  budgetAnalytics,
  monthlyForecast: forecast,
  currencySafety,
  preferredCurrency: "INR",
});

assert.equal(reduction.supported, true);
assert.equal(
  reduction.inputs.calculatedScenarioAmount,
  300,
);
assert.equal(
  reduction.currentMonth.changes.netSavings,
  300,
);

const mixedCurrency = getCurrencySafety({
  accounts: [
    {
      currency: "INR",
    },
    {
      currency: "USD",
    },
  ],
  preferredCurrency: "INR",
});

assert.equal(
  mixedCurrency.supported,
  false,
);

console.log("FinTrack AI intelligence regression tests passed.");
