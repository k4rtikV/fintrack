import { z } from "zod";

const passwordSchema = z
  .string({
    required_error: "New password is required",
  })
  .min(8, "Password must contain at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

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

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({
          required_error: "Current password is required",
        })
        .min(1, "Current password is required"),

      newPassword: passwordSchema,

      confirmPassword: z
        .string({
          required_error: "Please confirm your new password",
        })
        .min(1, "Please confirm your new password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "New passwords do not match",
      path: ["confirmPassword"],
    }),
});
