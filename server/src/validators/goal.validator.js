import { z } from "zod";

const objectIdString = z
  .string()
  .trim()
  .min(1, "ID is required")
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ID");

const dateStringSchema = z
  .string()
  .trim()
  .min(1, "Target date is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Target date must be a valid date",
  });

const goalNameSchema = z
  .string()
  .trim()
  .min(2, "Goal name must contain at least 2 characters")
  .max(80, "Goal name cannot exceed 80 characters");

const amountSchema = z
  .number()
  .positive("Target amount must be greater than zero")
  .finite("Target amount must be a valid number");

const currentAmountSchema = z
  .number()
  .min(0, "Current amount cannot be negative")
  .finite("Current amount must be a valid number");

const noteSchema = z
  .string()
  .trim()
  .max(300, "Note cannot exceed 300 characters");

const colorSchema = z
  .string()
  .trim()
  .min(1, "Color is required")
  .max(30, "Color value is too long");

const iconSchema = z
  .string()
  .trim()
  .min(1, "Icon is required")
  .max(40, "Icon value is too long");

export const createGoalSchema = z.object({
  body: z.object({
    name: goalNameSchema,
    targetAmount: amountSchema,
    currentAmount: currentAmountSchema.default(0),
    targetDate: dateStringSchema,
    note: noteSchema.default(""),
    color: colorSchema.default("emerald"),
    icon: iconSchema.default("target"),
  }),
});

export const updateGoalSchema = z.object({
  params: z.object({
    goalId: objectIdString,
  }),

  body: z
    .object({
      name: goalNameSchema.optional(),
      targetAmount: amountSchema.optional(),
      currentAmount: currentAmountSchema.optional(),
      targetDate: dateStringSchema.optional(),
      note: noteSchema.optional(),
      color: colorSchema.optional(),
      icon: iconSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const goalIdSchema = z.object({
  params: z.object({
    goalId: objectIdString,
  }),
});
