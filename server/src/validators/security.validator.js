import { z } from "zod";

const sessionIdSchema = z
  .string()
  .uuid("Session ID is invalid");

const pinSchemaValue = z
  .string({ required_error: "6-digit PIN is required" })
  .regex(/^\d{6}$/, "PIN must contain exactly 6 digits");

const revokeSessionSchema = z.object({
  params: z.object({
    sessionId: sessionIdSchema,
  }),
});

const securityActivitySchema = z.object({
  query: z.object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20),
  }),
});

const pinEnrollSchema = z.object({
  body: z.object({
    pin: pinSchemaValue,
  }),
});

const pinUnlockSchema = z.object({
  body: z.object({
    pin: pinSchemaValue,
  }),
});

const pinChangeSchema = z.object({
  body: z
    .object({
      currentPin: pinSchemaValue,
      newPin: pinSchemaValue,
    })
    .refine((value) => value.currentPin !== value.newPin, {
      path: ["newPin"],
      message: "New PIN must be different from the current PIN",
    }),
});

const pinResetSchema = z.object({
  body: z.object({
    newPin: pinSchemaValue,
  }),
});

export {
  pinChangeSchema,
  pinEnrollSchema,
  pinResetSchema,
  pinUnlockSchema,
  revokeSessionSchema,
  securityActivitySchema,
};
