import { z } from "zod";

const objectIdString = z
  .string()
  .trim()
  .min(1, "ID is required")
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ID");

const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

const paymentMethodSchema = z.enum([
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
]);

const dateKeySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, "Date is invalid");

const transactionQuery = z
  .object({
    accountId: objectIdString.optional(),
    categoryId: objectIdString.optional(),
    type: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(transactionTypeSchema)
      .optional(),
    startDate: dateKeySchema.optional(),
    endDate: dateKeySchema.optional(),
    search: z.string().trim().max(100, "Search cannot exceed 100 characters").optional(),
    sortBy: z
      .enum(["transactionDate", "amount", "title", "createdAt"])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().min(1).max(100000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .superRefine((query, ctx) => {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be before start date",
      });
    }
  });

export const transactionQuerySchema = z.object({
  query: transactionQuery,
});

export const createTransactionSchema = z.object({
  body: z.object({
    accountId: objectIdString,

    categoryId: objectIdString,

    type: transactionTypeSchema,

    amount: z
      .number()
      .positive("Amount must be greater than zero")
      .finite("Amount must be a valid number"),

    title: z
      .string()
      .trim()
      .min(2, "Title must contain at least 2 characters")
      .max(100, "Title cannot exceed 100 characters"),

    note: z
      .string()
      .trim()
      .max(500, "Note cannot exceed 500 characters")
      .default(""),

    transactionDate: z.coerce.date(),

    paymentMethod: paymentMethodSchema.default("OTHER"),

    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(30),
      )
      .max(10, "A transaction can have at most 10 tags")
      .default([]),
  }),
});

export const updateTransactionSchema = z.object({
  params: z.object({
    transactionId: objectIdString,
  }),

  body: z
    .object({
      accountId: objectIdString.optional(),

      categoryId: objectIdString.optional(),

      type: transactionTypeSchema.optional(),

      amount: z
        .number()
        .positive("Amount must be greater than zero")
        .finite("Amount must be a valid number")
        .optional(),

      title: z
        .string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

      note: z
        .string()
        .trim()
        .max(500)
        .optional(),

      transactionDate: z.coerce.date().optional(),

      paymentMethod: paymentMethodSchema.optional(),

      tags: z
        .array(z.string().trim().min(1).max(30))
        .max(10)
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const transactionIdSchema = z.object({
  params: z.object({
    transactionId: objectIdString,
  }),
});
