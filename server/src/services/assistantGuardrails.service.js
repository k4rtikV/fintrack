import AppError from "../utils/AppError.js";

const MAX_SIMULATION_AMOUNT = 1_000_000_000;

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const clamp = (value, min, max) =>
  Math.min(Math.max(Number(value) || 0, min), max);

const getCurrencySafety = ({
  accounts = [],
  preferredCurrency = "INR",
}) => {
  const currencies = [
    ...new Set(
      accounts
        .map((account) => account.currency)
        .filter(Boolean),
    ),
  ];

  return {
    supported: currencies.length <= 1,
    preferredCurrency,
    activeCurrencies: currencies,
    hasMixedCurrencies: currencies.length > 1,
    note:
      currencies.length > 1
        ? "Advanced anomaly, forecast, and what-if calculations are not combined across mixed account currencies because FinTrack does not have an authoritative FX conversion layer."
        : null,
  };
};

const assertPositiveAmount = (value, fieldName = "amount") => {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > MAX_SIMULATION_AMOUNT
  ) {
    throw new AppError(
      `${fieldName} must be greater than 0 and no more than ${MAX_SIMULATION_AMOUNT}`,
      400,
    );
  }

  return round2(amount);
};

const assertPercentage = (
  value,
  fieldName = "percentage",
  { min = 0.01, max = 100 } = {},
) => {
  const percentage = Number(value);

  if (
    !Number.isFinite(percentage) ||
    percentage < min ||
    percentage > max
  ) {
    throw new AppError(
      `${fieldName} must be between ${min} and ${max}`,
      400,
    );
  }

  return round2(percentage);
};

const getEvidenceConfidence = ({
  activeHistoryMonths = 0,
  baselineTransactionCount = 0,
  daysElapsed = 0,
}) => {
  if (
    activeHistoryMonths >= 3 &&
    baselineTransactionCount >= 12 &&
    daysElapsed >= 14
  ) {
    return "HIGH";
  }

  if (
    activeHistoryMonths >= 2 &&
    baselineTransactionCount >= 6 &&
    daysElapsed >= 7
  ) {
    return "MEDIUM";
  }

  if (activeHistoryMonths >= 1 || baselineTransactionCount >= 3) {
    return "LOW";
  }

  return "NONE";
};

const combineConfidence = (...values) => {
  const rank = {
    NONE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
  };

  const normalized = values
    .map((value) => String(value || "NONE").toUpperCase())
    .filter((value) => value in rank);

  if (!normalized.length) {
    return "NONE";
  }

  return normalized.reduce(
    (lowest, current) =>
      rank[current] < rank[lowest] ? current : lowest,
    normalized[0],
  );
};

const safePercent = (part, whole) => {
  const denominator = Number(whole) || 0;

  if (denominator === 0) {
    return null;
  }

  return round2(((Number(part) || 0) / denominator) * 100);
};

const sanitizeFiniteNumbers = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeFiniteNumbers);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        sanitizeFiniteNumbers(child),
      ]),
    );
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const buildQualityMetadata = ({
  currencySafety,
  evidenceConfidence = "NONE",
  historicalMonthsUsed = [],
  baselineTransactionCount = 0,
  warnings = [],
}) => ({
  currencySafety,
  evidenceConfidence,
  historicalMonthsUsed,
  historicalMonthCount: historicalMonthsUsed.length,
  baselineTransactionCount,
  warnings: [...new Set(warnings.filter(Boolean))],
  guardrailsApplied: [
    "NO_ZERO_BASELINE_PERCENTAGES",
    "NO_MIXED_CURRENCY_AGGREGATION_WITHOUT_FX",
    "NO_DATABASE_MUTATIONS",
    "FINITE_NUMBER_SANITIZATION",
    "EXPLICIT_FORECAST_CONFIDENCE",
  ],
});

export {
  MAX_SIMULATION_AMOUNT,
  assertPercentage,
  assertPositiveAmount,
  buildQualityMetadata,
  clamp,
  combineConfidence,
  getCurrencySafety,
  getEvidenceConfidence,
  safePercent,
  sanitizeFiniteNumbers,
};
