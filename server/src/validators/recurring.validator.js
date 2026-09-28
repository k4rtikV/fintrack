import { z } from "zod";

const objectIdString = z.string().trim().min(1, "ID is required").regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ID");
const transactionTypeSchema = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
const paymentMethodSchema = z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"]);
const frequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
const dateStringSchema = z.string().trim().min(1, "Date is required").refine((value) => !Number.isNaN(Date.parse(value)), { message: "Date must be valid" });
const nullableDateStringSchema = z.union([dateStringSchema, z.null()]).optional();

const recurringBodySchema = {
  accountId: objectIdString,
  destinationAccountId: objectIdString.optional(),
  categoryId: objectIdString.optional(),
  type: transactionTypeSchema,
  amount: z.number().positive("Amount must be greater than zero").finite("Amount must be a valid number"),
  title: z.string().trim().min(2, "Title must contain at least 2 characters").max(100, "Title cannot exceed 100 characters"),
  note: z.string().trim().max(500, "Note cannot exceed 500 characters").default(""),
  paymentMethod: paymentMethodSchema.default("OTHER"),
  tags: z.array(z.string().trim().min(1).max(30)).max(10, "An Autopay can have at most 10 tags").default([]),
  frequency: frequencySchema,
  interval: z.number().int("Interval must be a whole number").min(1, "Interval must be at least 1").max(365, "Interval is too large").default(1),
  startDate: dateStringSchema,
  endDate: nullableDateStringSchema,
};

const validateShape = (data, ctx) => {
  if (data.type === "TRANSFER") {
    if (!data.destinationAccountId) ctx.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Destination account is required for an Autopay transfer" });
    if (data.categoryId) ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Autopay transfers do not use categories" });
    if (data.destinationAccountId && data.destinationAccountId === data.accountId) ctx.addIssue({ code: "custom", path: ["destinationAccountId"], message: "Destination account must be different from source account" });
  } else if (!data.categoryId) {
    ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Category is required" });
  }
  if (data.endDate && new Date(data.endDate).getTime() < new Date(data.startDate).getTime()) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date cannot be before start date" });
  }
};

export const createRecurringSchema = z.object({ body: z.object(recurringBodySchema).superRefine(validateShape) });
export const updateRecurringSchema = z.object({
  params: z.object({ recurringId: objectIdString }),
  body: z.object({
    accountId: recurringBodySchema.accountId.optional(),
    destinationAccountId: z.union([objectIdString, z.null()]).optional(),
    categoryId: z.union([objectIdString, z.null()]).optional(),
    type: recurringBodySchema.type.optional(),
    amount: recurringBodySchema.amount.optional(),
    title: recurringBodySchema.title.optional(),
    note: z.string().trim().max(500).optional(),
    paymentMethod: recurringBodySchema.paymentMethod.optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    frequency: recurringBodySchema.frequency.optional(),
    interval: recurringBodySchema.interval.optional(),
    startDate: recurringBodySchema.startDate.optional(),
    endDate: nullableDateStringSchema,
    isActive: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, { message: "Provide at least one field to update" }),
});
export const recurringIdSchema = z.object({ params: z.object({ recurringId: objectIdString }) });
