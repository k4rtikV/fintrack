import { z } from "zod";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthlyReportSchema = z.object({
  query: z.object({
    month: z
      .string()
      .regex(monthPattern, "Month must use YYYY-MM format")
      .optional(),
  }),
});

export { monthlyReportSchema };
