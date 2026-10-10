import { z } from "zod";

const MAX_TREND_MONTHS = 24;
const MAX_CUSTOM_ANALYTICS_MONTHS = 60;
const strictDateKey = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const monthsInclusive = (startDate, endDate) =>
  (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
  endDate.getUTCMonth() - startDate.getUTCMonth() + 1;

const validBoundedRange = (data, maxMonths) => {
  if (!data.startDate && !data.endDate) return true;
  const now = new Date();
  const end = data.endDate || now;
  // An end-only request is a historical lookback ending at the requested date,
  // not an accidental all-months-since-1970 materialization.
  const start = data.startDate || new Date(Date.UTC(
    end.getUTCFullYear(), end.getUTCMonth() - maxMonths + 1, 1,
  ));
  return start <= end && monthsInclusive(start, end) <= maxMonths;
};

const rangeMessage = (maxMonths) => `Date range must be ordered and cover at most ${maxMonths} calendar months`;
const withRangeLimit = (schema, maxMonths) => schema.refine(
  (data) => validBoundedRange(data, maxMonths),
  { message: rangeMessage(maxMonths), path: ["startDate"] },
);

export const analyticsDateRangeSchema = z.object({
  query: withRangeLimit(z.object({
    startDate: strictDateKey.optional(),
    endDate: strictDateKey.optional(),
  }), MAX_CUSTOM_ANALYTICS_MONTHS),
});

export const monthlyTrendSchema = z.object({
  query: withRangeLimit(z.object({
    months: z.coerce.number().int().min(1, "Months must be at least 1")
      .max(MAX_TREND_MONTHS, "Months cannot exceed 24").optional(),
    startDate: strictDateKey.optional(),
    endDate: strictDateKey.optional(),
  }), MAX_TREND_MONTHS),
});

export const topExpensesSchema = z.object({
  query: withRangeLimit(z.object({
    limit: z.coerce.number().int().min(1, "Limit must be at least 1")
      .max(20, "Limit cannot exceed 20").default(5),
    startDate: strictDateKey.optional(),
    endDate: strictDateKey.optional(),
  }), MAX_CUSTOM_ANALYTICS_MONTHS),
});
