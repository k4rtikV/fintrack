import { z } from "zod";

const metricToneSchema = z.enum([
  "positive",
  "neutral",
  "warning",
  "critical",
]);

const assistantStatusSchema = z.enum([
  "positive",
  "neutral",
  "warning",
  "critical",
]);

const confidenceSchema = z.enum([
  "high",
  "medium",
  "low",
  "not_applicable",
]);

const assistantStructuredResponseSchema = z.object({
  answer: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  status: assistantStatusSchema,
  metrics: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        value: z.string().trim().min(1),
        detail: z.string().trim(),
        tone: metricToneSchema,
      }),
    )
    .max(4),
  insights: z.array(z.string().trim().min(1)).max(4),
  recommendations: z.array(z.string().trim().min(1)).max(3),
  confidence: confidenceSchema,
});

const ASSISTANT_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    summary: { type: "string" },
    status: {
      type: "string",
      enum: ["positive", "neutral", "warning", "critical"],
    },
    metrics: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          detail: { type: "string" },
          tone: {
            type: "string",
            enum: ["positive", "neutral", "warning", "critical"],
          },
        },
        required: ["label", "value", "detail", "tone"],
      },
    },
    insights: {
      type: "array",
      maxItems: 4,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low", "not_applicable"],
    },
  },
  required: [
    "answer",
    "summary",
    "status",
    "metrics",
    "insights",
    "recommendations",
    "confidence",
  ],
};

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const firstSentence = (text) => {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "FinTrack analyzed the requested financial data.";
  }

  const sentence = normalized.match(/^(.{1,220}?[.!?])(?:\s|$)/)?.[1];

  return sentence || normalized.slice(0, 220);
};

const formatPercent = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  return `${round2(numeric)}%`;
};

const currencySymbol = (currency) => {
  const symbols = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
  };

  return symbols[currency] || `${currency || ""} `;
};

const formatMoney = (value, currency = "INR") => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  const locale = currency === "INR" ? "en-IN" : "en-US";
  const digits = Number.isInteger(numeric) ? 0 : 2;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  }).format(numeric);

  return `${currencySymbol(currency)}${formatted}`;
};

const getFallbackAnswer = (reply) => {
  const raw = String(reply || "").trim();

  if (!raw) {
    return "";
  }

  const candidates = [raw];

  // Gemini may occasionally wrap an otherwise valid JSON object in a
  // Markdown code fence even when FinTrack asked for a plain-text
  // explanation. Parse that shape defensively instead of rendering the JSON
  // verbatim in the assistant card.
  const fencedMatch = raw.match(
    /```(?:json|javascript|js)?\s*([\s\S]*?)```/i,
  );

  if (fencedMatch?.[1]?.trim()) {
    candidates.unshift(fencedMatch[1].trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      if (typeof parsed?.answer === "string" && parsed.answer.trim()) {
        return parsed.answer.trim();
      }

      if (
        typeof parsed?.response?.answer === "string" &&
        parsed.response.answer.trim()
      ) {
        return parsed.response.answer.trim();
      }
    } catch {
      // Try the next candidate, then fall back to normal plain text.
    }
  }

  return raw;
};

const buildFallbackPresentation = (reply) => {
  const answer = getFallbackAnswer(reply);

  return {
    answer,
    summary: firstSentence(answer),
    status: "neutral",
    metrics: [],
    insights: [],
    recommendations: [],
    confidence: "not_applicable",
  };
};

const parseAssistantStructuredResponse = (text) => {
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    const validated = assistantStructuredResponseSchema.safeParse(parsed);

    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
};

const getSuccessfulToolResults = (toolTrace) => {
  const byName = new Map();

  for (const trace of toolTrace || []) {
    if (trace?.ok && trace?.data) {
      byName.set(trace.name, trace.data);
    }
  }

  return byName;
};

const lowerConfidence = (value) => {
  const normalized = String(value || "").toLowerCase();

  return ["high", "medium", "low"].includes(normalized)
    ? normalized
    : "not_applicable";
};

const budgetPresentation = ({ reply, data, toolResults }) => {
  const currency = data.preferredCurrency || "INR";
  const items = Array.isArray(data.items) ? data.items : [];
  const riskRank = {
    OVER_BUDGET: 5,
    CRITICAL: 4,
    NEAR_LIMIT: 3,
    ON_TRACK: 1,
  };
  const paceRank = {
    HIGH: 3,
    ELEVATED: 2,
    LOW: 1,
  };

  const focus =
    data.highestPaceRiskBudget ||
    [...items].sort(
      (a, b) =>
        (riskRank[b.status] || 0) - (riskRank[a.status] || 0) ||
        (paceRank[b.paceRisk] || 0) - (paceRank[a.paceRisk] || 0) ||
        (Number(b.percentageUsed) || 0) - (Number(a.percentageUsed) || 0),
    )[0] ||
    null;

  let status = "positive";

  if (
    Number(data.overBudgetCount) > 0 ||
    focus?.status === "OVER_BUDGET"
  ) {
    status = "critical";
  } else if (
    focus?.paceRisk === "HIGH" ||
    focus?.paceRisk === "ELEVATED" ||
    ["CRITICAL", "NEAR_LIMIT"].includes(focus?.status)
  ) {
    status = "warning";
  }

  const metrics = [];

  if (focus) {
    metrics.push({
      label: "Budget used",
      value: formatPercent(focus.percentageUsed),
      detail: `${formatMoney(focus.spent, currency)} of ${formatMoney(
        focus.budget,
        currency,
      )}`,
      tone: status === "critical" ? "critical" : status === "warning" ? "warning" : "positive",
    });

    if (focus.monthProgress) {
      metrics.push({
        label: "Month elapsed",
        value: formatPercent(focus.monthProgress.monthElapsedPercent),
        detail: `${focus.monthProgress.daysElapsed} of ${focus.monthProgress.daysInMonth} days`,
        tone: "neutral",
      });
    }

    metrics.push({
      label: "Remaining",
      value: formatMoney(focus.remaining, currency),
      detail: focus.category || "Budget",
      tone: focus.remaining < 0 ? "critical" : "neutral",
    });

    if (Number.isFinite(Number(focus.projectedMonthEndSpend))) {
      metrics.push({
        label: "Linear projection",
        value: formatMoney(focus.projectedMonthEndSpend, currency),
        detail: `${String(focus.projectionConfidence || "LOW").toLowerCase()} confidence`,
        tone:
          Number(focus.projectedUsagePercent) > 100
            ? "warning"
            : "neutral",
      });
    }
  } else {
    metrics.push(
      {
        label: "Total budget",
        value: formatMoney(data.totalBudget, currency),
        detail: data.month || "",
        tone: "neutral",
      },
      {
        label: "Budgeted spend",
        value: formatMoney(data.budgetedSpent, currency),
        detail: "",
        tone: "neutral",
      },
    );
  }

  const insights = [];

  if (focus) {
    insights.push(
      `${focus.category} has used ${formatPercent(
        focus.percentageUsed,
      )} of its budget, leaving ${formatMoney(focus.remaining, currency)}.`,
    );

    if (
      focus.paceRisk === "HIGH" ||
      focus.paceRisk === "ELEVATED"
    ) {
      insights.push(
        `${focus.category} spending is ahead of the month's elapsed pace; the month-end projection is only a directional estimate.`,
      );
    }
  }

  const unbudgeted = Array.isArray(data.unbudgetedSpending)
    ? data.unbudgetedSpending[0]
    : null;

  if (unbudgeted) {
    insights.push(
      `${unbudgeted.category} has ${formatMoney(
        unbudgeted.spent,
        currency,
      )} of unbudgeted spending across ${unbudgeted.transactionCount} transaction${
        unbudgeted.transactionCount === 1 ? "" : "s"
      }.`,
    );
  }

  const recent = toolResults.get("get_recent_transactions");
  const recentExpenses = recent?.transactions?.filter(
    (transaction) => transaction.type === "EXPENSE",
  );

  if (recentExpenses?.length) {
    const largestExpense = [...recentExpenses].sort(
      (a, b) => Number(b.amount) - Number(a.amount),
    )[0];

    insights.push(
      `Largest recent expense in the retrieved transactions: ${largestExpense.title} at ${formatMoney(
        largestExpense.amount,
        largestExpense.currency || currency,
      )}.`,
    );
  }

  const recommendations = [];

  if (focus && status !== "positive") {
    recommendations.push(
      `Review the recent ${focus.category} transactions before making additional spending decisions in that category.`,
    );
  }

  if (unbudgeted) {
    recommendations.push(
      `Consider creating a ${unbudgeted.category} budget if that spending is expected to recur.`,
    );
  }

  const summary = focus
    ? status === "positive"
      ? `${focus.category} is currently within budget at ${formatPercent(
          focus.percentageUsed,
        )} used.`
      : `${focus.category} needs attention: ${formatPercent(
          focus.percentageUsed,
        )} of the budget is already used${
          focus.monthProgress
            ? ` with ${formatPercent(
                focus.monthProgress.monthElapsedPercent,
              )} of the month elapsed`
            : ""
        }.`
    : "FinTrack analyzed your current budget status.";

  return {
    answer: getFallbackAnswer(reply),
    summary,
    status,
    metrics: metrics.slice(0, 4),
    insights: insights.slice(0, 4),
    recommendations: recommendations.slice(0, 3),
    confidence: focus?.projectedMonthEndSpend
      ? lowerConfidence(focus.projectionConfidence)
      : "not_applicable",
  };
};

const comparisonPresentation = ({ reply, data }) => {
  const currency = data.preferredCurrency || "INR";
  const expense = data.changes?.expense || {};
  const income = data.changes?.income || {};
  const savings = data.changes?.netSavings || {};
  let status = "neutral";

  if (expense.comparablePercent) {
    if (Number(expense.absoluteChange) > 0) {
      status = "warning";
    } else if (Number(expense.absoluteChange) < 0) {
      status = "positive";
    }
  }

  const currentPeriod = data.comparisonBasis?.currentPeriod;
  const previousPeriod = data.comparisonBasis?.previousPeriod;

  const metrics = [
    {
      label: "Current expenses",
      value: formatMoney(expense.current, currency),
      detail: currentPeriod
        ? `${currentPeriod.startDate} to ${currentPeriod.endDate}`
        : "",
      tone: status === "warning" ? "warning" : "neutral",
    },
    {
      label: "Previous comparable",
      value: formatMoney(expense.previous, currency),
      detail: previousPeriod
        ? `${previousPeriod.startDate} to ${previousPeriod.endDate}`
        : "",
      tone: "neutral",
    },
    {
      label: "Current income",
      value: formatMoney(income.current, currency),
      detail: "",
      tone: "positive",
    },
    {
      label: "Net savings",
      value: formatMoney(savings.current, currency),
      detail: "",
      tone: Number(savings.current) >= 0 ? "positive" : "warning",
    },
  ];

  const insights = [];

  if (!expense.comparablePercent) {
    insights.push(
      "A percentage expense change is not shown because the previous comparable period had a zero baseline.",
    );
  } else {
    insights.push(
      `Expenses changed by ${formatMoney(
        Math.abs(expense.absoluteChange),
        currency,
      )} (${formatPercent(Math.abs(expense.percentChange))}) versus the comparable period.`,
    );
  }

  const topCategory = data.categoryComparison?.[0];

  if (topCategory) {
    insights.push(
      `${topCategory.category} had the largest absolute category change at ${formatMoney(
        Math.abs(topCategory.absoluteChange),
        currency,
      )}.`,
    );
  }

  const recommendations = [];

  if (!expense.comparablePercent && Number(expense.current) > 0) {
    recommendations.push(
      "Review the previous comparable period if zero recorded activity is unexpected.",
    );
  }

  return {
    answer: getFallbackAnswer(reply),
    summary: `Current expenses are ${formatMoney(
      expense.current,
      currency,
    )} versus ${formatMoney(
      expense.previous,
      currency,
    )} in the comparable previous-month window.`,
    status,
    metrics,
    insights: insights.slice(0, 4),
    recommendations: recommendations.slice(0, 3),
    confidence: "not_applicable",
  };
};

const overviewPresentation = ({ reply, data }) => {
  const currency = data.preferredCurrency || "INR";
  const overview = data.overview || {};
  const positive = Number(overview.netSavings) >= 0;

  return {
    answer: getFallbackAnswer(reply),
    summary: positive
      ? `Net savings for the selected period are ${formatMoney(
          overview.netSavings,
          currency,
        )}.`
      : `Expenses exceed income by ${formatMoney(
          Math.abs(Number(overview.netSavings) || 0),
          currency,
        )} for the selected period.`,
    status: positive ? "positive" : "warning",
    metrics: [
      {
        label: "Income",
        value: formatMoney(overview.totalIncome, currency),
        detail: "",
        tone: "positive",
      },
      {
        label: "Expenses",
        value: formatMoney(overview.totalExpense, currency),
        detail: "",
        tone: "neutral",
      },
      {
        label: "Net savings",
        value: formatMoney(overview.netSavings, currency),
        detail: "",
        tone: positive ? "positive" : "warning",
      },
      {
        label: "Savings rate",
        value: formatPercent(overview.savingsRate),
        detail: "",
        tone: positive ? "positive" : "warning",
      },
    ],
    insights: [],
    recommendations: [],
    confidence: "not_applicable",
  };
};

const goalPresentation = ({ reply, data }) => {
  const currency = data.preferredCurrency || "INR";
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const focus =
    goals.find((goal) => goal.status !== "COMPLETED") || goals[0] || null;

  if (!focus) {
    return buildFallbackPresentation(reply);
  }

  let status = "neutral";

  if (focus.paceAssessment === "OVERDUE") {
    status = "critical";
  } else if (
    focus.paceAssessment === "ABOVE_RECENT_SAVINGS_PACE" ||
    focus.paceAssessment === "NO_POSITIVE_RECENT_SAVINGS_BASELINE"
  ) {
    status = "warning";
  } else if (
    focus.paceAssessment === "WITHIN_RECENT_SAVINGS_PACE" ||
    focus.paceAssessment === "COMPLETED"
  ) {
    status = "positive";
  }

  return {
    answer: getFallbackAnswer(reply),
    summary: `${focus.name} is ${formatPercent(
      focus.percentageComplete,
    )} complete.`,
    status,
    metrics: [
      {
        label: "Goal progress",
        value: formatPercent(focus.percentageComplete),
        detail: focus.name,
        tone: status,
      },
      {
        label: "Remaining",
        value: formatMoney(focus.remainingAmount, currency),
        detail: "",
        tone: "neutral",
      },
      {
        label: "Required monthly",
        value:
          focus.requiredMonthlyContribution === null
            ? "—"
            : formatMoney(focus.requiredMonthlyContribution, currency),
        detail: "",
        tone: status === "warning" || status === "critical" ? "warning" : "neutral",
      },
      {
        label: "Recent avg. savings",
        value: formatMoney(focus.recentAverageMonthlySavings, currency),
        detail: `${focus.savingsBaselineMonthCount || 0} completed activity month${
          focus.savingsBaselineMonthCount === 1 ? "" : "s"
        }`,
        tone: "neutral",
      },
    ],
    insights: [
      focus.assessmentBasis,
      data.portfolio?.activeGoalCount > 1
        ? data.portfolio.collectivelyAffordable
          ? `Across all ${data.portfolio.activeGoalCount} active goals, the combined required monthly contribution is ${formatMoney(
              data.portfolio.totalRequiredMonthlyContribution,
              currency,
            )}, which is within the recent savings pool of ${formatMoney(
              data.portfolio.recentAverageMonthlySavings,
              currency,
            )}.`
          : `Across all ${data.portfolio.activeGoalCount} active goals, the combined required monthly contribution is ${formatMoney(
              data.portfolio.totalRequiredMonthlyContribution,
              currency,
            )}, exceeding the recent savings pool by ${formatMoney(
              data.portfolio.monthlyShortfall,
              currency,
            )}. Individual goal feasibility should not be read as if every goal can use the full savings amount independently.`
        : null,
    ].filter(Boolean),
    recommendations:
      status === "warning" ||
      data.portfolio?.collectivelyAffordable === false
        ? [
            "Consider adjusting goal priorities, monthly contributions, or target timelines if the combined required pace is not sustainable.",
          ]
        : [],
    confidence: lowerConfidence(focus.evidenceConfidence),
  };
};

const transactionsPresentation = ({ reply, data }) => {
  const transactions = Array.isArray(data.transactions)
    ? data.transactions
    : [];
  const preferredCurrency = data.preferredCurrency || "INR";
  const expenses = transactions.filter(
    (transaction) => transaction.type === "EXPENSE",
  );
  const income = transactions.filter(
    (transaction) => transaction.type === "INCOME",
  );
  const largestExpense = [...expenses].sort(
    (a, b) => Number(b.amount) - Number(a.amount),
  )[0];

  const metrics = [
    {
      label: "Transactions shown",
      value: String(transactions.length),
      detail: data.dataCoverage
        ? `${data.dataCoverage.startDate} to ${data.dataCoverage.endDate}`
        : "",
      tone: "neutral",
    },
  ];

  if (largestExpense) {
    metrics.push({
      label: "Largest expense",
      value: formatMoney(
        largestExpense.amount,
        largestExpense.currency || preferredCurrency,
      ),
      detail: largestExpense.title,
      tone: "warning",
    });
  }

  if (income.length) {
    const totalIncome = income.reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0,
    );
    metrics.push({
      label: "Income shown",
      value: formatMoney(totalIncome, preferredCurrency),
      detail: `${income.length} income transaction${income.length === 1 ? "" : "s"}`,
      tone: "positive",
    });
  }

  return {
    answer: getFallbackAnswer(reply),
    summary: `${transactions.length} recent transaction${
      transactions.length === 1 ? "" : "s"
    } were retrieved from FinTrack.`,
    status: "neutral",
    metrics: metrics.slice(0, 4),
    insights: largestExpense
      ? [
          `${largestExpense.title} is the largest expense in the retrieved transaction set.`,
        ]
      : [],
    recommendations: [],
    confidence: "not_applicable",
  };
};

const categoryPresentation = ({ reply, data }) => {
  const currency = data.preferredCurrency || "INR";
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const top = categories[0];

  if (!top) {
    return buildFallbackPresentation(reply);
  }

  return {
    answer: getFallbackAnswer(reply),
    summary: `${top.category} is the largest spending category in the selected period at ${formatMoney(
      top.amount,
      currency,
    )}.`,
    status: "neutral",
    metrics: categories.slice(0, 4).map((category) => ({
      label: category.category,
      value: formatMoney(category.amount, currency),
      detail: `${formatPercent(
        category.expenseSharePercent,
      )} of expenses · ${category.transactionCount} transaction${
        category.transactionCount === 1 ? "" : "s"
      }`,
      tone: "neutral",
    })),
    insights: [],
    recommendations: [],
    confidence: "not_applicable",
  };
};

const accountsPresentation = ({ reply, data }) => {
  const balances = data.summary?.balancesByCurrency || {};
  const entries = Object.entries(balances);

  return {
    answer: getFallbackAnswer(reply),
    summary: `${data.summary?.activeAccountCount || data.accounts?.length || 0} active account${
      (data.summary?.activeAccountCount || data.accounts?.length || 0) === 1
        ? ""
        : "s"
    } are recorded in FinTrack.`,
    status: "neutral",
    metrics: entries.slice(0, 4).map(([currency, value]) => ({
      label: `${currency} balance`,
      value: formatMoney(value, currency),
      detail: data.summary?.hasMixedCurrencies
        ? "Reported separately; mixed currencies are not summed."
        : "",
      tone: "neutral",
    })),
    insights: data.summary?.hasMixedCurrencies
      ? ["Balances use multiple currencies and are intentionally reported separately."]
      : [],
    recommendations: [],
    confidence: "not_applicable",
  };
};

const recurringPresentation = ({ reply, data }) => {
  const expenseEntries = Object.entries(data.expenseByCurrency || {});
  const incomeEntries = Object.entries(data.incomeByCurrency || {});
  const metrics = [
    {
      label: "Upcoming items",
      value: String(data.count || 0),
      detail: `Next ${data.dataCoverage?.horizonDays || 30} days`,
      tone: "neutral",
    },
    ...expenseEntries.map(([currency, amount]) => ({
      label: `${currency} recurring expenses`,
      value: formatMoney(amount, currency),
      detail: "",
      tone: "warning",
    })),
    ...incomeEntries.map(([currency, amount]) => ({
      label: `${currency} recurring income`,
      value: formatMoney(amount, currency),
      detail: "",
      tone: "positive",
    })),
  ];

  return {
    answer: getFallbackAnswer(reply),
    summary: `${data.count || 0} active recurring item${
      Number(data.count) === 1 ? "" : "s"
    } fall within the selected horizon.`,
    status: "neutral",
    metrics: metrics.slice(0, 4),
    insights: [],
    recommendations: [],
    confidence: "not_applicable",
  };
};

const trendPresentation = ({ reply, data }) => {
  const currency = data.preferredCurrency || "INR";
  const trend = Array.isArray(data.trend) ? data.trend : [];
  const latest = trend.at(-1);
  const previous = trend.at(-2);

  if (!latest) {
    return buildFallbackPresentation(reply);
  }

  const netChange = previous
    ? Number(latest.netSavings) - Number(previous.netSavings)
    : 0;

  return {
    answer: getFallbackAnswer(reply),
    summary: `${latest.label || latest.month} net savings are ${formatMoney(
      latest.netSavings,
      currency,
    )}.`,
    status:
      Number(latest.netSavings) < 0
        ? "warning"
        : previous && netChange > 0
          ? "positive"
          : "neutral",
    metrics: [
      {
        label: "Latest income",
        value: formatMoney(latest.income, currency),
        detail: latest.label || latest.month,
        tone: "positive",
      },
      {
        label: "Latest expenses",
        value: formatMoney(latest.expense, currency),
        detail: latest.label || latest.month,
        tone: "neutral",
      },
      {
        label: "Latest net savings",
        value: formatMoney(latest.netSavings, currency),
        detail: latest.label || latest.month,
        tone: Number(latest.netSavings) >= 0 ? "positive" : "warning",
      },
      ...(previous
        ? [
            {
              label: "Savings vs prior month",
              value: formatMoney(netChange, currency),
              detail: `${previous.label || previous.month} → ${latest.label || latest.month}`,
              tone: netChange >= 0 ? "positive" : "warning",
            },
          ]
        : []),
    ].slice(0, 4),
    insights: [],
    recommendations: [],
    confidence: "not_applicable",
  };
};

const healthPresentation = ({ reply, data }) => {
  const cashFlow = data.cashFlow || {};
  const currency = data.preferredCurrency || "INR";
  const budget = data.budgetSummary || {};
  let status = Number(cashFlow.current?.netSavings || cashFlow.netSavings || 0) >= 0
    ? "positive"
    : "warning";

  if (Number(budget.overBudgetCount) > 0) {
    status = "critical";
  } else if (Number(budget.paceRiskCount) > 0 || Number(budget.nearLimitCount) > 0) {
    status = "warning";
  }

  const current = cashFlow.current || cashFlow;

  return {
    answer: getFallbackAnswer(reply),
    summary:
      status === "positive"
        ? "Your current FinTrack data is broadly on track."
        : "Your current FinTrack data has one or more areas that need attention.",
    status,
    metrics: [
      {
        label: "Income",
        value: formatMoney(current.totalIncome, currency),
        detail: "",
        tone: "positive",
      },
      {
        label: "Expenses",
        value: formatMoney(current.totalExpense, currency),
        detail: "",
        tone: "neutral",
      },
      {
        label: "Net savings",
        value: formatMoney(current.netSavings, currency),
        detail: "",
        tone: Number(current.netSavings) >= 0 ? "positive" : "warning",
      },
      {
        label: "Budget risk",
        value: `${Number(budget.paceRiskCount || 0)} pace-risk`,
        detail: `${Number(budget.overBudgetCount || 0)} over budget`,
        tone: status,
      },
    ],
    insights: Array.isArray(data.insightCandidates)
      ? data.insightCandidates
          .slice(0, 3)
          .map((item) =>
            typeof item === "string"
              ? item
              : item.message || item.description || JSON.stringify(item),
          )
      : [],
    recommendations: [],
    confidence: "not_applicable",
  };
};

const spendingPatternsPresentation = ({ reply, data }) => {
  if (!data.supported) {
    return {
      answer: getFallbackAnswer(reply),
      summary:
        data.note ||
        "FinTrack cannot safely combine this analysis across the current account currencies.",
      status: "warning",
      metrics: [],
      insights: [
        data.currencySafety?.note ||
          "A safe comparable-currency baseline is unavailable.",
      ].filter(Boolean),
      recommendations: [
        "Review the relevant accounts separately by currency or add an authoritative FX conversion layer before combining them.",
      ],
      confidence: "low",
    };
  }

  const anomalies = Array.isArray(data.anomalies)
    ? data.anomalies
    : [];
  const patterns = Array.isArray(data.patterns)
    ? data.patterns
    : [];
  const signals = Array.isArray(data.topSignals)
    ? data.topSignals
    : [];
  const highCount = signals.filter(
    (item) => item.severity === "HIGH",
  ).length;
  const mediumCount = signals.filter(
    (item) => item.severity === "MEDIUM",
  ).length;
  const topConcentration = patterns.find(
    (item) =>
      item.type === "SPENDING_CONCENTRATION",
  );
  const confidence =
    String(data.evidence?.confidence || "NONE").toLowerCase();

  const status =
    highCount > 0
      ? "warning"
      : mediumCount > 0
        ? "warning"
        : "neutral";

  const insights = signals.slice(0, 4).map((signal) => {
    if (signal.type === "LARGE_TRANSACTION") {
      return `${signal.title} (${signal.category}) at ${formatMoney(
        signal.amount,
        data.preferredCurrency,
      )} is materially larger than the recent expense-transaction baseline.`;
    }

    if (
      signal.type === "CATEGORY_SPIKE" ||
      signal.type === "NEW_CATEGORY_ACTIVITY"
    ) {
      return signal.percentChange === null
        ? `${signal.category} has new comparable-period activity at ${formatMoney(
            signal.currentAmount,
            data.preferredCurrency,
          )}; there is no positive historical baseline for a percentage comparison.`
        : `${signal.category} is ${formatPercent(
            signal.percentChange,
          )} above its recent comparable-period average.`;
    }

    if (
      signal.type === "SPENDING_CONCENTRATION"
    ) {
      return `${signal.category} accounts for ${formatPercent(
        signal.topCategorySharePercent,
      )} of current-period expenses.`;
    }

    if (
      signal.type ===
      "POSSIBLE_RECURRING_PATTERN"
    ) {
      return `${signal.title} appears ${signal.occurrences} times at a roughly ${signal.medianIntervalDays}-day interval with similar amounts.`;
    }

    return signal.explanation || signal.type;
  });

  const recommendations = [];

  const large = anomalies.find(
    (item) => item.type === "LARGE_TRANSACTION",
  );
  if (large) {
    recommendations.push(
      `Review the ${large.title} transaction if you do not recognize why it is unusually large relative to your recorded history.`,
    );
  }

  const recurring = patterns.find(
    (item) =>
      item.type === "POSSIBLE_RECURRING_PATTERN",
  );
  if (recurring) {
    recommendations.push(
      `If ${recurring.title} is intentionally recurring, consider tracking it through FinTrack's recurring-transactions feature.`,
    );
  }

  if (
    !signals.length &&
    confidence !== "none"
  ) {
    recommendations.push(
      "No strong outlier signal was detected in the available history; continue recording transactions to strengthen the baseline.",
    );
  }

  return {
    answer: getFallbackAnswer(reply),
    summary: signals.length
      ? `FinTrack found ${signals.length} notable spending signal${
          signals.length === 1 ? "" : "s"
        } in the available history.`
      : "FinTrack did not find a strong spending anomaly in the available history.",
    status,
    metrics: [
      {
        label: "Notable signals",
        value: String(signals.length),
        detail: `${anomalies.length} anomaly · ${patterns.length} pattern`,
        tone: highCount > 0 ? "warning" : "neutral",
      },
      {
        label: "High severity",
        value: String(highCount),
        detail: "Relative to recorded FinTrack history",
        tone: highCount > 0 ? "warning" : "positive",
      },
      {
        label: "History used",
        value: String(
          data.evidence?.activeHistoricalMonths?.length || 0,
        ),
        detail: "Comparable active months",
        tone: "neutral",
      },
      {
        label: "Top-category share",
        value: topConcentration
          ? formatPercent(
              topConcentration.topCategorySharePercent,
            )
          : "—",
        detail: topConcentration?.category || "No strong concentration",
        tone:
          topConcentration?.severity === "HIGH"
            ? "warning"
            : "neutral",
      },
    ],
    insights,
    recommendations: recommendations.slice(0, 3),
    confidence:
      ["high", "medium", "low"].includes(confidence)
        ? confidence
        : "not_applicable",
  };
};

const forecastPresentation = ({ reply, data }) => {
  if (!data.supported) {
    return {
      answer: getFallbackAnswer(reply),
      summary:
        data.note ||
        "FinTrack cannot safely build this forecast from the current currency mix.",
      status: "warning",
      metrics: [],
      insights: [
        data.quality?.currencySafety?.note ||
          data.note,
      ].filter(Boolean),
      recommendations: [],
      confidence: "low",
    };
  }

  const forecast = data.forecast || {};
  const currency =
    data.preferredCurrency || "INR";
  const budgetRisks = (
    data.budgetForecasts || []
  )
    .filter(
      (item) =>
        Number(item.projectedUsagePercent) > 100 ||
        ["HIGH", "ELEVATED"].includes(
          item.paceRisk,
        ),
    )
    .sort(
      (a, b) =>
        Number(b.projectedUsagePercent || 0) -
        Number(a.projectedUsagePercent || 0),
    );
  const topBudgetRisk = budgetRisks[0];
  const projectedSavings =
    Number(forecast.netSavings) || 0;
  const status =
    projectedSavings < 0 ||
    Number(topBudgetRisk?.projectedUsagePercent) > 120
      ? "warning"
      : projectedSavings > 0 &&
          !topBudgetRisk
        ? "positive"
        : "neutral";

  const insights = [];

  if (topBudgetRisk) {
    insights.push(
      topBudgetRisk.anomalyAdjusted
        ? `${topBudgetRisk.category} has already used ${formatPercent(
            topBudgetRisk.projectedUsagePercent,
          )} of its current budget. FinTrack keeps the pace-risk warning but does not automatically repeat the anomalous outlay in the month-end forecast.`
        : `${topBudgetRisk.category} is projected to reach ${formatPercent(
            topBudgetRisk.projectedUsagePercent,
          )} of its current budget at the present pace; this remains a directional estimate.`,
    );
  }

  if (
    Number(
      data.anomalyContext
        ?.highSeverityAnomalyCount,
    ) > 0
  ) {
    insights.push(
      "A high-severity current-period anomaly is present, so the month-end forecast is intentionally treated with lower confidence.",
    );
  }

  if (
    Number(
      data.expensePaceAdjustment
        ?.excludedFromPace,
    ) > 0
  ) {
    insights.push(
      `${formatMoney(
        data.expensePaceAdjustment.excludedFromPace,
        currency,
      )} of already-recorded spending is included once but not automatically repeated in the remaining-days pace because FinTrack classified it as out-of-pattern/high-severity activity.`,
    );
  }

  if (
    data.historicalBaseline?.expenseMonthCount === 0
  ) {
    insights.push(
      "No completed positive-expense month was available for an expense baseline, so only non-anomalous current spending is pace-projected.",
    );
  } else {
    insights.push(
      `The forecast uses ${data.historicalBaseline.monthCount} recent completed active month${
        data.historicalBaseline.monthCount === 1 ? "" : "s"
      } plus current month-to-date pace.`,
    );
  }

  const recommendations = [];

  if (projectedSavings < 0) {
    recommendations.push(
      "Review discretionary spending and known upcoming expenses before month-end if maintaining positive savings is a priority.",
    );
  }

  if (topBudgetRisk) {
    recommendations.push(
      `Review the remaining ${topBudgetRisk.category} budget before additional spending in that category.`,
    );
  }

  return {
    answer: getFallbackAnswer(reply),
    summary:
      projectedSavings >= 0
        ? `FinTrack projects month-end net savings around ${formatMoney(
            projectedSavings,
            currency,
          )}.`
        : `FinTrack projects a month-end savings shortfall around ${formatMoney(
            Math.abs(projectedSavings),
            currency,
          )}.`,
    status,
    metrics: [
      {
        label: "Projected income",
        value: formatMoney(
          forecast.income,
          currency,
        ),
        detail: "Month-end estimate",
        tone: "positive",
      },
      {
        label: "Projected expenses",
        value: formatMoney(
          forecast.expense,
          currency,
        ),
        detail: "Month-end estimate",
        tone:
          topBudgetRisk ? "warning" : "neutral",
      },
      {
        label: "Projected net savings",
        value: formatMoney(
          forecast.netSavings,
          currency,
        ),
        detail: `${String(
          forecast.confidence || "NONE",
        ).toLowerCase()} confidence`,
        tone:
          projectedSavings >= 0
            ? "positive"
            : "warning",
      },
      {
        label: "Projected savings rate",
        value:
          forecast.savingsRate === null
            ? "—"
            : formatPercent(
                forecast.savingsRate,
              ),
        detail: data.monthProgress
          ? `${formatPercent(
              data.monthProgress
                .monthElapsedPercent,
            )} of month elapsed`
          : "",
        tone:
          projectedSavings >= 0
            ? "positive"
            : "warning",
      },
    ],
    insights: insights.slice(0, 4),
    recommendations: recommendations.slice(0, 3),
    confidence: lowerConfidence(
      forecast.confidence,
    ),
  };
};

const simulationPresentation = ({ reply, data }) => {
  if (!data.supported) {
    return {
      answer: getFallbackAnswer(reply),
      summary:
        data.error ||
        "FinTrack could not safely run that what-if scenario.",
      status: "warning",
      metrics: [],
      insights: [data.error].filter(Boolean),
      recommendations: [],
      confidence: "low",
    };
  }

  const currency =
    data.preferredCurrency || "INR";
  const after =
    data.currentMonth?.after || {};
  const changes =
    data.currentMonth?.changes || {};
  const isFutureReduction =
    data.inputs?.reductionAppliesTo ===
    "FUTURE_REMAINING_MONTH_SPENDING";
  const budgetImpact = data.budgetImpact || {};
  const forecastAfter =
    data.monthEndForecast?.after;
  const status =
    data.assessment === "HIGH_IMPACT"
      ? "critical"
      : data.assessment ===
          "NOTICEABLE_IMPACT"
        ? "warning"
        : data.assessment ===
            "POSITIVE_IMPACT"
          ? "positive"
          : "neutral";

  const metrics = isFutureReduction
    ? [
        {
          label: "Estimated future savings",
          value: formatMoney(
            data.inputs?.calculatedScenarioAmount,
            currency,
          ),
          detail: `${data.inputs?.reductionPercent || 0}% reduction in remaining ${data.inputs?.category || "category"} spending`,
          tone: "positive",
        },
      ]
    : [
        {
          label: "Net savings after",
          value: formatMoney(
            after.netSavings,
            currency,
          ),
          detail: `${formatMoney(
            changes.netSavings,
            currency,
          )} change`,
          tone:
            Number(after.netSavings) >= 0
              ? "positive"
              : "critical",
        },
        {
          label: "Savings rate after",
          value:
            after.savingsRate === null
              ? "—"
              : formatPercent(after.savingsRate),
          detail:
            changes.savingsRatePercentagePoints ===
            null
              ? ""
              : `${round2(
                  changes.savingsRatePercentagePoints,
                )} percentage-point change`,
          tone:
            Number(
              changes.savingsRatePercentagePoints,
            ) < -10
              ? "warning"
              : "neutral",
        },
      ];

  if (forecastAfter) {
    metrics.push({
      label: "Month-end savings after",
      value: formatMoney(
        forecastAfter.netSavings,
        currency,
      ),
      detail: `${String(
        data.monthEndForecast
          ?.forecastConfidence || "NONE",
      ).toLowerCase()} forecast confidence`,
      tone:
        Number(forecastAfter.netSavings) >= 0
          ? "positive"
          : "warning",
    });
  }

  if (budgetImpact.matchedBudget) {
    metrics.push({
      label: "Budget used after",
      value: formatPercent(
        budgetImpact.percentageUsedAfter,
      ),
      detail: budgetImpact.category,
      tone:
        budgetImpact.overBudgetAfter
          ? "critical"
          : Number(
                budgetImpact.percentageUsedAfter,
              ) >= 80
            ? "warning"
            : "neutral",
    });
  }

  const insights = [
    isFutureReduction
      ? `Already-recorded current-month spending is unchanged. FinTrack estimates ${formatMoney(
          data.inputs?.calculatedScenarioAmount,
          currency,
        )} of savings from reducing only the remaining-month ${data.inputs?.category || "category"} spending.`
      : `This scenario changes current-month net savings by ${formatMoney(
          changes.netSavings,
          currency,
        )}.`,
  ];

  if (
    budgetImpact.matchedBudget &&
    !isFutureReduction &&
    budgetImpact.percentageUsedAfter !== undefined
  ) {
    insights.push(
      `${budgetImpact.category} would move from ${formatPercent(
        budgetImpact.percentageUsedBefore,
      )} to ${formatPercent(
        budgetImpact.percentageUsedAfter,
      )} of budget usage.`,
    );
  } else if (budgetImpact.note) {
    insights.push(budgetImpact.note);
  }

  const recommendations =
    status === "critical" ||
    status === "warning"
      ? [
          "Compare this hypothetical impact with your current budget and savings priorities before deciding.",
        ]
      : [];

  return {
    answer: getFallbackAnswer(reply),
    summary:
      isFutureReduction
        ? `Reducing only the estimated remaining-month ${data.inputs?.category || "category"} spending by ${data.inputs?.reductionPercent || 0}% would improve the month-end forecast by about ${formatMoney(
            data.inputs?.calculatedScenarioAmount,
            currency,
          )}, without rewriting spending that already happened.`
        : data.scenario === "REDUCE_RECORDED_CATEGORY_SPENDING"
          ? `In this retrospective hypothetical, current-month net savings would improve by ${formatMoney(
              Math.abs(changes.netSavings),
              currency,
            )}.`
          : `Under this hypothetical scenario, current-month net savings would be ${formatMoney(
              after.netSavings,
              currency,
            )}.`,
    status,
    metrics: metrics.slice(0, 4),
    insights: insights.slice(0, 4),
    recommendations,
    confidence: lowerConfidence(
      data.evidence?.forecastConfidence,
    ),
  };
};

const limitationPresentation = ({
  reply,
  data,
}) => ({
  answer: getFallbackAnswer(reply),
  summary:
    data?.note ||
    data?.error ||
    "FinTrack cannot safely combine this calculation with the currently available data.",
  status: "warning",
  metrics: [],
  insights: [
    data?.currencySafety?.note ||
      data?.quality?.currencySafety?.note ||
      data?.note ||
      data?.error,
  ].filter(Boolean),
  recommendations: [
    data?.currencySafety?.hasMixedCurrencies
      ? "Review values separately by currency until FinTrack has an authoritative FX conversion layer."
      : null,
  ].filter(Boolean),
  confidence: "low",
});

const buildDeterministicPresentation = ({
  reply,
  toolTrace = [],
}) => {
  const toolResults = getSuccessfulToolResults(toolTrace);
  const unsupportedResult = [...toolResults.values()].find(
    (data) => data?.supported === false,
  );

  if (unsupportedResult) {
    return limitationPresentation({
      reply,
      data: unsupportedResult,
    });
  }

  if (toolResults.has("simulate_financial_scenario")) {
    return simulationPresentation({
      reply,
      data: toolResults.get("simulate_financial_scenario"),
    });
  }

  if (toolResults.has("get_financial_forecast")) {
    return forecastPresentation({
      reply,
      data: toolResults.get("get_financial_forecast"),
    });
  }

  if (toolResults.has("analyze_spending_patterns")) {
    return spendingPatternsPresentation({
      reply,
      data: toolResults.get("analyze_spending_patterns"),
    });
  }

  if (toolResults.has("get_budget_status")) {
    return budgetPresentation({
      reply,
      data: toolResults.get("get_budget_status"),
      toolResults,
    });
  }

  if (toolResults.has("compare_month_to_date")) {
    return comparisonPresentation({
      reply,
      data: toolResults.get("compare_month_to_date"),
    });
  }

  if (toolResults.has("get_goal_progress")) {
    return goalPresentation({
      reply,
      data: toolResults.get("get_goal_progress"),
    });
  }

  if (toolResults.has("get_financial_health_summary")) {
    return healthPresentation({
      reply,
      data: toolResults.get("get_financial_health_summary"),
    });
  }

  if (toolResults.has("get_financial_overview")) {
    return overviewPresentation({
      reply,
      data: toolResults.get("get_financial_overview"),
    });
  }

  if (toolResults.has("get_spending_by_category")) {
    return categoryPresentation({
      reply,
      data: toolResults.get("get_spending_by_category"),
    });
  }

  if (toolResults.has("get_recent_transactions")) {
    return transactionsPresentation({
      reply,
      data: toolResults.get("get_recent_transactions"),
    });
  }

  if (toolResults.has("get_account_balances")) {
    return accountsPresentation({
      reply,
      data: toolResults.get("get_account_balances"),
    });
  }

  if (toolResults.has("get_recurring_transactions")) {
    return recurringPresentation({
      reply,
      data: toolResults.get("get_recurring_transactions"),
    });
  }

  if (toolResults.has("get_monthly_trend")) {
    return trendPresentation({
      reply,
      data: toolResults.get("get_monthly_trend"),
    });
  }

  return buildFallbackPresentation(reply);
};

export {
  ASSISTANT_RESPONSE_JSON_SCHEMA,
  buildDeterministicPresentation,
  buildFallbackPresentation,
  parseAssistantStructuredResponse,
};
