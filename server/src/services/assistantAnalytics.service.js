const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const percentOf = (part, whole) => {
  const safeWhole = Number(whole) || 0;

  if (safeWhole === 0) {
    return null;
  }

  return round2(((Number(part) || 0) / safeWhole) * 100);
};

const compareValues = (current, previous) => {
  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;
  const absoluteChange = round2(currentValue - previousValue);

  if (previousValue === 0) {
    return {
      current: round2(currentValue),
      previous: 0,
      absoluteChange,
      percentChange: null,
      direction:
        currentValue > 0 ? "UP" : currentValue < 0 ? "DOWN" : "FLAT",
      comparablePercent: false,
      note:
        currentValue === 0
          ? "Both periods are zero."
          : "Percentage change is not meaningful because the comparison period was zero.",
    };
  }

  const percentChange = round2(
    ((currentValue - previousValue) / Math.abs(previousValue)) * 100,
  );

  return {
    current: round2(currentValue),
    previous: round2(previousValue),
    absoluteChange,
    percentChange,
    direction:
      absoluteChange > 0 ? "UP" : absoluteChange < 0 ? "DOWN" : "FLAT",
    comparablePercent: true,
    note: null,
  };
};

const average = (values) => {
  if (!values.length) {
    return 0;
  }

  return round2(
    values.reduce((total, value) => total + (Number(value) || 0), 0) /
      values.length,
  );
};

const getBudgetStatus = (percentageUsed, isOverBudget) => {
  if (isOverBudget || percentageUsed > 100) {
    return "OVER_BUDGET";
  }

  if (percentageUsed >= 90) {
    return "CRITICAL";
  }

  if (percentageUsed >= 80) {
    return "NEAR_LIMIT";
  }

  return "ON_TRACK";
};


const getProjectionConfidence = ({ transactionCount, daysElapsed }) => {
  if (transactionCount >= 10 && daysElapsed >= 14) {
    return "HIGH";
  }

  if (transactionCount >= 4 && daysElapsed >= 7) {
    return "MEDIUM";
  }

  return "LOW";
};

const getBudgetPaceAssessment = ({
  percentageUsed,
  monthElapsedPercent,
  isOverBudget,
}) => {
  if (isOverBudget || percentageUsed > 100) {
    return "ALREADY_OVER_BUDGET";
  }

  if (percentageUsed === 0) {
    return "NO_SPEND_YET";
  }

  if (monthElapsedPercent <= 0) {
    return "INSUFFICIENT_TIME_DATA";
  }

  const paceRatio = percentageUsed / monthElapsedPercent;

  if (paceRatio >= 2) {
    return "FAR_AHEAD_OF_BUDGET_PACE";
  }

  if (paceRatio >= 1.25) {
    return "AHEAD_OF_BUDGET_PACE";
  }

  if (paceRatio >= 0.85) {
    return "ROUGHLY_ON_BUDGET_PACE";
  }

  return "BELOW_BUDGET_PACE";
};

const getBudgetPaceRisk = ({
  isOverBudget,
  projectedUsagePercent,
  percentageUsed,
}) => {
  if (isOverBudget || percentageUsed > 100) {
    return "HIGH";
  }

  if (projectedUsagePercent !== null && projectedUsagePercent > 120) {
    return "HIGH";
  }

  if (projectedUsagePercent !== null && projectedUsagePercent > 100) {
    return "ELEVATED";
  }

  if (percentageUsed >= 90) {
    return "ELEVATED";
  }

  return "LOW";
};

const buildMonthProgress = ({ currentMonth, asOf }) => {
  const [year, monthNumber] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const asOfDate = new Date(asOf);
  const daysElapsed = Math.min(
    Math.max(asOfDate.getUTCDate(), 1),
    daysInMonth,
  );

  return {
    daysElapsed,
    daysInMonth,
    daysRemaining: Math.max(daysInMonth - daysElapsed, 0),
    monthElapsedPercent: round2((daysElapsed / daysInMonth) * 100),
  };
};

const buildBudgetAnalytics = ({
  budgets,
  categories,
  totalExpense,
  currentMonth,
  asOf,
}) => {
  const categoryById = new Map(
    categories.map((category) => [category.categoryId?.toString(), category]),
  );

  const budgetedCategoryIds = new Set();

  const items = budgets.map((budget) => {
    const categoryId = (
      budget.category?._id ?? budget.category
    )?.toString();
    const category = categoryById.get(categoryId);
    const spent = round2(budget.spent);
    const amount = round2(budget.amount);
    const remaining = round2(budget.remaining);
    const percentageUsed = round2(budget.percentageUsed);

    if (categoryId) {
      budgetedCategoryIds.add(categoryId);
    }

    const transactionCount = category?.transactionCount || 0;
    const monthProgress = buildMonthProgress({
      currentMonth,
      asOf,
    });
    const averageDailySpend =
      monthProgress.daysElapsed > 0
        ? round2(spent / monthProgress.daysElapsed)
        : 0;
    const projectedMonthEndSpend =
      spent > 0
        ? round2(averageDailySpend * monthProgress.daysInMonth)
        : 0;
    const projectedUsagePercent =
      amount > 0 ? percentOf(projectedMonthEndSpend, amount) : null;
    const projectedOverage =
      amount > 0
        ? round2(Math.max(projectedMonthEndSpend - amount, 0))
        : 0;
    const paceRatio =
      monthProgress.monthElapsedPercent > 0
        ? round2(percentageUsed / monthProgress.monthElapsedPercent)
        : null;
    const paceAssessment = getBudgetPaceAssessment({
      percentageUsed,
      monthElapsedPercent: monthProgress.monthElapsedPercent,
      isOverBudget: Boolean(budget.isOverBudget),
    });
    const paceRisk = getBudgetPaceRisk({
      isOverBudget: Boolean(budget.isOverBudget),
      projectedUsagePercent,
      percentageUsed,
    });

    return {
      category: budget.category?.name || category?.name || "Unknown",
      budget: amount,
      spent,
      remaining,
      percentageUsed,
      transactionCount,
      isOverBudget: Boolean(budget.isOverBudget),
      amountOverBudget: budget.isOverBudget
        ? round2(Math.max(spent - amount, 0))
        : 0,
      status: getBudgetStatus(percentageUsed, budget.isOverBudget),
      monthProgress,
      expectedUsageByNowPercent: monthProgress.monthElapsedPercent,
      paceRatio,
      paceAssessment,
      paceRisk,
      averageDailySpend,
      projectedMonthEndSpend,
      projectedUsagePercent,
      projectedOverage,
      projectionConfidence: getProjectionConfidence({
        transactionCount,
        daysElapsed: monthProgress.daysElapsed,
      }),
      projectionMethod: "LINEAR_MONTH_TO_DATE_DAILY_AVERAGE",
      projectionCaveat:
        "This is a simple pace projection from month-to-date average spending. One-off or irregular purchases can make it inaccurate.",
    };
  });

  const unbudgetedSpending = categories
    .filter((category) => {
      const id = category.categoryId?.toString();
      return id && !budgetedCategoryIds.has(id) && category.amount > 0;
    })
    .map((category) => ({
      category: category.name,
      spent: round2(category.amount),
      transactionCount: category.transactionCount,
      shareOfExpensePercent: round2(category.percentage),
    }))
    .sort((a, b) => b.spent - a.spent);

  const budgetedSpent = round2(
    items.reduce((total, item) => total + item.spent, 0),
  );
  const unbudgetedSpent = round2(
    unbudgetedSpending.reduce((total, item) => total + item.spent, 0),
  );
  const totalBudget = round2(
    items.reduce((total, item) => total + item.budget, 0),
  );

  const monthProgress = buildMonthProgress({
    currentMonth,
    asOf,
  });
  const paceRiskItems = items
    .filter((item) => ["HIGH", "ELEVATED"].includes(item.paceRisk))
    .sort((a, b) => {
      const riskRank = {
        HIGH: 2,
        ELEVATED: 1,
        LOW: 0,
      };

      return (
        riskRank[b.paceRisk] - riskRank[a.paceRisk] ||
        (b.projectedUsagePercent || 0) - (a.projectedUsagePercent || 0)
      );
    });

  return {
    totalBudget,
    budgetedSpent,
    unbudgetedSpent,
    spendingCoveredByBudgetPercent:
      percentOf(budgetedSpent, totalExpense) ?? 0,
    overBudgetCount: items.filter((item) => item.status === "OVER_BUDGET")
      .length,
    nearLimitCount: items.filter((item) =>
      ["CRITICAL", "NEAR_LIMIT"].includes(item.status),
    ).length,
    monthProgress,
    paceRiskCount: paceRiskItems.length,
    highestPaceRiskBudget: paceRiskItems[0] || null,
    projectionNote:
      "Budget projections use a simple month-to-date daily-average pace. They are directional estimates, not guarantees.",
    items,
    unbudgetedSpending,
  };
};

const buildCategoryComparison = ({ currentCategories, previousCategories }) => {
  const previousById = new Map(
    previousCategories.map((category) => [
      category.categoryId?.toString(),
      category,
    ]),
  );

  const currentIds = new Set(
    currentCategories
      .map((category) => category.categoryId?.toString())
      .filter(Boolean),
  );

  const comparisons = currentCategories.map((category) => {
    const id = category.categoryId?.toString();
    const previous = previousById.get(id);
    const change = compareValues(category.amount, previous?.amount || 0);

    return {
      category: category.name,
      currentSpent: round2(category.amount),
      previousComparableSpent: round2(previous?.amount || 0),
      absoluteChange: change.absoluteChange,
      percentChange: change.percentChange,
      comparablePercent: change.comparablePercent,
      direction: change.direction,
      currentTransactionCount: category.transactionCount || 0,
      previousTransactionCount: previous?.transactionCount || 0,
      currentExpenseSharePercent: round2(category.percentage),
    };
  });

  for (const previous of previousCategories) {
    const id = previous.categoryId?.toString();

    if (!id || currentIds.has(id) || previous.amount <= 0) {
      continue;
    }

    comparisons.push({
      category: previous.name,
      currentSpent: 0,
      previousComparableSpent: round2(previous.amount),
      absoluteChange: round2(-previous.amount),
      percentChange: -100,
      comparablePercent: true,
      direction: "DOWN",
      currentTransactionCount: 0,
      previousTransactionCount: previous.transactionCount || 0,
      currentExpenseSharePercent: 0,
    });
  }

  return comparisons.sort(
    (a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange),
  );
};

const buildAccountAnalytics = (accounts) => {
  const balancesByCurrency = {};

  for (const account of accounts) {
    const currency = account.currency || "UNKNOWN";
    balancesByCurrency[currency] = round2(
      (balancesByCurrency[currency] || 0) + (Number(account.balance) || 0),
    );
  }

  const currencies = Object.keys(balancesByCurrency);

  return {
    activeAccountCount: accounts.length,
    currencies,
    hasMixedCurrencies: currencies.length > 1,
    balancesByCurrency,
    totalBalanceIsSafelyAddable: currencies.length <= 1,
  };
};

const buildGoalAnalytics = ({
  goals,
  recentAverageMonthlySavings,
  recentSavingsMonthsUsed,
}) => {
  const baselineMonthCount = recentSavingsMonthsUsed.length;
  const evidenceConfidence =
    baselineMonthCount >= 3
      ? "HIGH"
      : baselineMonthCount === 2
        ? "MEDIUM"
        : baselineMonthCount === 1
          ? "LOW"
          : "NONE";

  return goals.map((goal) => {
    const remainingAmount = round2(goal.remainingAmount);
    const daysRemaining = Number(goal.daysRemaining);
    const completed = goal.status === "COMPLETED" || remainingAmount <= 0;
    const overdue = goal.status === "OVERDUE" || daysRemaining < 0;

    let requiredMonthlyContribution = 0;
    let paceAssessment = "COMPLETED";

    if (!completed && overdue) {
      requiredMonthlyContribution = null;
      paceAssessment = "OVERDUE";
    } else if (!completed) {
      const remainingMonths = Math.max(daysRemaining / 30.4375, 1 / 30.4375);
      requiredMonthlyContribution = round2(remainingAmount / remainingMonths);

      if (baselineMonthCount === 0 || recentAverageMonthlySavings <= 0) {
        paceAssessment = "NO_POSITIVE_RECENT_SAVINGS_BASELINE";
      } else if (requiredMonthlyContribution <= recentAverageMonthlySavings) {
        paceAssessment = "WITHIN_RECENT_SAVINGS_PACE";
      } else {
        paceAssessment = "ABOVE_RECENT_SAVINGS_PACE";
      }
    }

    return {
      name: goal.name,
      targetAmount: round2(goal.targetAmount),
      currentAmount: round2(goal.currentAmount),
      remainingAmount,
      percentageComplete: round2(goal.percentageComplete),
      targetDate: goal.targetDate,
      daysRemaining,
      status: goal.status,
      requiredMonthlyContribution,
      recentAverageMonthlySavings: round2(recentAverageMonthlySavings),
      savingsBaselineMonthsUsed: recentSavingsMonthsUsed,
      savingsBaselineMonthCount: baselineMonthCount,
      evidenceConfidence,
      assessmentBasis:
        baselineMonthCount > 0
          ? `Based on ${baselineMonthCount} completed month${baselineMonthCount === 1 ? "" : "s"} with recorded income or expense activity.`
          : "No completed month with recorded income or expense activity is available for a recent savings baseline.",
      requiredShareOfRecentSavingsPercent:
        requiredMonthlyContribution !== null && recentAverageMonthlySavings > 0
          ? percentOf(requiredMonthlyContribution, recentAverageMonthlySavings)
          : null,
      paceAssessment,
    };
  });
};

const buildRecurringAnalytics = ({ recurringItems, asOf }) => {
  const now = new Date(asOf);
  const horizon = new Date(now);
  horizon.setUTCDate(horizon.getUTCDate() + 30);

  const dueSoon = recurringItems.filter((item) => {
    const nextRun = new Date(item.nextRunDate);
    return nextRun >= now && nextRun <= horizon;
  });

  const expenseByCurrency = {};
  const incomeByCurrency = {};

  for (const item of dueSoon) {
    const currency = item.currency || "UNKNOWN";
    const target = item.type === "INCOME" ? incomeByCurrency : expenseByCurrency;
    target[currency] = round2(
      (target[currency] || 0) + (Number(item.amount) || 0),
    );
  }

  return {
    next30DaysCount: dueSoon.length,
    next30DaysExpenseByCurrency: expenseByCurrency,
    next30DaysIncomeByCurrency: incomeByCurrency,
    items: dueSoon.map((item) => ({
      title: item.title,
      type: item.type,
      amount: round2(item.amount),
      currency: item.currency || "UNKNOWN",
      frequency: item.frequency,
      nextRunDate: item.nextRunDate,
      category: item.category,
      account: item.account,
    })),
  };
};

const buildInsightCandidates = ({
  currentOverview,
  comparableOverview,
  budgetAnalytics,
  categoryComparison,
  accountAnalytics,
  goalAnalytics,
  recurringAnalytics,
  sameDayComparison,
}) => {
  const insights = [];

  const expenseChange = compareValues(
    currentOverview.totalExpense,
    comparableOverview.totalExpense,
  );
  const incomeChange = compareValues(
    currentOverview.totalIncome,
    comparableOverview.totalIncome,
  );
  const savingsChange = compareValues(
    currentOverview.netSavings,
    comparableOverview.netSavings,
  );

  insights.push({
    type: "CASH_FLOW_COMPARISON",
    importance: "HIGH",
    fact: {
      comparisonBasis: sameDayComparison,
      income: incomeChange,
      expense: expenseChange,
      netSavings: savingsChange,
      currentSavingsRate: round2(currentOverview.savingsRate),
      previousComparableSavingsRate: round2(comparableOverview.savingsRate),
    },
  });

  const biggestCategory = categoryComparison
    .filter((item) => item.currentSpent > 0)
    .sort((a, b) => b.currentSpent - a.currentSpent)[0];

  if (biggestCategory) {
    insights.push({
      type: "TOP_SPENDING_CATEGORY",
      importance: "MEDIUM",
      fact: biggestCategory,
    });
  }

  const fastestIncrease = categoryComparison
    .filter(
      (item) =>
        item.absoluteChange > 0 &&
        item.currentSpent > 0 &&
        item.comparablePercent,
    )
    .sort((a, b) => b.absoluteChange - a.absoluteChange)[0];

  if (fastestIncrease) {
    insights.push({
      type: "CATEGORY_INCREASE",
      importance: "MEDIUM",
      fact: fastestIncrease,
    });
  }

  for (const item of budgetAnalytics.items.filter(
    (budget) =>
      ["HIGH", "ELEVATED"].includes(budget.paceRisk) ||
      ["OVER_BUDGET", "CRITICAL", "NEAR_LIMIT"].includes(budget.status),
  )) {
    insights.push({
      type: ["HIGH", "ELEVATED"].includes(item.paceRisk)
        ? "BUDGET_PACE_ALERT"
        : "BUDGET_ALERT",
      importance:
        item.status === "OVER_BUDGET" || item.paceRisk === "HIGH"
          ? "HIGH"
          : "MEDIUM",
      fact: item,
    });
  }

  if (budgetAnalytics.unbudgetedSpending.length > 0) {
    insights.push({
      type: "UNBUDGETED_SPENDING",
      importance: "MEDIUM",
      fact: {
        total: budgetAnalytics.unbudgetedSpent,
        categories: budgetAnalytics.unbudgetedSpending.slice(0, 5),
      },
    });
  }

  if (accountAnalytics.hasMixedCurrencies) {
    insights.push({
      type: "MIXED_CURRENCY_WARNING",
      importance: "HIGH",
      fact: {
        balancesByCurrency: accountAnalytics.balancesByCurrency,
        note:
          "Balances in different currencies must not be added together without an exchange-rate conversion.",
      },
    });
  }

  for (const goal of goalAnalytics.filter(
    (item) =>
      item.paceAssessment === "ABOVE_RECENT_SAVINGS_PACE" ||
      item.paceAssessment === "OVERDUE",
  )) {
    insights.push({
      type: "GOAL_PACE_ALERT",
      importance: "HIGH",
      fact: goal,
    });
  }

  if (recurringAnalytics.next30DaysCount > 0) {
    insights.push({
      type: "UPCOMING_RECURRING",
      importance: "LOW",
      fact: recurringAnalytics,
    });
  }

  return insights;
};

const buildDeterministicAnalytics = ({
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
  recurringItems,
}) => {
  const completedTrend = monthlyTrend.filter((item) => item.key !== currentMonth);
  const completedTrendWithActivity = completedTrend.filter(
    (item) => (Number(item.income) || 0) !== 0 || (Number(item.expense) || 0) !== 0,
  );
  const recentCompleted = completedTrendWithActivity.slice(-3);
  const recentAverageMonthlyIncome = average(
    recentCompleted.map((item) => item.income),
  );
  const recentAverageMonthlyExpense = average(
    recentCompleted.map((item) => item.expense),
  );
  const recentAverageMonthlySavings = average(
    recentCompleted.map((item) => item.netSavings),
  );

  const accountAnalytics = buildAccountAnalytics(accounts);
  const budgetAnalytics = buildBudgetAnalytics({
    budgets,
    categories: currentCategories,
    totalExpense: currentOverview.totalExpense,
    currentMonth,
    asOf,
  });
  const categoryComparison = buildCategoryComparison({
    currentCategories,
    previousCategories: comparableCategories,
  });
  const goalAnalytics = buildGoalAnalytics({
    goals,
    recentAverageMonthlySavings,
    recentSavingsMonthsUsed: recentCompleted.map((item) => item.key),
  });
  const recurringAnalytics = buildRecurringAnalytics({
    recurringItems,
    asOf,
  });

  const currentDays = Number(currentRange.daysIncluded) || 0;
  const previousDays = Number(comparableRange.daysIncluded) || 0;
  const sameDayComparison = {
    currentPeriod: {
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
      daysIncluded: currentDays,
    },
    previousPeriod: {
      startDate: comparableRange.startDate,
      endDate: comparableRange.endDate,
      daysIncluded: previousDays,
    },
    exactlySameNumberOfDays: currentDays === previousDays,
  };

  const cashFlow = {
    currentMonthToDate: {
      totalIncome: round2(currentOverview.totalIncome),
      totalExpense: round2(currentOverview.totalExpense),
      netSavings: round2(currentOverview.netSavings),
      savingsRate: round2(currentOverview.savingsRate),
      expenseToIncomePercent: percentOf(
        currentOverview.totalExpense,
        currentOverview.totalIncome,
      ),
      incomeTransactionCount: currentOverview.incomeTransactionCount,
      expenseTransactionCount: currentOverview.expenseTransactionCount,
      totalTransactionCount: currentOverview.totalTransactionCount,
    },
    previousComparablePeriod: {
      totalIncome: round2(comparableOverview.totalIncome),
      totalExpense: round2(comparableOverview.totalExpense),
      netSavings: round2(comparableOverview.netSavings),
      savingsRate: round2(comparableOverview.savingsRate),
      expenseToIncomePercent: percentOf(
        comparableOverview.totalExpense,
        comparableOverview.totalIncome,
      ),
      incomeTransactionCount: comparableOverview.incomeTransactionCount,
      expenseTransactionCount: comparableOverview.expenseTransactionCount,
      totalTransactionCount: comparableOverview.totalTransactionCount,
    },
    changesVsPreviousComparablePeriod: {
      income: compareValues(
        currentOverview.totalIncome,
        comparableOverview.totalIncome,
      ),
      expense: compareValues(
        currentOverview.totalExpense,
        comparableOverview.totalExpense,
      ),
      netSavings: compareValues(
        currentOverview.netSavings,
        comparableOverview.netSavings,
      ),
      savingsRatePercentagePoints: round2(
        currentOverview.savingsRate - comparableOverview.savingsRate,
      ),
    },
    recentCompletedMonthAverages: {
      monthsUsed: recentCompleted.map((item) => item.key),
      monthCount: recentCompleted.length,
      excludedEmptyCompletedMonths: completedTrend.length - completedTrendWithActivity.length,
      averageIncome: recentAverageMonthlyIncome,
      averageExpense: recentAverageMonthlyExpense,
      averageNetSavings: recentAverageMonthlySavings,
      note:
        "Only completed months with recorded income or expense activity are used for recent averages.",
    },
  };

  const deterministicAnalytics = {
    dataCoverage: {
      asOf,
      currentMonth,
      monthToDate: currentRange,
      previousComparablePeriod: comparableRange,
      comparisonNote:
        "Month-to-date comparisons use the same elapsed-day window in the previous month whenever possible, avoiding a partial-month versus full-month comparison.",
    },
    cashFlow,
    budgets: budgetAnalytics,
    categoryComparison,
    accounts: accountAnalytics,
    goals: goalAnalytics,
    recurring: recurringAnalytics,
  };

  deterministicAnalytics.insightCandidates = buildInsightCandidates({
    currentOverview,
    comparableOverview,
    budgetAnalytics,
    categoryComparison,
    accountAnalytics,
    goalAnalytics,
    recurringAnalytics,
    sameDayComparison,
  });

  return deterministicAnalytics;
};

export {
  buildAccountAnalytics,
  buildBudgetAnalytics,
  buildCategoryComparison,
  buildDeterministicAnalytics,
  buildGoalAnalytics,
  buildRecurringAnalytics,
  compareValues,
  getBudgetPaceRisk,
};
