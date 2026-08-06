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