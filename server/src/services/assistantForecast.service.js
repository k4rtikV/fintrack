import {
  buildQualityMetadata,
  clamp,
  combineConfidence,
  getEvidenceConfidence,
  safePercent,
  sanitizeFiniteNumbers,
} from "./assistantGuardrails.service.js";

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const average = (values) => {
  const numbers = values.map(Number).filter(Number.isFinite);

  if (!numbers.length) {
    return 0;
  }

  return round2(
    numbers.reduce((total, value) => total + value, 0) / numbers.length,
  );
};

const getMonthProgress = (asOf) => {
  const date = new Date(asOf);
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const daysInMonth = new Date(
    Date.UTC(year, monthIndex + 1, 0),
  ).getUTCDate();
  const daysElapsed = Math.min(
    Math.max(date.getUTCDate(), 1),
    daysInMonth,
  );

  return {
    daysElapsed,
    daysInMonth,
    daysRemaining: daysInMonth - daysElapsed,
    monthElapsedPercent: round2((daysElapsed / daysInMonth) * 100),
  };
};

const getForecastConfidence = ({
  historyMonthCount,
  currentTransactionCount,
  daysElapsed,
  highSeverityAnomalyCount = 0,
}) => {
  let confidence = getEvidenceConfidence({
    activeHistoryMonths: historyMonthCount,
    baselineTransactionCount: currentTransactionCount,
    daysElapsed,
  });

  if (highSeverityAnomalyCount > 0) {
    confidence = combineConfidence(confidence, "LOW");
  }

  return confidence;
};

const buildExpensePaceAdjustment = ({
  currentExpense,
  anomalySignals = [],
}) => {
  const byCategory = new Map();

  const addAdjustment = ({
    category,
    amount,
    type,
    severity,
  }) => {
    const numericAmount = Math.max(Number(amount) || 0, 0);

    if (numericAmount <= 0) {
      return;
    }

    const key = String(category || "Uncategorized");
    const existing = byCategory.get(key);

    // Use the larger category-level estimate instead of summing overlapping
    // anomaly signals such as a large transaction and a category spike.
    if (!existing || numericAmount > existing.amount) {
      byCategory.set(key, {
        category: key,
        amount: round2(numericAmount),
        type,
        severity,
      });
    }
  };

  for (const signal of anomalySignals || []) {
    if (signal.type === "LARGE_TRANSACTION") {
      addAdjustment({
        category: signal.category,
        amount: signal.amount,
        type: signal.type,
        severity: signal.severity,
      });
      continue;
    }

    if (
      signal.type === "CATEGORY_SPIKE" &&
      Number(signal.currentAmount) > 0
    ) {
      addAdjustment({
        category: signal.category,
        amount: Math.max(
          Number(signal.currentAmount) -
            (Number(signal.baselineAverage) || 0),
          0,
        ),
        type: signal.type,
        severity: signal.severity,
      });
      continue;
    }

    // New-category activity is excluded from extrapolation only when it is
    // high severity. Small new activity can still participate in the normal
    // month-to-date pace estimate.
    if (
      signal.type === "NEW_CATEGORY_ACTIVITY" &&
      signal.severity === "HIGH"
    ) {
      addAdjustment({
        category: signal.category,
        amount: signal.currentAmount,
        type: signal.type,
        severity: signal.severity,
      });
    }
  }

  const rawExcluded = [...byCategory.values()].reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const excludedFromPace = round2(
    Math.min(
      Math.max(rawExcluded, 0),
      Math.max(Number(currentExpense) || 0, 0),
    ),
  );
  const includedInPace = round2(
    Math.max(
      (Number(currentExpense) || 0) - excludedFromPace,
      0,
    ),
  );

  return {
    excludedFromPace,
    includedInPace,
    excludedSharePercent:
      Number(currentExpense) > 0
        ? round2(
            (excludedFromPace / Number(currentExpense)) * 100,
          )
        : 0,
    categories: [...byCategory.values()],
  };
};

const buildRange = (value, confidence, minimum = 0) => {
  const spreadByConfidence = {
    HIGH: 0.1,
    MEDIUM: 0.2,
    LOW: 0.35,
    NONE: 0.5,
  };
  const spread = spreadByConfidence[confidence] ?? 0.5;

  return {
    low: round2(
      Math.max(Number(value) * (1 - spread), Number(minimum) || 0),
    ),
    high: round2(
      Math.max(Number(value) * (1 + spread), Number(minimum) || 0),
    ),
  };
};

const buildMonthlyForecast = ({
  asOf,
  currentOverview,
  monthlyTrend,
  recurringDueBeforeMonthEnd = [],
  currentTransactionCount = 0,
  highSeverityAnomalyCount = 0,
  anomalySignals = [],
  currencySafety,
}) => {
  if (!currencySafety.supported) {
    return {
      supported: false,
      note: currencySafety.note,
      quality: buildQualityMetadata({
        currencySafety,
        warnings: [currencySafety.note],
      }),
    };
  }

  const monthProgress = getMonthProgress(asOf);
  const currentMonthKey = new Date(asOf).toISOString().slice(0, 7);
  const activeCompleted = (monthlyTrend || [])
    .filter(
      (item) =>
        (item.key || item.month) !== currentMonthKey &&
        ((Number(item.income) || 0) !== 0 ||
          (Number(item.expense) || 0) !== 0),
    )
    .slice(-3);

  const historicalAverageIncome = average(
    activeCompleted.map((item) => item.income),
  );
  const historicalAverageExpense = average(
    activeCompleted.map((item) => item.expense),
  );
  const hasHistoricalIncome = activeCompleted.some(
    (item) => (Number(item.income) || 0) > 0,
  );
  const hasHistoricalExpense = activeCompleted.some(
    (item) => (Number(item.expense) || 0) > 0,
  );

  const currentIncome = round2(currentOverview.totalIncome);
  const currentExpense = round2(currentOverview.totalExpense);
  const remainingFraction =
    monthProgress.daysInMonth > 0
      ? monthProgress.daysRemaining / monthProgress.daysInMonth
      : 0;

  const expensePaceAdjustment =
    buildExpensePaceAdjustment({
      currentExpense,
      anomalySignals,
    });

  const currentRoutineExpense =
    expensePaceAdjustment.includedInPace;

  const linearIncomeRemaining =
    monthProgress.daysElapsed > 0
      ? round2(
          (currentIncome / monthProgress.daysElapsed) *
            monthProgress.daysRemaining,
        )
      : 0;
  const historicalIncomeRemaining =
    hasHistoricalIncome
      ? round2(
          historicalAverageIncome * remainingFraction,
        )
      : 0;

  const linearRoutineExpenseRemaining =
    monthProgress.daysElapsed > 0
      ? round2(
          (currentRoutineExpense / monthProgress.daysElapsed) *
            monthProgress.daysRemaining,
        )
      : 0;
  const historicalExpenseRemaining =
    hasHistoricalExpense
      ? round2(
          historicalAverageExpense * remainingFraction,
        )
      : 0;

  // Income is conservative when any completed income baseline exists:
  // already-recorded income is kept, and only the historical remaining-month
  // share is added. This avoids blindly repeating a large one-off income.
  const estimatedIncomeRemaining =
    hasHistoricalIncome
      ? historicalIncomeRemaining
      : linearIncomeRemaining;

  // Expense forecasting is anomaly-aware. Already-incurred anomalous spend is
  // always included once, but excluded from the current daily pace. The
  // remaining routine pace is blended with historical remaining-month spend
  // when a genuine expense baseline exists.
  const routinePaceWeight =
    hasHistoricalExpense
      ? clamp(
          monthProgress.daysElapsed / monthProgress.daysInMonth,
          0.25,
          0.75,
        )
      : 1;
  const estimatedRoutineExpenseRemaining =
    hasHistoricalExpense
      ? round2(
          routinePaceWeight * linearRoutineExpenseRemaining +
            (1 - routinePaceWeight) *
              historicalExpenseRemaining,
        )
      : linearRoutineExpenseRemaining;

  let scheduledIncomeRemaining = 0;
  let scheduledExpenseRemaining = 0;

  for (const item of recurringDueBeforeMonthEnd || []) {
    if (item.type === "INCOME") {
      scheduledIncomeRemaining += Number(item.amount) || 0;
    } else if (item.type === "EXPENSE") {
      scheduledExpenseRemaining += Number(item.amount) || 0;
    }
  }

  scheduledIncomeRemaining = round2(scheduledIncomeRemaining);
  scheduledExpenseRemaining = round2(scheduledExpenseRemaining);

  const projectedIncome = round2(
    currentIncome +
      Math.max(
        estimatedIncomeRemaining,
        scheduledIncomeRemaining,
      ),
  );
  const projectedExpense = round2(
    currentExpense +
      Math.max(
        estimatedRoutineExpenseRemaining,
        scheduledExpenseRemaining,
      ),
  );
  const projectedNetSavings = round2(
    projectedIncome - projectedExpense,
  );
  const projectedSavingsRate =
    projectedIncome > 0
      ? round2((projectedNetSavings / projectedIncome) * 100)
      : null;

  const confidence = getForecastConfidence({
    historyMonthCount: activeCompleted.length,
    currentTransactionCount,
    daysElapsed: monthProgress.daysElapsed,
    highSeverityAnomalyCount,
  });

  return sanitizeFiniteNumbers({
    supported: true,
    asOf,
    monthProgress,
    historicalBaseline: {
      monthsUsed: activeCompleted.map((item) => item.key || item.month),
      monthCount: activeCompleted.length,
      incomeMonthCount: activeCompleted.filter(
        (item) => (Number(item.income) || 0) > 0,
      ).length,
      expenseMonthCount: activeCompleted.filter(
        (item) => (Number(item.expense) || 0) > 0,
      ).length,
      averageIncome: historicalAverageIncome,
      averageExpense: historicalAverageExpense,
    },
    currentMonthToDate: {
      income: currentIncome,
      expense: currentExpense,
      netSavings: round2(
        currentIncome - currentExpense,
      ),
      transactionCount: currentTransactionCount,
    },
    scheduledRemainingThisMonth: {
      income: scheduledIncomeRemaining,
      expense: scheduledExpenseRemaining,
      itemCount: recurringDueBeforeMonthEnd.length,
    },
    expensePaceAdjustment: {
      ...expensePaceAdjustment,
      routinePaceWeightPercent: round2(
        routinePaceWeight * 100,
      ),
      estimatedRoutineExpenseRemaining,
      historicalExpenseRemaining,
      linearRoutineExpenseRemaining,
    },
    remainingMonthEstimate: {
      income: round2(
        Math.max(
          estimatedIncomeRemaining,
          scheduledIncomeRemaining,
        ),
      ),
      expense: round2(
        Math.max(
          estimatedRoutineExpenseRemaining,
          scheduledExpenseRemaining,
        ),
      ),
      incomeBasis: hasHistoricalIncome
        ? "RECENT_COMPLETED_INCOME_BASELINE"
        : "CURRENT_MONTH_INCOME_PACE",
      expenseBasis: hasHistoricalExpense
        ? "ANOMALY_ADJUSTED_ROUTINE_PACE_BLENDED_WITH_RECENT_EXPENSE_HISTORY"
        : "ANOMALY_ADJUSTED_CURRENT_ROUTINE_PACE",
    },
    forecast: {
      income: projectedIncome,
      expense: projectedExpense,
      netSavings: projectedNetSavings,
      savingsRate: projectedSavingsRate,
      incomeRange: buildRange(
        projectedIncome,
        confidence,
        currentIncome,
      ),
      expenseRange: buildRange(
        projectedExpense,
        confidence,
        currentExpense,
      ),
      netSavingsRange: {
        low: round2(
          buildRange(
            projectedIncome,
            confidence,
            currentIncome,
          ).low -
            buildRange(
              projectedExpense,
              confidence,
              currentExpense,
            ).high,
        ),
        high: round2(
          buildRange(
            projectedIncome,
            confidence,
            currentIncome,
          ).high -
            buildRange(
              projectedExpense,
              confidence,
              currentExpense,
            ).low,
        ),
      },
      confidence,
      method:
        expensePaceAdjustment.excludedFromPace > 0
          ? "ANOMALY_ADJUSTED_REMAINING_MONTH_FORECAST_WITH_RECURRING_FLOOR"
          : "REMAINING_MONTH_HISTORY_OR_PACE_WITH_RECURRING_FLOOR",
      anomalyAdjusted:
        expensePaceAdjustment.excludedFromPace > 0,
      excludedExpenseFromPace:
        expensePaceAdjustment.excludedFromPace,
    },
    quality: buildQualityMetadata({
      currencySafety,
      evidenceConfidence: confidence,
      historicalMonthsUsed: activeCompleted.map(
        (item) => item.key || item.month,
      ),
      baselineTransactionCount: currentTransactionCount,
      warnings: [
        highSeverityAnomalyCount > 0
          ? "A high-severity anomaly is present in the current period, so the forecast is intentionally low confidence."
          : null,
        expensePaceAdjustment.excludedFromPace > 0
          ? `${expensePaceAdjustment.excludedFromPace} of already-recorded current expenses is included once but excluded from daily pace extrapolation because it is out-of-pattern relative to available history.`
          : null,
        !hasHistoricalExpense
          ? "No completed positive-expense month is available for an expense baseline; only non-anomalous current spending is pace-projected."
          : null,
      ],
    }),
    caveats: [
      "Forecasts are directional planning estimates, not guaranteed outcomes.",
      "One-off purchases are included as already-incurred expenses but are not automatically repeated in the remaining-days spending pace when FinTrack flags them as anomalous or high-severity new activity.",
      "Irregular income, missing transactions, and future behavior changes can materially alter the result.",
      "Known recurring items due before month-end are used only as a minimum floor; FinTrack does not assume unrecorded future transactions.",
    ],
  });
};

const buildGoalCompletionForecast = ({
  asOf,
  goals = [],
  recentAverageMonthlySavings = 0,
  evidenceConfidence = "NONE",
}) => {
  const now = new Date(asOf);

  return goals.map((goal) => {
    const remaining = Math.max(
      Number(goal.remainingAmount) || 0,
      0,
    );

    if (remaining <= 0) {
      return {
        name: goal.name,
        status: "COMPLETED",
        projectedCompletionDate: goal.targetDate,
        monthsToTargetAtRecentPace: 0,
        onTrackForTargetDate: true,
        confidence: evidenceConfidence,
      };
    }

    if (recentAverageMonthlySavings <= 0) {
      return {
        name: goal.name,
        status: "NO_POSITIVE_SAVINGS_BASELINE",
        projectedCompletionDate: null,
        monthsToTargetAtRecentPace: null,
        onTrackForTargetDate: null,
        confidence: evidenceConfidence,
      };
    }

    const monthsToTarget = round2(
      remaining / recentAverageMonthlySavings,
    );
    const projectedDate = new Date(now);
    projectedDate.setUTCDate(
      projectedDate.getUTCDate() +
        Math.ceil(monthsToTarget * 30.4375),
    );
    const targetDate = new Date(goal.targetDate);

    return {
      name: goal.name,
      status: "FORECAST_AVAILABLE",
      projectedCompletionDate:
        projectedDate.toISOString(),
      monthsToTargetAtRecentPace: monthsToTarget,
      onTrackForTargetDate:
        Number.isFinite(targetDate.getTime())
          ? projectedDate <= targetDate
          : null,
      requiredMonthlyContribution:
        goal.requiredMonthlyContribution,
      recentAverageMonthlySavings: round2(
        recentAverageMonthlySavings,
      ),
      confidence: evidenceConfidence,
      caveat:
        "This goal forecast assumes the recent average savings pace continues and does not allocate savings across competing goals.",
    };
  });
};

export {
  buildGoalCompletionForecast,
  buildMonthlyForecast,
  getMonthProgress,
};
