import { z } from "zod";

const accountTypeSchema = z.enum([
  "BANK",
  "CASH",
  "CARD",
  "WALLET",
  "INVESTMENT",
]);

const currencySchema = z.enum(["INR", "USD", "EUR", "GBP"]);

export const createAccountSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Account name must contain at least 2 characters")
      .max(60, "Account name cannot exceed 60 characters"),

    type: accountTypeSchema,

    balance: z
      .number()
      .finite("Balance must be a valid number")
      .default(0),

    currency: currencySchema.default("INR"),

    color: z
      .string()
      .trim()
      .min(1, "Color is required")
      .max(30, "Color value is too long")
      .default("slate"),

    icon: z
      .string()
      .trim()
      .min(1, "Icon is required")
      .max(40, "Icon value is too long")
      .default("wallet"),
  }),
});

export const updateAccountSchema = z.object({
  params: z.object({
    accountId: z.string().min(1, "Account ID is required"),
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Account name must contain at least 2 characters")
        .max(60, "Account name cannot exceed 60 characters")
        .optional(),

      type: accountTypeSchema.optional(),

      currency: currencySchema.optional(),

      color: z
        .string()
        .trim()
        .min(1, "Color is required")
        .max(30, "Color value is too long")
        .optional(),

      icon: z
        .string()
        .trim()
        .min(1, "Icon is required")
        .max(40, "Icon value is too long")
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const accountIdSchema = z.object({
  params: z.object({
    accountId: z.string().min(1, "Account ID is required"),
  }),
});