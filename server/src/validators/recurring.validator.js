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

const frequencySchema = z.enum([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);

const dateStringSchema = z
  .string()
  .trim()
  .min(1, "Date is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Date must be valid",
  });

const nullableDateStringSchema = z
  .union([dateStringSchema, z.null()])
  .optional();

const recurringBodySchema = {
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
  paymentMethod: paymentMethodSchema.default("OTHER"),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10, "A recurring transaction can have at most 10 tags")
    .default([]),
  frequency: frequencySchema,
  interval: z
    .number()
    .int("Interval must be a whole number")
    .min(1, "Interval must be at least 1")
    .max(365, "Interval is too large")
    .default(1),
  startDate: dateStringSchema,
  endDate: nullableDateStringSchema,
};

export const createRecurringSchema = z.object({
  body: z
    .object(recurringBodySchema)
    .refine(
      (data) =>
        !data.endDate ||
        new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(),
      {
        message: "End date cannot be before start date",
        path: ["endDate"],
      },
    ),
});

export const updateRecurringSchema = z.object({
  params: z.object({
    recurringId: objectIdString,
  }),

  body: z
    .object({
      accountId: recurringBodySchema.accountId.optional(),
      categoryId: recurringBodySchema.categoryId.optional(),
      type: recurringBodySchema.type.optional(),
      amount: recurringBodySchema.amount.optional(),
      title: recurringBodySchema.title.optional(),
      note: z.string().trim().max(500).optional(),
      paymentMethod: recurringBodySchema.paymentMethod.optional(),
      tags: z
        .array(z.string().trim().min(1).max(30))
        .max(10)
        .optional(),
      frequency: recurringBodySchema.frequency.optional(),
      interval: recurringBodySchema.interval.optional(),
      startDate: recurringBodySchema.startDate.optional(),
      endDate: nullableDateStringSchema,
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const recurringIdSchema = z.object({
  params: z.object({
    recurringId: objectIdString,
  }),
});
