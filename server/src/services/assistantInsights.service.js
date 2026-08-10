import {
  buildQualityMetadata,
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

const median = (values) => {
  const numbers = values
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!numbers.length) {
    return 0;
  }

  const middle = Math.floor(numbers.length / 2);

  return numbers.length % 2
    ? numbers[middle]
    : round2((numbers[middle - 1] + numbers[middle]) / 2);
};

const medianAbsoluteDeviation = (values, center) =>
  median(values.map((value) => Math.abs(Number(value) - Number(center))));

const normalizeTitle = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/[^a-z#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getDaysBetween = (a, b) =>
  Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) /
      (24 * 60 * 60 * 1000),
  );

const buildCategoryHistory = (historicalCategoryWindows) => {
  const byCategory = new Map();

  for (const window of historicalCategoryWindows || []) {
    for (const category of window.categories || []) {
      const key = category.category;

      if (!byCategory.has(key)) {
        byCategory.set(key, []);
      }

      byCategory.get(key).push({
        period: window.period,
        amount: Number(category.amount) || 0,
        transactionCount: Number(category.transactionCount) || 0,
      });
    }
  }

  return byCategory;
};

const detectLargeTransactions = ({
  currentTransactions,
  baselineTransactions,
}) => {
  const expenseBaseline = (baselineTransactions || []).filter(
    (item) =>
      item.type === "EXPENSE" &&
      !item.isLinkedRecurring &&
      Number(item.amount) > 0,
  );
  const globalAmounts = expenseBaseline.map(
    (item) => Number(item.amount) || 0,
  );

  if (globalAmounts.length < 5) {
    return [];
  }

  const getStats = (amounts) => {
    const baselineMedian = median(amounts);
    const mad = medianAbsoluteDeviation(
      amounts,
      baselineMedian,
    );
    const fallbackThreshold = baselineMedian * 2.5;
    const robustThreshold =
      mad > 0
        ? baselineMedian + 3.5 * mad
        : fallbackThreshold;

    return {
      baselineMedian,
      mad,
      threshold: Math.max(
        fallbackThreshold,
        robustThreshold,
      ),
    };
  };

  const globalStats = getStats(globalAmounts);

  return (currentTransactions || [])
    .filter(
      (transaction) =>
        transaction.type === "EXPENSE" &&
        !transaction.isLinkedRecurring,
    )
    .map((transaction) => {
      const categoryAmounts = expenseBaseline
        .filter(
          (item) =>
            String(item.category || "").toLowerCase() ===
            String(transaction.category || "").toLowerCase(),
        )
        .map((item) => Number(item.amount) || 0);
      const useCategoryBaseline =
        categoryAmounts.length >= 5;
      const stats = useCategoryBaseline
        ? getStats(categoryAmounts)
        : globalStats;
      const amount = Number(transaction.amount) || 0;
      const robustScore =
        stats.mad > 0
          ? round2(
              (0.6745 *
                (amount - stats.baselineMedian)) /
                stats.mad,
            )
          : null;

      return {
        transaction,
        amount,
        robustScore,
        ...stats,
        baselineScope: useCategoryBaseline
          ? "CATEGORY"
          : "GLOBAL_EXPENSE",
      };
    })
    .filter(
      (item) =>
        item.amount >= item.threshold &&
        (item.robustScore === null ||
          item.robustScore >= 3),
    )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((item) => ({
      type: "LARGE_TRANSACTION",
      severity:
        item.amount >=
        Math.max(
          item.threshold * 1.75,
          item.baselineMedian * 5,
        )
          ? "HIGH"
          : "MEDIUM",
      title: item.transaction.title,
      category: item.transaction.category,
      amount: round2(item.amount),
      date: item.transaction.date,
      baselineMedian: round2(item.baselineMedian),
      baselineMad: round2(item.mad),
      baselineScope: item.baselineScope,
      robustScore: item.robustScore,
      explanation:
        item.baselineScope === "CATEGORY"
          ? "This expense is materially larger than recent non-recurring expenses in the same category. It is an outlier signal, not evidence of fraud."
          : "This expense is materially larger than the recent non-recurring expense baseline. A category-specific baseline was unavailable, so FinTrack used the global expense baseline.",
    }));
};

const detectCategorySpikes = ({
  currentCategories,
  historicalCategoryWindows,
}) => {
  const categoryHistory = buildCategoryHistory(historicalCategoryWindows);
  const currentTotal = currentCategories.reduce(
    (total, item) => total + (Number(item.amount) || 0),
    0,
  );

  return currentCategories
    .map((category) => {
      const history = (historicalCategoryWindows || []).map(
        (window) => {
          const row = (window.categories || []).find(
            (item) =>
              item.category === category.category,
          );

          return {
            period: window.period,
            amount: Number(row?.amount) || 0,
            transactionCount:
              Number(row?.transactionCount) || 0,
          };
        },
      );
      const historyAmounts = history.map((item) => item.amount);
      const activeHistory = historyAmounts.filter((amount) => amount > 0);
      const baselineAverage = average(historyAmounts);
      const currentAmount = Number(category.amount) || 0;
      const absoluteChange = round2(currentAmount - baselineAverage);
      const percentChange =
        baselineAverage > 0
          ? round2((absoluteChange / baselineAverage) * 100)
          : null;
      const expenseSharePercent =
        safePercent(currentAmount, currentTotal) || 0;

      return {
        category: category.category,
        currentAmount: round2(currentAmount),
        baselineAverage,
        baselinePeriodsWithActivity: activeHistory.length,
        historicalPeriodsAvailable: history.length,
        absoluteChange,
        percentChange,
        expenseSharePercent,
        transactionCount: category.transactionCount || 0,
      };
    })
    .filter((item) => {
      if (item.baselineAverage <= 0) {
        return (
          item.currentAmount > 0 &&
          (item.expenseSharePercent >= 10 || item.transactionCount >= 2)
        );
      }

      return (
        item.currentAmount >= item.baselineAverage * 1.5 &&
        item.absoluteChange > 0 &&
        (item.expenseSharePercent >= 5 || item.transactionCount >= 2)
      );
    })
    .sort((a, b) => b.absoluteChange - a.absoluteChange)
    .slice(0, 5)
    .map((item) => ({
      type:
        item.baselineAverage > 0
          ? "CATEGORY_SPIKE"
          : "NEW_CATEGORY_ACTIVITY",
      severity:
        item.expenseSharePercent >= 35 ||
        (item.percentChange !== null && item.percentChange >= 150)
          ? "HIGH"
          : "MEDIUM",
      ...item,
      explanation:
        item.baselineAverage > 0
          ? "Current comparable-period spending is materially above the category's recent comparable-period average."
          : "The category has current spending but no positive comparable-period baseline in the available history. This is new activity, not a percentage spike.",
    }));
};

const detectConcentration = ({ currentCategories }) => {
  const total = currentCategories.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  if (total <= 0) {
    return [];
  }

  const sorted = [...currentCategories].sort(
    (a, b) => Number(b.amount) - Number(a.amount),
  );
  const top = sorted[0];
  const topShare = safePercent(top?.amount, total) || 0;
  const topTwoShare =
    safePercent(
      sorted
        .slice(0, 2)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
      total,
    ) || 0;

  if (topShare < 50 && topTwoShare < 80) {
    return [];
  }

  return [
    {
      type: "SPENDING_CONCENTRATION",
      severity: topShare >= 75 ? "HIGH" : "MEDIUM",
      category: top?.category || "Unknown",
      topCategorySharePercent: round2(topShare),
      topTwoCategoriesSharePercent: round2(topTwoShare),
      explanation:
        "A large share of current-period expenses is concentrated in one or two categories. Concentration can be intentional, so this is a pattern signal rather than a problem by itself.",
    },
  ];
};

const detectPossibleRecurringPatterns = ({ transactions }) => {
  const groups = new Map();

  for (const transaction of transactions || []) {
    if (
      transaction.type !== "EXPENSE" ||
      transaction.isLinkedRecurring ||
      !transaction.title
    ) {
      continue;
    }

    const normalized = normalizeTitle(transaction.title);

    if (!normalized) {
      continue;
    }

    const amountBucket = Math.round((Number(transaction.amount) || 0) / 10) * 10;
    const key = `${normalized}|${transaction.category}|${amountBucket}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(transaction);
  }

  const patterns = [];

  for (const items of groups.values()) {
    if (items.length < 3) {
      continue;
    }

    const sorted = [...items].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
    const intervals = [];

    for (let index = 1; index < sorted.length; index += 1) {
      intervals.push(
        getDaysBetween(sorted[index].date, sorted[index - 1].date),
      );
    }

    const medianInterval = median(intervals);
    const avgAmount = average(
      sorted.map((item) => Number(item.amount) || 0),
    );
    const amountDeviation =
      avgAmount > 0
        ? average(
            sorted.map(
              (item) =>
                (Math.abs(Number(item.amount) - avgAmount) / avgAmount) * 100,
            ),
          )
        : 0;

    const intervalMad =
      medianAbsoluteDeviation(
        intervals,
        medianInterval,
      );
    const maxAllowedIntervalMad = Math.max(
      2,
      medianInterval * 0.2,
    );
    const looksPeriodic =
      medianInterval >= 5 &&
      medianInterval <= 45 &&
      amountDeviation <= 15 &&
      intervalMad <= maxAllowedIntervalMad;

    if (!looksPeriodic) {
      continue;
    }

    patterns.push({
      type: "POSSIBLE_RECURRING_PATTERN",
      severity: "LOW",
      title: sorted.at(-1).title,
      category: sorted.at(-1).category,
      occurrences: sorted.length,
      averageAmount: avgAmount,
      medianIntervalDays: round2(medianInterval),
      intervalMadDays: round2(intervalMad),
      averageAmountDeviationPercent: round2(amountDeviation),
      explanation:
        "A similar unlinked transaction has appeared repeatedly at a roughly regular interval and amount. FinTrack is only flagging a possible recurring pattern; it has not created a recurring transaction.",
    });
  }

  return patterns
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 5);
};

const buildTrendPatterns = ({
  monthlyTrend,
  asOf,
}) => {
  const currentMonthKey = new Date(asOf)
    .toISOString()
    .slice(0, 7);
  const active = (monthlyTrend || []).filter(
    (item) =>
      (item.key || item.month) !== currentMonthKey &&
      ((Number(item.income) || 0) !== 0 ||
        (Number(item.expense) || 0) !== 0),
  );

  if (active.length < 3) {
    return [];
  }

  const recent = active.slice(-3);
  const expenseValues = recent.map((item) => Number(item.expense) || 0);
  const savingsValues = recent.map((item) => Number(item.netSavings) || 0);
  const expenseIncreasing =
    expenseValues[0] < expenseValues[1] &&
    expenseValues[1] < expenseValues[2];
  const savingsDeclining =
    savingsValues[0] > savingsValues[1] &&
    savingsValues[1] > savingsValues[2];

  const patterns = [];

  if (expenseIncreasing) {
    patterns.push({
      type: "THREE_MONTH_EXPENSE_UPTREND",
      severity: "MEDIUM",
      months: recent.map((item) => item.key || item.month),
      values: expenseValues.map(round2),
      explanation:
        "Recorded expenses increased in each of the last three active monthly observations.",
    });
  }

  if (savingsDeclining) {
    patterns.push({
      type: "THREE_MONTH_SAVINGS_DOWNTREND",
      severity: "MEDIUM",
      months: recent.map((item) => item.key || item.month),
      values: savingsValues.map(round2),
      explanation:
        "Recorded net savings declined in each of the last three active monthly observations.",
    });
  }

  return patterns;
};

const buildSpendingInsights = ({
  asOf,
  currentRange,
  historicalRanges,
  currentCategories,
  historicalCategoryWindows,
  currentTransactions,
  baselineTransactions,
  patternTransactions,
  monthlyTrend,
  currencySafety,
}) => {
  if (!currencySafety.supported) {
    return {
      supported: false,
      dataCoverage: {
        asOf,
        currentRange,
        historicalRanges,
      },
      anomalies: [],
      patterns: [],
      topSignals: [],
      quality: buildQualityMetadata({
        currencySafety,
        warnings: [currencySafety.note],
      }),
      note: currencySafety.note,
    };
  }

  const activeHistoricalMonths = historicalCategoryWindows.filter((window) =>
    (window.categories || []).some((category) => Number(category.amount) > 0),
  );
  const evidenceConfidence = getEvidenceConfidence({
    activeHistoryMonths: activeHistoricalMonths.length,
    baselineTransactionCount: baselineTransactions.length,
    daysElapsed: currentRange.daysIncluded,
  });

  const anomalies = [
    ...detectLargeTransactions({
      currentTransactions,
      baselineTransactions,
    }),
    ...detectCategorySpikes({
      currentCategories,
      historicalCategoryWindows,
    }),
  ];

  const patterns = [
    ...detectConcentration({
      currentCategories,
    }),
    ...detectPossibleRecurringPatterns({
      transactions: patternTransactions,
    }),
    ...buildTrendPatterns({
      monthlyTrend,
      asOf,
    }),
  ];

  const severityRank = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const topSignals = [...anomalies, ...patterns]
    .sort(
      (a, b) =>
        (severityRank[b.severity] || 0) -
        (severityRank[a.severity] || 0),
    )
    .slice(0, 8);

  return sanitizeFiniteNumbers({
    supported: true,
    dataCoverage: {
      asOf,
      currentRange,
      historicalRanges,
    },
    evidence: {
      activeHistoricalMonths: activeHistoricalMonths.map(
        (item) => item.period,
      ),
      baselineTransactionCount: baselineTransactions.length,
      currentTransactionCount: currentTransactions.length,
      confidence: evidenceConfidence,
    },
    anomalies,
    patterns,
    topSignals,
    quality: buildQualityMetadata({
      currencySafety,
      evidenceConfidence,
      historicalMonthsUsed: activeHistoricalMonths.map(
        (item) => item.period,
      ),
      baselineTransactionCount: baselineTransactions.length,
      warnings:
        evidenceConfidence === "LOW" || evidenceConfidence === "NONE"
          ? [
              "Pattern and anomaly detection has limited historical evidence; treat weak signals cautiously.",
            ]
          : [],
    }),
    methodology: {
      largeTransactions:
        "Large-transaction signals prefer a same-category non-recurring median/MAD baseline when at least five comparable transactions exist, otherwise they fall back to the global non-recurring expense baseline.",
      categorySpikes:
        "Category spikes compare the current elapsed-day window with equivalent elapsed-day windows from recent months, including explicit zero-spend months in the baseline.",
      recurringPatterns:
        "Possible recurring patterns require at least three similar unlinked expenses with consistent amount and low interval variation; a median interval alone is not enough.",
      caveat:
        "An anomaly means unusual relative to recorded FinTrack history; it is not evidence of fraud, error, or a bad financial decision.",
    },
  });
};

export {
  buildSpendingInsights,
  median,
  medianAbsoluteDeviation,
  normalizeTitle,
};
