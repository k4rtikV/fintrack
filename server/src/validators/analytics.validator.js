import { z } from "zod";

const dateRangeQuery = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) {
        return true;
      }

      return data.startDate <= data.endDate;
    },
    {
      message: "Start date cannot be after end date",
      path: ["startDate"],
    },
  );

export const analyticsDateRangeSchema = z.object({
  query: dateRangeQuery,
});

export const monthlyTrendSchema = z.object({
  query: z.object({
    months: z.coerce
      .number()
      .int()
      .min(1, "Months must be at least 1")
      .max(24, "Months cannot exceed 24")
      .default(6),
  }),
});

export const topExpensesSchema = z.object({
  query: z.object({
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(20, "Limit cannot exceed 20")
      .default(5),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
});