import { z } from "zod";

const nameSchema = z
  .string({
    required_error: "Full name is required",
  })
  .trim()
  .min(2, "Full name must contain at least 2 characters")
  .max(60, "Full name cannot exceed 60 characters");

const emailSchema = z
  .string({
    required_error: "Email address is required",
  })
  .trim()
  .email("Enter a valid email address")
  .max(120, "Email address is too long")
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string({
    required_error: "Password is required",
  })
  .min(8, "Password must contain at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const registerSchema = z.object({
  body: z
    .object({
      fullName: nameSchema,
      email: emailSchema,
      password: passwordSchema,

      confirmPassword: z.string({
        required_error: "Please confirm your password",
      }),

      preferredCurrency: z
        .enum(["INR", "USD", "EUR", "GBP"])
        .default("INR"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,

    password: z
      .string({
        required_error: "Password is required",
      })
      .min(1, "Password is required"),
  }),
});