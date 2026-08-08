import { z } from "zod";

const objectIdString = z
  .string()
  .trim()
  .min(1, "ID is required")
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ID");

const monthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM format");

export const createBudgetSchema = z.object({
  body: z.object({
    categoryId: objectIdString,

    month: monthSchema,

    amount: z
      .number()
      .positive("Budget amount must be greater than zero")
      .finite("Budget amount must be a valid number"),

    note: z
      .string()
      .trim()
      .max(300, "Note cannot exceed 300 characters")
      .default(""),
  }),
});

export const updateBudgetSchema = z.object({
  params: z.object({
    budgetId: objectIdString,
  }),

  body: z
    .object({
      amount: z
        .number()
        .positive("Budget amount must be greater than zero")
        .finite("Budget amount must be a valid number")
        .optional(),

      note: z
        .string()
        .trim()
        .max(300, "Note cannot exceed 300 characters")
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const budgetIdSchema = z.object({
  params: z.object({
    budgetId: objectIdString,
  }),
});

export const budgetListQuerySchema = z.object({
  query: z.object({
    month: monthSchema.optional(),
  }),
});
