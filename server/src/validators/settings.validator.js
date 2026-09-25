import { z } from "zod";

export const updateProfileSettingsSchema = z.object({
  body: z.object({
    fullName: z
      .string({
        required_error: "Full name is required",
      })
      .trim()
      .min(2, "Full name must contain at least 2 characters")
      .max(60, "Full name cannot exceed 60 characters"),

    preferredCurrency: z.enum(["INR", "USD", "EUR", "GBP"]),

    timezone: z.enum([
      "Asia/Kolkata",
      "UTC",
      "Europe/London",
      "America/New_York",
      "Asia/Singapore",
    ]),
  }),
});

export const updateNotificationSettingsSchema = z.object({
  body: z.object({
    emailEnabled: z.boolean(),
    budgetAlerts: z.boolean(),
    goalAlerts: z.boolean(),
    recurringAlerts: z.boolean(),
  }),
});
