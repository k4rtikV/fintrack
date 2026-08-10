import {
  assertPercentage,
  assertPositiveAmount,
  safePercent,
  sanitizeFiniteNumbers,
} from "./assistantGuardrails.service.js";

const SCENARIOS = [
  "ADD_EXPENSE",
  "ADD_INCOME",
  "REDUCE_CATEGORY_SPENDING",
  "REDUCE_FUTURE_CATEGORY_SPENDING",
  "REDUCE_RECORDED_CATEGORY_SPENDING",
];

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const buildSavingsRate = (income, expense) => {
  const numericIncome = Number(income) || 0;
  const numericExpense = Number(expense) || 0;

  if (numericIncome <= 0) {
    return null;
  }

  return round2(
    ((numericIncome - numericExpense) / numericIncome) * 100,
  );
};

const findBudgetItem = (budgetAnalytics, category) => {
  if (!category) {
    return null;
  }

  const normalized = category.toLowerCase();

  return (
    (budgetAnalytics?.items || []).find((item) =>
      String(item.category || "")
        .toLowerCase()
        .includes(normalized),
    ) || null
  );
};

const findCategory = (categories, category) => {
  if (!category) {
    return null;
  }

  const normalized = category.toLowerCase();

  return (
    (categories || []).find((item) =>
      String(item.category || item.name || "")
        .toLowerCase()
        .includes(normalized),
    ) || null
  );
};

const buildBudgetImpact = ({
  scenario,
  amount,
  category,
  budgetAnalytics,
}) => {
  if (!category || !budgetAnalytics) {
    return {
      category: category || null,
      matchedBudget: false,
      note:
        "No category budget was matched, so FinTrack cannot calculate a category-budget impact for this scenario.",
    };
  }

  const budget = findBudgetItem(
    budgetAnalytics,
    category,
  );

  if (!budget) {
    return {
      category,
      matchedBudget: false,
      note:
        "The category has no matching budget in the current month.",
    };
  }

  const spentBefore = Number(budget.spent) || 0;
  const budgetAmount = Number(budget.budget) || 0;
  const spentAfter =
    scenario === "REDUCE_CATEGORY_SPENDING"
      ? Math.max(spentBefore - amount, 0)
      : scenario === "ADD_EXPENSE"
        ? spentBefore + amount
        : spentBefore;
  const remainingAfter = round2(
    budgetAmount - spentAfter,
  );
  const percentageUsedAfter =
    budgetAmount > 0
      ? round2((spentAfter / budgetAmount) * 100)
      : null;

  return {
    category: budget.category,
    matchedBudget: true,
    budget: round2(budgetAmount),
    spentBefore: round2(spentBefore),
    spentAfter: round2(spentAfter),
    remainingAfter,
    percentageUsedBefore: round2(
      budget.percentageUsed,
    ),
    percentageUsedAfter,
    overBudgetAfter:
      percentageUsedAfter !== null &&
      percentageUsedAfter > 100,
    note:
      "Budget impact is hypothetical only; FinTrack has not changed the saved budget or transactions.",
  };
};

const simulateFinancialScenario = ({
  scenario,
  amount,
  category,
  reductionPercent,
  currentOverview,
  currentCategories,
  budgetAnalytics,
  monthlyForecast,
  currencySafety,
  preferredCurrency = "INR",
}) => {
  if (!SCENARIOS.includes(scenario)) {
    return {
      supported: false,
      error: `Unsupported scenario: ${scenario}`,
    };
  }

  if (!currencySafety.supported) {
    return {
      supported: false,
      error: currencySafety.note,
      currencySafety,
    };
  }

  const before = {
    income: round2(currentOverview.totalIncome),
    expense: round2(currentOverview.totalExpense),
  };
  before.netSavings = round2(
    before.income - before.expense,
  );
  before.savingsRate = buildSavingsRate(
    before.income,
    before.expense,
  );

  let incomeDelta = 0;
  let expenseDelta = 0;
  let appliedAmount = 0;
  let matchedCategory = null;
  const assumptions = [];

  if (scenario === "ADD_EXPENSE") {
    appliedAmount = assertPositiveAmount(amount);
    expenseDelta = appliedAmount;
    assumptions.push(
      "The additional expense is treated as a one-time expense in the current month.",
    );
  }

  if (scenario === "ADD_INCOME") {
    appliedAmount = assertPositiveAmount(amount);
    incomeDelta = appliedAmount;
    assumptions.push(
      "The additional income is treated as a one-time income transaction in the current month.",
    );
  }

  const isFutureReduction =
    scenario === "REDUCE_CATEGORY_SPENDING" ||
    scenario === "REDUCE_FUTURE_CATEGORY_SPENDING";

  if (
    isFutureReduction ||
    scenario === "REDUCE_RECORDED_CATEGORY_SPENDING"
  ) {
    const percentage = assertPercentage(
      reductionPercent,
      "reductionPercent",
    );
    matchedCategory = findCategory(
      currentCategories,
      category,
    );

    if (!matchedCategory) {
      return {
        supported: false,
        error:
          "The requested category has no current-period spending to anchor this simulation.",
      };
    }

    const categorySpend =
      Number(
        matchedCategory.amount ??
          matchedCategory.currentAmount,
      ) || 0;

    if (isFutureReduction) {
      const daysElapsed = Math.max(
        Number(monthlyForecast?.monthProgress?.daysElapsed) || 1,
        1,
      );
      const daysRemaining = Math.max(
        Number(monthlyForecast?.monthProgress?.daysRemaining) || 0,
        0,
      );
      const anomalyAdjustment =
        monthlyForecast?.expensePaceAdjustment?.categories?.find(
          (item) =>
            String(item.category || "").toLowerCase() ===
            String(category || "").toLowerCase(),
        );
      const anomalyExcluded = Math.min(
        Number(anomalyAdjustment?.amount) || 0,
        categorySpend,
      );
      const routineSpendSoFar = Math.max(
        categorySpend - anomalyExcluded,
        0,
      );
      const estimatedFutureCategorySpend = round2(
        (routineSpendSoFar / daysElapsed) * daysRemaining,
      );

      appliedAmount = round2(
        estimatedFutureCategorySpend * (percentage / 100),
      );
      expenseDelta = 0;
      assumptions.push(
        `The ${percentage}% reduction applies only to estimated future ${category} spending for the remaining days of the current month; already-recorded transactions are unchanged.`,
      );
    } else {
      appliedAmount = round2(
        categorySpend * (percentage / 100),
      );
      expenseDelta = -appliedAmount;
      assumptions.push(
        `This retrospective hypothetical asks what the current month would look like if recorded ${category} spending had been ${percentage}% lower. No saved transaction is edited.`,
      );
    }
  }

  const after = {
    income: round2(
      before.income + incomeDelta,
    ),
    expense: round2(
      Math.max(before.expense + expenseDelta, 0),
    ),
  };
  after.netSavings = round2(
    after.income - after.expense,
  );
  after.savingsRate = buildSavingsRate(
    after.income,
    after.expense,
  );

  const baselineForecast =
    monthlyForecast?.forecast || null;
  const forecastExpenseDelta =
    isFutureReduction ? -appliedAmount : expenseDelta;
  const forecastAfter = baselineForecast
    ? {
        income: round2(
          Number(baselineForecast.income || 0) +
            incomeDelta,
        ),
        expense: round2(
          Math.max(
            Number(baselineForecast.expense || 0) +
              forecastExpenseDelta,
            0,
          ),
        ),
      }
    : null;

  if (forecastAfter) {
    forecastAfter.netSavings = round2(
      forecastAfter.income -
        forecastAfter.expense,
    );
    forecastAfter.savingsRate =
      buildSavingsRate(
        forecastAfter.income,
        forecastAfter.expense,
      );
  }

  const budgetImpact = isFutureReduction
    ? {
        category: category || null,
        matchedBudget: Boolean(
          findBudgetItem(budgetAnalytics, category),
        ),
        currentRecordedSpendUnchanged: true,
        estimatedFutureSavings: appliedAmount,
        note:
          "For a future-spending reduction, already-recorded budget usage is unchanged. The estimated savings apply only to the remaining-month projection.",
      }
    : buildBudgetImpact({
        scenario,
        amount: appliedAmount,
        category,
        budgetAnalytics,
      });

  const savingsRateChange =
    before.savingsRate !== null &&
    after.savingsRate !== null
      ? round2(
          after.savingsRate - before.savingsRate,
        )
      : null;

  let assessment = "NEUTRAL";

  if (
    after.netSavings < 0 ||
    budgetImpact.overBudgetAfter
  ) {
    assessment = "HIGH_IMPACT";
  } else if (
    savingsRateChange !== null &&
    savingsRateChange <= -10
  ) {
    assessment = "NOTICEABLE_IMPACT";
  } else if (
    (isFutureReduction ||
      scenario === "REDUCE_RECORDED_CATEGORY_SPENDING") &&
    appliedAmount > 0
  ) {
    assessment = "POSITIVE_IMPACT";
  }

  return sanitizeFiniteNumbers({
    supported: true,
    scenario,
    preferredCurrency,
    inputs: {
      requestedAmount:
        isFutureReduction ||
        scenario === "REDUCE_RECORDED_CATEGORY_SPENDING"
          ? null
          : appliedAmount,
      category: category || null,
      reductionPercent:
        isFutureReduction ||
        scenario === "REDUCE_RECORDED_CATEGORY_SPENDING"
          ? Number(reductionPercent)
          : null,
      reductionAppliesTo:
        isFutureReduction
          ? "FUTURE_REMAINING_MONTH_SPENDING"
          : scenario === "REDUCE_RECORDED_CATEGORY_SPENDING"
            ? "RECORDED_CURRENT_MONTH_SPENDING"
            : null,
      calculatedScenarioAmount: appliedAmount,
    },
    currentMonth: {
      before,
      after,
      changes: {
        income: round2(incomeDelta),
        expense: round2(expenseDelta),
        netSavings: round2(
          after.netSavings - before.netSavings,
        ),
        savingsRatePercentagePoints:
          savingsRateChange,
      },
    },
    monthEndForecast:
      baselineForecast && forecastAfter
        ? {
            before: {
              income: baselineForecast.income,
              expense: baselineForecast.expense,
              netSavings:
                baselineForecast.netSavings,
              savingsRate:
                baselineForecast.savingsRate,
            },
            after: forecastAfter,
            forecastConfidence:
              baselineForecast.confidence ||
              monthlyForecast.forecast?.confidence ||
              "NONE",
          }
        : null,
    budgetImpact,
    assessment,
    assumptions,
    warnings: [
      "This is a hypothetical read-only simulation. No FinTrack record, balance, budget, goal, or transaction has been changed.",
      "The scenario assumes other recorded data stays unchanged.",
      monthlyForecast?.caveats?.[0] ||
        "Any month-end forecast remains a directional estimate.",
    ],
    evidence: {
      currentExpenseShare:
        appliedAmount > 0
          ? safePercent(
              appliedAmount,
              before.expense,
            )
          : null,
      forecastConfidence:
        monthlyForecast?.forecast?.confidence ||
        "NONE",
    },
  });
};

export {
  SCENARIOS,
  simulateFinancialScenario,
};
