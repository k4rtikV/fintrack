import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";
import {
  getAccountSummaryForUser,
  getCategoryBreakdownForUser,
  getMonthlyTrendForUser,
  getOverviewForUser,
  getTopExpensesForUser,
} from "./analytics.service.js";
import { getCurrencySafety } from "./assistantGuardrails.service.js";
import { executeAssistantTool } from "./assistantTools.service.js";

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const toDateKey = (date) => date.toISOString().slice(0, 10);

const getCurrentMonthKey = (date = new Date()) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const parseMonth = (month) => {
  const value = String(month || "");

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new AppError("Month must use YYYY-MM format", 400);
  }

  const [year, monthNumber] = value.split("-").map(Number);

  return {
    year,
    monthNumber,
    monthIndex: monthNumber - 1,
  };
};

const getMonthDates = (month) => {
  const { year, monthIndex } = parseMonth(month);
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  return { start, end };
};

const getPreviousMonthKey = (month) => {
  const { year, monthIndex } = parseMonth(month);
  const previous = new Date(Date.UTC(year, monthIndex - 1, 1));

  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
};

const getMonthLabel = (month) => {
  const { year, monthIndex } = parseMonth(month);

  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getComparisonRange = ({ month, analysisEnd, isCurrentMonth }) => {
  const previousMonth = getPreviousMonthKey(month);
  const previous = getMonthDates(previousMonth);

  if (!isCurrentMonth) {
    return {
      month: previousMonth,
      start: previous.start,
      end: previous.end,
      sameElapsedDays: false,
    };
  }

  const elapsedDay = analysisEnd.getUTCDate();
  const previousLastDay = previous.end.getUTCDate();
  const comparableDay = Math.min(elapsedDay, previousLastDay);
  const end = new Date(
    Date.UTC(
      previous.start.getUTCFullYear(),
      previous.start.getUTCMonth(),
      comparableDay,
      23,
      59,
      59,
      999,
    ),
  );

  return {
    month: previousMonth,
    start: previous.start,
    end,
    sameElapsedDays: true,
  };
};

const compareValues = (current, previous) => {
  const currentValue = round2(current);
  const previousValue = round2(previous);
  const absoluteChange = round2(currentValue - previousValue);

  return {
    current: currentValue,
    previous: previousValue,
    absoluteChange,
    percentChange:
      previousValue === 0
        ? null
        : round2((absoluteChange / Math.abs(previousValue)) * 100),
    comparablePercent: previousValue !== 0,
  };
};

const buildCategoryComparison = ({ current, previous }) => {
  const currentMap = new Map(current.map((item) => [item.name, item]));
  const previousMap = new Map(previous.map((item) => [item.name, item]));
  const names = [...new Set([...currentMap.keys(), ...previousMap.keys()])];

  return names
    .map((name) => {
      const currentAmount = Number(currentMap.get(name)?.amount) || 0;
      const previousAmount = Number(previousMap.get(name)?.amount) || 0;
      const change = compareValues(currentAmount, previousAmount);

      return {
        category: name,
        ...change,
      };
    })
    .sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange));
};

const unwrapTool = (result) => {
  if (!result?.ok) {
    return null;
  }

  return result.data || null;
};

const getRecordedRecurringActivity = async ({ userId, startDate, endDate }) => {
  const items = await Transaction.find({
    user: userId,
    recurringTransaction: { $ne: null },
    transactionDate: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate("account", "name currency")
    .populate("category", "name")
    .sort({ transactionDate: -1, createdAt: -1 })
    .limit(30);

  const income = items
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = items
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    count: items.length,
    income: round2(income),
    expense: round2(expense),
    items: items.slice(0, 10).map((item) => ({
      title: item.title,
      type: item.type,
      amount: round2(item.amount),
      currency: item.account?.currency || null,
      category: item.category?.name || "Unknown",
      date: toDateKey(item.transactionDate),
    })),
  };
};

const buildReportInsights = ({
  overview,
  previousOverview,
  categories,
  categoryComparison,
  budgetData,
  patternData,
  goalData,
  forecastData,
  currency,
}) => {
  const insights = [];
  const warnings = [];

  if (overview.totalIncome > 0) {
    if (overview.netSavings >= 0) {
      insights.push(
        `Net savings for the report period are ${currency} ${overview.netSavings.toLocaleString("en-IN")}, with a savings rate of ${round2(overview.savingsRate)}%.`,
      );
    } else {
      warnings.push(
        `Expenses exceed income by ${currency} ${Math.abs(overview.netSavings).toLocaleString("en-IN")} in the report period.`,
      );
    }
  } else if (overview.totalExpense > 0) {
    warnings.push("Expenses were recorded without any income in the report period.");
  }

  const expenseComparison = compareValues(
    overview.totalExpense,
    previousOverview.totalExpense,
  );

  if (expenseComparison.comparablePercent) {
    const direction = expenseComparison.absoluteChange > 0 ? "higher" : "lower";
    insights.push(
      `Expenses are ${Math.abs(expenseComparison.percentChange)}% ${direction} than the comparable previous-month period.`,
    );
  } else if (overview.totalExpense > 0 && previousOverview.totalExpense === 0) {
    insights.push(
      "The previous comparable period had zero recorded expenses, so FinTrack does not calculate a percentage increase from that baseline.",
    );
  }

  const topCategory = categories[0];

  if (topCategory) {
    insights.push(
      `${topCategory.name} is the largest spending category at ${round2(topCategory.percentage)}% of report-period expenses.`,
    );

    if (Number(topCategory.percentage) >= 70) {
      warnings.push(
        `Spending is highly concentrated in ${topCategory.name}, which represents ${round2(topCategory.percentage)}% of expenses.`,
      );
    }
  }

  const largestChange = categoryComparison.find((item) => item.absoluteChange !== 0);

  if (largestChange) {
    insights.push(
      `${largestChange.category} has the largest absolute category change versus the comparable previous period (${currency} ${Math.abs(largestChange.absoluteChange).toLocaleString("en-IN")}).`,
    );
  }

  if (budgetData?.items?.length) {
    const overBudget = budgetData.items.filter(
      (item) => item.isOverBudget || Number(item.percentageUsed) > 100,
    );

    if (overBudget.length) {
      warnings.push(
        `${overBudget.length} budget${overBudget.length === 1 ? " is" : "s are"} over the monthly limit.`,
      );
    } else if (budgetData.highestPaceRiskBudget) {
      warnings.push(
        `${budgetData.highestPaceRiskBudget.category} has the highest current budget pace risk.`,
      );
    }
  }

  const signals = patternData?.topSignals || [];
  const highSignals = signals.filter((signal) => signal.severity === "HIGH");

  if (highSignals.length) {
    warnings.push(
      `${highSignals.length} high-severity spending signal${highSignals.length === 1 ? " was" : "s were"} detected relative to recorded FinTrack history. These are pattern signals, not fraud determinations.`,
    );
  }

  if (goalData?.portfolio?.activeGoalCount > 1) {
    if (goalData.portfolio.collectivelyAffordable) {
      insights.push(
        "The combined required monthly contribution for active goals is within the recent savings baseline.",
      );
    } else {
      warnings.push(
        `Active goals collectively require more monthly funding than the recent savings baseline, with an estimated shortfall of ${currency} ${Number(goalData.portfolio.monthlyShortfall || 0).toLocaleString("en-IN")}.`,
      );
    }
  }

  if (forecastData?.supported && forecastData.forecast) {
    const forecast = forecastData.forecast;
    insights.push(
      `Current-month directional forecast: ${currency} ${Number(forecast.netSavings || 0).toLocaleString("en-IN")} projected net savings at ${String(forecast.confidence || "LOW").toLowerCase()} confidence.`,
    );
  }

  return {
    insights: insights.slice(0, 7),
    warnings: warnings.slice(0, 6),
  };
};

const getMonthlyReportData = async ({ user, month: requestedMonth }) => {
  const now = new Date();
  const currentMonth = getCurrentMonthKey(now);
  const month = requestedMonth || currentMonth;
  const monthDates = getMonthDates(month);

  if (monthDates.start > now) {
    throw new AppError("Monthly reports cannot be generated for a future month", 400);
  }

  const isCurrentMonth = month === currentMonth;
  const analysisEnd = isCurrentMonth && now < monthDates.end ? now : monthDates.end;
  const previousRange = getComparisonRange({
    month,
    analysisEnd,
    isCurrentMonth,
  });
  const trendStart = new Date(
    Date.UTC(
      monthDates.start.getUTCFullYear(),
      monthDates.start.getUTCMonth() - 5,
      1,
    ),
  );

  const [
    accounts,
    overview,
    categories,
    topExpenses,
    trend,
    previousOverview,
    previousCategories,
    recurringActivity,
  ] = await Promise.all([
    getAccountSummaryForUser({ userId: user._id }),
    getOverviewForUser({
      userId: user._id,
      startDate: monthDates.start,
      endDate: analysisEnd,
    }),
    getCategoryBreakdownForUser({
      userId: user._id,
      startDate: monthDates.start,
      endDate: analysisEnd,
    }),
    getTopExpensesForUser({
      userId: user._id,
      limit: 10,
      startDate: monthDates.start,
      endDate: analysisEnd,
    }),
    getMonthlyTrendForUser({
      userId: user._id,
      startDate: trendStart,
      endDate: analysisEnd,
    }),
    getOverviewForUser({
      userId: user._id,
      startDate: previousRange.start,
      endDate: previousRange.end,
    }),
    getCategoryBreakdownForUser({
      userId: user._id,
      startDate: previousRange.start,
      endDate: previousRange.end,
    }),
    getRecordedRecurringActivity({
      userId: user._id,
      startDate: monthDates.start,
      endDate: analysisEnd,
    }),
  ]);

  const allUserAccounts = await Account.find({
    user: user._id,
  }).select("currency isArchived");
  const currencySafety = getCurrencySafety({
    accounts: allUserAccounts,
    preferredCurrency: user.preferredCurrency || "INR",
  });

  if (!currencySafety.supported) {
    throw new AppError(
      "Monthly PDF reports currently require a single active account currency because FinTrack does not have an authoritative FX conversion layer",
      400,
      {
        code: "MIXED_CURRENCY_REPORT_UNSUPPORTED",
        activeCurrencies: currencySafety.activeCurrencies,
      },
    );
  }

  const reportAsOf = analysisEnd.toISOString();
  const liveAsOf = now.toISOString();
  const assistantToolCalls = [
    // Budget and goal models are current mutable records. Historical budget
    // usage is requested with the historical month argument while `asOf`
    // remains today so completed months are treated as actual-only periods.
    executeAssistantTool({
      name: "get_budget_status",
      args: { month },
      user,
      asOf: liveAsOf,
    }),
    // Goal progress is explicitly labelled as a generation-time snapshot.
    executeAssistantTool({
      name: "get_goal_progress",
      args: {},
      user,
      asOf: liveAsOf,
    }),
    // Spending patterns are reconstructed relative to the report period.
    executeAssistantTool({
      name: "analyze_spending_patterns",
      args: { lookbackMonths: 3 },
      user,
      asOf: reportAsOf,
    }),
  ];

  if (isCurrentMonth) {
    assistantToolCalls.push(
      executeAssistantTool({
        name: "get_financial_forecast",
        args: { historyMonths: 6 },
        user,
        // Pin the forecast to the exact same instant used as the report's
        // current-period end. This prevents subtle drift if generation spans
        // a clock/date boundary and documents that the PDF delegates to the
        // same hardened forecast tool used by the AI Assistant.
        asOf: reportAsOf,
      }),
    );
  }

  const toolResults = await Promise.all(assistantToolCalls);
  const budgetData = unwrapTool(toolResults[0]);
  const goalData = unwrapTool(toolResults[1]);
  const patternData = unwrapTool(toolResults[2]);
  const rawForecastData = isCurrentMonth ? unwrapTool(toolResults[3]) : null;
  const forecastData = rawForecastData
    ? {
        ...rawForecastData,
        reportForecastContract: {
          sourceTool: "get_financial_forecast",
          asOf: reportAsOf,
          sharedWithAssistant: true,
        },
      }
    : null;
  const categoryComparison = buildCategoryComparison({
    current: categories,
    previous: previousCategories,
  });
  const currency = user.preferredCurrency || accounts[0]?.currency || "INR";
  const accountTotal = round2(
    accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0),
  );
  const reportInsights = buildReportInsights({
    overview,
    previousOverview,
    categories,
    categoryComparison,
    budgetData,
    patternData,
    goalData,
    forecastData,
    currency,
  });

  return {
    report: {
      month,
      monthLabel: getMonthLabel(month),
      isCurrentMonth,
      generatedAt: now.toISOString(),
      period: {
        startDate: toDateKey(monthDates.start),
        endDate: toDateKey(analysisEnd),
        throughDate: isCurrentMonth ? toDateKey(analysisEnd) : null,
      },
      comparisonPeriod: {
        month: previousRange.month,
        startDate: toDateKey(previousRange.start),
        endDate: toDateKey(previousRange.end),
        sameElapsedDays: previousRange.sameElapsedDays,
      },
    },
    user: {
      fullName: user.fullName,
      email: user.email,
      preferredCurrency: currency,
      locale: user.locale || "en-IN",
      timezone: user.timezone || "Asia/Kolkata",
    },
    overview: {
      ...overview,
      totalIncome: round2(overview.totalIncome),
      totalExpense: round2(overview.totalExpense),
      netSavings: round2(overview.netSavings),
      savingsRate: round2(overview.savingsRate),
    },
    comparison: {
      overview: {
        income: compareValues(overview.totalIncome, previousOverview.totalIncome),
        expense: compareValues(overview.totalExpense, previousOverview.totalExpense),
        netSavings: compareValues(overview.netSavings, previousOverview.netSavings),
      },
      categories: categoryComparison.slice(0, 8),
    },
    categories: categories.slice(0, 10),
    topExpenses: topExpenses.map((expense) => ({
      id: String(expense._id),
      title: expense.title,
      amount: round2(expense.amount),
      date: toDateKey(expense.transactionDate),
      category: expense.category?.name || "Uncategorised",
      account: expense.account?.name || "Account",
      currency: expense.account?.currency || currency,
    })),
    trend: trend.map((item) => ({
      ...item,
      income: round2(item.income),
      expense: round2(item.expense),
      netSavings: round2(item.netSavings),
    })),
    budgets: budgetData,
    goals: goalData,
    patterns: patternData,
    forecast: forecastData,
    recurring: recurringActivity,
    accounts: {
      snapshotAt: now.toISOString(),
      totalBalance: accountTotal,
      items: accounts.map((account) => ({
        name: account.name,
        type: account.type,
        balance: round2(account.balance),
        currency: account.currency,
      })),
      note:
        "Account balances are a snapshot at report generation time because FinTrack does not currently store historical account-balance snapshots.",
    },
    insights: reportInsights,
    notes: [
      goalData
        ? "Goal progress is a snapshot at report generation time; FinTrack does not currently store historical goal-progress snapshots."
        : null,
      "Pattern/anomaly signals mean unusual relative to recorded FinTrack history; they are not fraud or wrongdoing determinations.",
      forecastData
        ? "Forecasts are directional estimates and may change with future transactions or behavior."
        : null,
    ].filter(Boolean),
  };
};

export { getMonthlyReportData };
