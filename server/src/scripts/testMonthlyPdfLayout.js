import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { sanitizeFiniteNumbers } from "../services/assistantGuardrails.service.js";
import { renderMonthlyReportPdf } from "../services/monthlyPdf.service.js";

const outputPath = path.join(os.tmpdir(), "fintrack-monthly-report-smoke.pdf");
const stream = fs.createWriteStream(outputPath);

const sample = {
  report: {
    month: "2026-08",
    monthLabel: "August 2026",
    isCurrentMonth: true,
    generatedAt: new Date().toISOString(),
    period: { startDate: "2026-08-01", endDate: "2026-08-10" },
    comparisonPeriod: {
      month: "2026-07",
      startDate: "2026-07-01",
      endDate: "2026-07-10",
      sameElapsedDays: true,
    },
  },
  user: {
    fullName: "Sample User",
    email: "sample@example.com",
    preferredCurrency: "INR",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },
  overview: {
    totalIncome: 420000,
    totalExpense: 400600,
    netSavings: 19400,
    savingsRate: 4.62,
    incomeTransactionCount: 4,
    expenseTransactionCount: 4,
  },
  comparison: {
    overview: {
      expense: {
        current: 400600,
        previous: 0,
        absoluteChange: 400600,
        percentChange: null,
        comparablePercent: false,
      },
    },
    categories: [],
  },
  categories: [
    { name: "Investment", amount: 400000, percentage: 99.85, transactionCount: 2 },
    { name: "Entertainment", amount: 600, percentage: 0.15, transactionCount: 2 },
  ],
  topExpenses: [
    {
      title: "Investment",
      amount: 300000,
      date: "2026-08-10",
      category: "Investment",
      account: "Bank",
      currency: "INR",
    },
    {
      title: "Investment",
      amount: 100000,
      date: "2026-08-05",
      category: "Investment",
      account: "Bank",
      currency: "INR",
    },
  ],
  trend: [
    { label: "Mar 2026", income: 50000, expense: 30000, netSavings: 20000 },
    { label: "Apr 2026", income: 50000, expense: 25000, netSavings: 25000 },
    { label: "May 2026", income: 50000, expense: 20000, netSavings: 30000 },
    { label: "Jun 2026", income: 50000, expense: 30000, netSavings: 20000 },
    { label: "Jul 2026", income: 50000, expense: 0, netSavings: 50000 },
    { label: "Aug 2026", income: 420000, expense: 400600, netSavings: 19400 },
  ],
  budgets: {
    supported: true,
    isCurrentMonth: true,
    projectionNote: "Anomaly-aware current-month projection.",
    items: [
      {
        category: "Investment",
        budget: 500000,
        spent: 400000,
        percentageUsed: 80,
        isOverBudget: false,
        projectedUsagePercent: 80,
        projectionConfidence: "LOW",
      },
    ],
    unbudgetedSpending: [
      { category: "Entertainment", spent: 600, transactionCount: 2 },
    ],
  },
  goals: {
    goals: [
      {
        name: "Emergency Fund",
        percentageComplete: 75,
        remainingAmount: 100000,
        targetDate: new Date("2027-01-01T00:00:00.000Z"),
        paceAssessment: "WITHIN_RECENT_SAVINGS_PACE",
      },
    ],
    portfolio: { activeGoalCount: 1 },
  },
  patterns: {
    topSignals: [
      {
        type: "NEW_CATEGORY_ACTIVITY",
        severity: "HIGH",
        category: "Investment",
        currentAmount: 400000,
      },
    ],
    quality: { evidenceConfidence: "LOW" },
  },
  forecast: {
    supported: true,
    forecast: {
      income: 420000,
      expense: 400600,
      netSavings: 19400,
      savingsRate: 4.62,
      confidence: "LOW",
      method: "ANOMALY_ADJUSTED_NON_RECURRING_FORECAST_PLUS_EXACT_RECURRING",
    },
    expensePaceAdjustment: { excludedFromPace: 400000 },
    recurringCashFlowContext: {
      currentRecordedIncome: 0,
      currentRecordedExpense: 600,
      historicalAverageIncome: 0,
      historicalAverageExpense: 0,
    },
    remainingMonthEstimate: {
      nonRecurringIncome: 0,
      scheduledRecurringIncome: 0,
      income: 0,
      nonRecurringExpense: 0,
      scheduledRecurringExpense: 0,
      expense: 0,
    },
    reportForecastContract: {
      sourceTool: "get_financial_forecast",
      asOf: "2026-08-10T12:00:00.000Z",
      sharedWithAssistant: true,
    },
  },
  recurring: { count: 2, income: 0, expense: 600, items: [] },
  accounts: {
    totalBalance: 250000,
    items: [
      { name: "Bank", type: "BANK", balance: 200000, currency: "INR" },
      { name: "Cash", type: "CASH", balance: 50000, currency: "INR" },
    ],
    note: "Account balances are a snapshot at report generation time.",
  },
  insights: {
    insights: [
      "Investment is the largest spending category at 99.85% of expenses.",
      "The previous comparable period had zero recorded expenses, so no percentage increase is shown.",
    ],
    warnings: [
      "Spending is highly concentrated in Investment.",
    ],
  },
  notes: [
    "Goal progress is a snapshot at report generation time.",
    "Pattern signals are not fraud determinations.",
  ],
};


const sanitizedDate = sanitizeFiniteNumbers(new Date("2027-01-01T00:00:00.000Z"));

if (sanitizedDate !== "2027-01-01T00:00:00.000Z") {
  console.error(`Date sanitization regression: ${String(sanitizedDate)}`);
  process.exit(1);
}

renderMonthlyReportPdf({ data: sample, stream });

stream.on("finish", () => {
  const stats = fs.statSync(outputPath);

  if (stats.size < 5000) {
    console.error(`Generated PDF is unexpectedly small: ${stats.size} bytes`);
    process.exit(1);
  }

  console.log(`FinTrack monthly PDF smoke test passed: ${outputPath} (${stats.size} bytes)`);
});
