import Category from "../models/Category.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";
import {
  getAccountSummaryForUser,
  getCategoryBreakdownForUser,
  getMonthlyTrendForUser,
  getOverviewForUser,
} from "./analytics.service.js";
import {
  buildAccountAnalytics,
  buildBudgetAnalytics,
  buildCategoryComparison,
  buildDeterministicAnalytics,
  buildGoalAnalytics,
  compareValues,
} from "./assistantAnalytics.service.js";
import { getBudgetsForUser } from "./budget.service.js";
import { getGoalsForUser } from "./goal.service.js";

const PERIODS = [
  "CURRENT_MONTH_TO_DATE",
  "PREVIOUS_COMPARABLE_PERIOD",
  "LAST_30_DAYS",
  "LAST_90_DAYS",
];

const TRANSACTION_TYPES = ["INCOME", "EXPENSE"];

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const clampInteger = (value, { min, max, fallback }) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toDateKey = (date) => date.toISOString().slice(0, 10);

const getCurrentMonthKey = (asOf) => {
  const date = new Date(asOf);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const getCurrentMonthToDateRange = (asOf) => {
  const date = new Date(asOf);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  return {
    startDate: toDateKey(new Date(Date.UTC(year, month, 1))),
    endDate: toDateKey(new Date(Date.UTC(year, month, day))),
    daysIncluded: day,
  };
};

const getPreviousComparableRange = (asOf) => {
  const date = new Date(asOf);
  const currentDay = date.getUTCDate();
  const previousMonthStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1),
  );
  const previousYear = previousMonthStart.getUTCFullYear();
  const previousMonth = previousMonthStart.getUTCMonth();
  const previousMonthLastDay = new Date(
    Date.UTC(previousYear, previousMonth + 1, 0),
  ).getUTCDate();
  const comparableDay = Math.min(currentDay, previousMonthLastDay);

  return {
    startDate: toDateKey(new Date(Date.UTC(previousYear, previousMonth, 1))),
    endDate: toDateKey(
      new Date(Date.UTC(previousYear, previousMonth, comparableDay)),
    ),
    daysIncluded: comparableDay,
  };
};

const getRollingRange = ({ asOf, days }) => {
  const end = new Date(asOf);
  const start = new Date(asOf);

  start.setUTCDate(start.getUTCDate() - (days - 1));

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    daysIncluded: days,
  };
};

const resolvePeriod = ({ period, asOf }) => {
  const normalized = PERIODS.includes(period)
    ? period
    : "CURRENT_MONTH_TO_DATE";

  if (normalized === "PREVIOUS_COMPARABLE_PERIOD") {
    return {
      period: normalized,
      ...getPreviousComparableRange(asOf),
    };
  }

  if (normalized === "LAST_30_DAYS") {
    return {
      period: normalized,
      ...getRollingRange({ asOf, days: 30 }),
    };
  }

  if (normalized === "LAST_90_DAYS") {
    return {
      period: normalized,
      ...getRollingRange({ asOf, days: 90 }),
    };
  }

  return {
    period: "CURRENT_MONTH_TO_DATE",
    ...getCurrentMonthToDateRange(asOf),
  };
};

const assertMonth = (month) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new AppError("Tool month must use YYYY-MM format", 400);
  }
};

const simplifyTransaction = (transaction) => ({
  title: transaction.title,
  type: transaction.type,
  amount: round2(transaction.amount),
  date: transaction.transactionDate,
  category: transaction.category?.name || "Unknown",
  account: transaction.account?.name || "Unknown",
  accountType: transaction.account?.type || "Unknown",
  currency: transaction.account?.currency || "Unknown",
  paymentMethod: transaction.paymentMethod,
});

const simplifyRecurring = (recurring) => ({
  title: recurring.title,
  type: recurring.type,
  amount: round2(recurring.amount),
  frequency: recurring.frequency,
  interval: recurring.interval,
  nextRunDate: recurring.nextRunDate,
  category: recurring.category?.name || "Unknown",
  account: recurring.account?.name || "Unknown",
  currency: recurring.account?.currency || "Unknown",
});

const getRecentSavingsBaseline = async ({ userId, asOf }) => {
  const currentMonth = getCurrentMonthKey(asOf);
  const monthlyTrend = await getMonthlyTrendForUser({
    userId,
    months: 6,
  });

  const completedWithActivity = monthlyTrend.filter(
    (item) =>
      item.key !== currentMonth &&
      ((Number(item.income) || 0) !== 0 || (Number(item.expense) || 0) !== 0),
  );
  const recentCompleted = completedWithActivity.slice(-3);
  const averageNetSavings = recentCompleted.length
    ? round2(
        recentCompleted.reduce(
          (total, item) => total + (Number(item.netSavings) || 0),
          0,
        ) / recentCompleted.length,
      )
    : 0;

  return {
    monthlyTrend,
    recentCompleted,
    averageNetSavings,
  };
};

const getFinancialOverviewTool = async ({ user, args, asOf }) => {
  const range = resolvePeriod({
    period: args.period,
    asOf,
  });
  const overview = await getOverviewForUser({
    userId: user._id,
    startDate: range.startDate,
    endDate: range.endDate,
  });

  return {
    dataCoverage: range,
    preferredCurrency: user.preferredCurrency || "INR",
    overview: {
      totalIncome: round2(overview.totalIncome),
      totalExpense: round2(overview.totalExpense),
      netSavings: round2(overview.netSavings),
      savingsRate: round2(overview.savingsRate),
      incomeTransactionCount: overview.incomeTransactionCount,
      expenseTransactionCount: overview.expenseTransactionCount,
      totalTransactionCount: overview.totalTransactionCount,
    },
  };
};

const getSpendingByCategoryTool = async ({ user, args, asOf }) => {
  const range = resolvePeriod({
    period: args.period,
    asOf,
  });
  const limit = clampInteger(args.limit, {
    min: 1,
    max: 15,
    fallback: 10,
  });
  const categories = await getCategoryBreakdownForUser({
    userId: user._id,
    startDate: range.startDate,
    endDate: range.endDate,
  });

  return {
    dataCoverage: range,
    preferredCurrency: user.preferredCurrency || "INR",
    categories: categories.slice(0, limit).map((category) => ({
      category: category.name,
      amount: round2(category.amount),
      expenseSharePercent: round2(category.percentage),
      transactionCount: category.transactionCount,
    })),
  };
};

const compareMonthToDateTool = async ({ user, asOf }) => {
  const currentRange = getCurrentMonthToDateRange(asOf);
  const previousRange = getPreviousComparableRange(asOf);

  const [currentOverview, previousOverview, currentCategories, previousCategories] =
    await Promise.all([
      getOverviewForUser({
        userId: user._id,
        startDate: currentRange.startDate,
        endDate: currentRange.endDate,
      }),
      getOverviewForUser({
        userId: user._id,
        startDate: previousRange.startDate,
        endDate: previousRange.endDate,
      }),
      getCategoryBreakdownForUser({
        userId: user._id,
        startDate: currentRange.startDate,
        endDate: currentRange.endDate,
      }),
      getCategoryBreakdownForUser({
        userId: user._id,
        startDate: previousRange.startDate,
        endDate: previousRange.endDate,
      }),
    ]);

  return {
    comparisonBasis: {
      currentPeriod: currentRange,
      previousPeriod: previousRange,
      exactlySameNumberOfDays:
        currentRange.daysIncluded === previousRange.daysIncluded,
      note:
        "The current month-to-date window is compared with the same number of elapsed days in the previous month whenever possible.",
    },
    preferredCurrency: user.preferredCurrency || "INR",
    changes: {
      income: compareValues(
        currentOverview.totalIncome,
        previousOverview.totalIncome,
      ),
      expense: compareValues(
        currentOverview.totalExpense,
        previousOverview.totalExpense,
      ),
      netSavings: compareValues(
        currentOverview.netSavings,
        previousOverview.netSavings,
      ),
      savingsRatePercentagePoints: round2(
        currentOverview.savingsRate - previousOverview.savingsRate,
      ),
    },
    categoryComparison: buildCategoryComparison({
      currentCategories,
      previousCategories,
    }).slice(0, 15),
  };
};

const getBudgetStatusTool = async ({ user, args, asOf }) => {
  const currentMonth = getCurrentMonthKey(asOf);
  const month = args.month || currentMonth;
  assertMonth(month);

  const budgets = await getBudgetsForUser({
    userId: user._id,
    month,
  });

  const categoryFilter = String(args.category || "").trim().toLowerCase();

  if (month !== currentMonth) {
    let items = budgets.map((budget) => ({
      category: budget.category?.name || "Unknown",
      budget: round2(budget.amount),
      spent: round2(budget.spent),
      remaining: round2(budget.remaining),
      percentageUsed: round2(budget.percentageUsed),
      isOverBudget: Boolean(budget.isOverBudget),
      amountOverBudget: budget.isOverBudget
        ? round2(Math.max(budget.spent - budget.amount, 0))
        : 0,
    }));

    if (categoryFilter) {
      items = items.filter((item) =>
        item.category.toLowerCase().includes(categoryFilter),
      );
    }

    return {
      month,
      isCurrentMonth: false,
      projectionAvailable: false,
      preferredCurrency: user.preferredCurrency || "INR",
      items,
      note:
        "Historical budget results report actual budget usage only; current-month pace projections are not applied to completed months.",
    };
  }

  const currentRange = getCurrentMonthToDateRange(asOf);
  const [categories, overview] = await Promise.all([
    getCategoryBreakdownForUser({
      userId: user._id,
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
    }),
    getOverviewForUser({
      userId: user._id,
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
    }),
  ]);

  const analytics = buildBudgetAnalytics({
    budgets,
    categories,
    totalExpense: overview.totalExpense,
    currentMonth,
    asOf,
  });

  if (categoryFilter) {
    analytics.items = analytics.items.filter((item) =>
      item.category.toLowerCase().includes(categoryFilter),
    );
    analytics.unbudgetedSpending = analytics.unbudgetedSpending.filter((item) =>
      item.category.toLowerCase().includes(categoryFilter),
    );
  }

  return {
    month,
    isCurrentMonth: true,
    preferredCurrency: user.preferredCurrency || "INR",
    ...analytics,
  };
};

const getGoalProgressTool = async ({ user, args, asOf }) => {
  const [goals, baseline] = await Promise.all([
    getGoalsForUser({ userId: user._id }),
    getRecentSavingsBaseline({ userId: user._id, asOf }),
  ]);

  let goalAnalytics = buildGoalAnalytics({
    goals,
    recentAverageMonthlySavings: baseline.averageNetSavings,
    recentSavingsMonthsUsed: baseline.recentCompleted.map((item) => item.key),
  });

  const goalFilter = String(args.goalName || "").trim().toLowerCase();

  if (goalFilter) {
    goalAnalytics = goalAnalytics.filter((goal) =>
      goal.name.toLowerCase().includes(goalFilter),
    );
  }

  return {
    preferredCurrency: user.preferredCurrency || "INR",
    goals: goalAnalytics,
    baseline: {
      averageNetSavings: baseline.averageNetSavings,
      monthsUsed: baseline.recentCompleted.map((item) => item.key),
      monthCount: baseline.recentCompleted.length,
      note:
        "Only completed months with recorded income or expense activity are used for the recent savings baseline.",
    },
  };
};

const getAccountBalancesTool = async ({ user }) => {
  const accounts = await getAccountSummaryForUser({
    userId: user._id,
  });

  return {
    preferredCurrency: user.preferredCurrency || "INR",
    summary: buildAccountAnalytics(accounts),
    accounts: accounts.map((account) => ({
      name: account.name,
      type: account.type,
      balance: round2(account.balance),
      currency: account.currency,
    })),
  };
};

const getRecentTransactionsTool = async ({ user, args, asOf }) => {
  const limit = clampInteger(args.limit, {
    min: 1,
    max: 20,
    fallback: 10,
  });
  const days = clampInteger(args.days, {
    min: 1,
    max: 365,
    fallback: 30,
  });
  const type = TRANSACTION_TYPES.includes(args.type) ? args.type : null;
  const query = {
    user: user._id,
  };

  if (type) {
    query.type = type;
  }

  const startDate = new Date(asOf);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  startDate.setUTCHours(0, 0, 0, 0);
  query.transactionDate = {
    $gte: startDate,
    $lte: new Date(asOf),
  };

  const categoryName = String(args.category || "").trim();

  if (categoryName) {
    const category = await Category.findOne({
      user: user._id,
      name: {
        $regex: `^${escapeRegex(categoryName)}$`,
        $options: "i",
      },
    }).select("_id name");

    if (!category) {
      return {
        dataCoverage: {
          days,
          startDate: toDateKey(startDate),
          endDate: toDateKey(new Date(asOf)),
        },
        preferredCurrency: user.preferredCurrency || "INR",
        categoryMatched: null,
        transactions: [],
        note: `No FinTrack category named \"${categoryName}\" was found.`,
      };
    }

    query.category = category._id;
  }

  const transactions = await Transaction.find(query)
    .populate("account", "name type currency")
    .populate("category", "name type")
    .sort({
      transactionDate: -1,
      createdAt: -1,
    })
    .limit(limit);

  return {
    dataCoverage: {
      days,
      startDate: toDateKey(startDate),
      endDate: toDateKey(new Date(asOf)),
    },
    preferredCurrency: user.preferredCurrency || "INR",
    filters: {
      type,
      category: categoryName || null,
      limit,
    },
    transactions: transactions.map(simplifyTransaction),
  };
};

const getRecurringTransactionsTool = async ({ user, args, asOf }) => {
  const horizonDays = clampInteger(args.horizonDays, {
    min: 1,
    max: 90,
    fallback: 30,
  });
  const type = TRANSACTION_TYPES.includes(args.type) ? args.type : null;
  const horizon = new Date(asOf);
  horizon.setUTCDate(horizon.getUTCDate() + horizonDays);

  const query = {
    user: user._id,
    isActive: true,
    nextRunDate: {
      $gte: new Date(asOf),
      $lte: horizon,
    },
  };

  if (type) {
    query.type = type;
  }

  const recurring = await RecurringTransaction.find(query)
    .populate("account", "name type currency")
    .populate("category", "name type")
    .sort({ nextRunDate: 1 })
    .limit(30);
  const items = recurring.map(simplifyRecurring);

  const expenseByCurrency = {};
  const incomeByCurrency = {};

  for (const item of items) {
    const currency = item.currency || "UNKNOWN";
    const target = item.type === "INCOME" ? incomeByCurrency : expenseByCurrency;
    target[currency] = round2(
      (target[currency] || 0) + (Number(item.amount) || 0),
    );
  }

  return {
    dataCoverage: {
      asOf,
      horizonDays,
      through: horizon.toISOString(),
    },
    preferredCurrency: user.preferredCurrency || "INR",
    count: items.length,
    expenseByCurrency,
    incomeByCurrency,
    items,
  };
};

const getMonthlyTrendTool = async ({ user, args }) => {
  const months = clampInteger(args.months, {
    min: 3,
    max: 12,
    fallback: 6,
  });
  const trend = await getMonthlyTrendForUser({
    userId: user._id,
    months,
  });

  return {
    preferredCurrency: user.preferredCurrency || "INR",
    monthsRequested: months,
    trend: trend.map((item) => ({
      month: item.key,
      label: item.label,
      income: round2(item.income),
      expense: round2(item.expense),
      netSavings: round2(item.netSavings),
    })),
  };
};

const getFinancialHealthSummaryTool = async ({ user, asOf }) => {
  const userId = user._id;
  const currentMonth = getCurrentMonthKey(asOf);
  const currentRange = getCurrentMonthToDateRange(asOf);
  const comparableRange = getPreviousComparableRange(asOf);

  const [
    currentOverview,
    comparableOverview,
    monthlyTrend,
    currentCategories,
    comparableCategories,
    accounts,
    budgets,
    goals,
    recurringItems,
  ] = await Promise.all([
    getOverviewForUser({
      userId,
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
    }),
    getOverviewForUser({
      userId,
      startDate: comparableRange.startDate,
      endDate: comparableRange.endDate,
    }),
    getMonthlyTrendForUser({ userId, months: 6 }),
    getCategoryBreakdownForUser({
      userId,
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
    }),
    getCategoryBreakdownForUser({
      userId,
      startDate: comparableRange.startDate,
      endDate: comparableRange.endDate,
    }),
    getAccountSummaryForUser({ userId }),
    getBudgetsForUser({ userId, month: currentMonth }),
    getGoalsForUser({ userId }),
    RecurringTransaction.find({
      user: userId,
      isActive: true,
    })
      .populate("account", "name type currency")
      .populate("category", "name type")
      .sort({ nextRunDate: 1 })
      .limit(30),
  ]);

  const analytics = buildDeterministicAnalytics({
    asOf,
    currentMonth,
    currentRange,
    comparableRange,
    currentOverview,
    comparableOverview,
    currentCategories,
    comparableCategories,
    budgets,
    goals,
    monthlyTrend,
    accounts,
    recurringItems: recurringItems.map(simplifyRecurring),
  });

  return {
    preferredCurrency: user.preferredCurrency || "INR",
    timezone: user.timezone || "Asia/Kolkata",
    dataCoverage: analytics.dataCoverage,
    cashFlow: analytics.cashFlow,
    budgetSummary: {
      totalBudget: analytics.budgets.totalBudget,
      budgetedSpent: analytics.budgets.budgetedSpent,
      unbudgetedSpent: analytics.budgets.unbudgetedSpent,
      overBudgetCount: analytics.budgets.overBudgetCount,
      nearLimitCount: analytics.budgets.nearLimitCount,
      paceRiskCount: analytics.budgets.paceRiskCount,
      highestPaceRiskBudget: analytics.budgets.highestPaceRiskBudget,
      unbudgetedSpending: analytics.budgets.unbudgetedSpending.slice(0, 5),
    },
    accountSummary: analytics.accounts,
    goalSummary: analytics.goals,
    recurringSummary: analytics.recurring,
    insightCandidates: analytics.insightCandidates.slice(0, 10),
  };
};

const ASSISTANT_FUNCTION_DECLARATIONS = [
  {
    name: "get_financial_health_summary",
    description:
      "Use for broad questions about overall financial health, such as 'How am I doing financially?'. Returns a compact backend-calculated summary of cash flow, budget risk, goals, accounts, recurring items, and prioritized insights. Prefer specific tools for narrow questions.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_financial_overview",
    description:
      "Gets authoritative income, expense, net savings, savings rate, and transaction counts for one supported period.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: PERIODS,
          description:
            "Financial period to inspect. CURRENT_MONTH_TO_DATE is the default.",
        },
      },
    },
  },
  {
    name: "compare_month_to_date",
    description:
      "Compares the current month-to-date against the same elapsed-day window of the previous month. Use for 'compared with last month', category increases/decreases, or whether spending is rising. Handles zero baselines safely.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_spending_by_category",
    description:
      "Gets expense totals, shares, and transaction counts grouped by category for a selected period. Use for top-spending or category-breakdown questions.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: PERIODS,
          description: "Period to analyze.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 15,
          description: "Maximum categories to return. Defaults to 10.",
        },
      },
    },
  },
  {
    name: "get_budget_status",
    description:
      "Gets budget usage. For the current month it also returns time-aware pacing, linear month-end projection, projection confidence, and unbudgeted spending. Use for budget questions and budget forecasts.",
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description:
            "Optional budget month in YYYY-MM format. Omit for the current month.",
        },
        category: {
          type: "string",
          description:
            "Optional category name to narrow the result, for example Entertainment or Investment.",
        },
      },
    },
  },
  {
    name: "get_goal_progress",
    description:
      "Gets savings-goal progress and backend-calculated required monthly contribution, recent savings baseline, pace assessment, and evidence confidence. Use for goal feasibility or priority questions.",
    parameters: {
      type: "object",
      properties: {
        goalName: {
          type: "string",
          description: "Optional goal name or partial goal name to inspect.",
        },
      },
    },
  },
  {
    name: "get_account_balances",
    description:
      "Gets active FinTrack account balances and totals grouped by currency. Use for account, cash balance, wallet, bank, card, or investment-account balance questions. Never sum mixed currencies yourself.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_recent_transactions",
    description:
      "Gets recent recorded transactions with account, category, amount, currency, payment method, and date. Use when the user asks what specific transactions contributed to a result or asks about recent activity.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: TRANSACTION_TYPES,
          description: "Optional INCOME or EXPENSE filter.",
        },
        category: {
          type: "string",
          description: "Optional exact category name filter.",
        },
        days: {
          type: "integer",
          minimum: 1,
          maximum: 365,
          description: "Look-back window in days. Defaults to 30.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "Maximum number of transactions. Defaults to 10.",
        },
      },
    },
  },
  {
    name: "get_recurring_transactions",
    description:
      "Gets active recurring income or expenses due within a future horizon. Use for upcoming bills, subscriptions, recurring investments, salary, or expected recurring cash flow.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: TRANSACTION_TYPES,
          description: "Optional INCOME or EXPENSE filter.",
        },
        horizonDays: {
          type: "integer",
          minimum: 1,
          maximum: 90,
          description: "Future horizon in days. Defaults to 30.",
        },
      },
    },
  },
  {
    name: "get_monthly_trend",
    description:
      "Gets monthly income, expense, and net-savings totals for 3 to 12 months. Use for multi-month trends, averages, seasonality, or whether finances are improving over time.",
    parameters: {
      type: "object",
      properties: {
        months: {
          type: "integer",
          minimum: 3,
          maximum: 12,
          description: "Number of months to return. Defaults to 6.",
        },
      },
    },
  },
];

const TOOL_EXECUTORS = {
  get_financial_health_summary: getFinancialHealthSummaryTool,
  get_financial_overview: getFinancialOverviewTool,
  compare_month_to_date: compareMonthToDateTool,
  get_spending_by_category: getSpendingByCategoryTool,
  get_budget_status: getBudgetStatusTool,
  get_goal_progress: getGoalProgressTool,
  get_account_balances: getAccountBalancesTool,
  get_recent_transactions: getRecentTransactionsTool,
  get_recurring_transactions: getRecurringTransactionsTool,
  get_monthly_trend: getMonthlyTrendTool,
};

const executeAssistantTool = async ({ name, args = {}, user, asOf }) => {
  const executor = TOOL_EXECUTORS[name];

  if (!executor) {
    return {
      ok: false,
      error: `Unknown FinTrack tool: ${name}`,
    };
  }

  const startedAt = Date.now();

  try {
    const data = await executor({
      user,
      args: args && typeof args === "object" ? args : {},
      asOf,
    });

    console.info("FinTrack assistant tool executed", {
      tool: name,
      durationMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      authoritative: true,
      source: "FINTRACK_DATABASE",
      generatedAt: new Date().toISOString(),
      data,
    };
  } catch (error) {
    console.warn("FinTrack assistant tool failed", {
      tool: name,
      durationMs: Date.now() - startedAt,
      message: error.message,
    });

    return {
      ok: false,
      authoritative: true,
      source: "FINTRACK_DATABASE",
      error: error.message || "The FinTrack tool could not complete the query.",
    };
  }
};

export {
  ASSISTANT_FUNCTION_DECLARATIONS,
  executeAssistantTool,
};
