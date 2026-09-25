import { z } from "zod";

const googleCredentialSchemaValue = z
  .string({
    required_error: "Google credential is required",
  })
  .trim()
  .min(100, "Google credential is invalid")
  .max(16_384, "Google credential is invalid");

export const googleAuthenticationSchema = z.object({
  body: z.object({
    credential: googleCredentialSchemaValue,
  }),
});

export const legacyGoogleLinkSchema = z.object({
  body: z.object({
    credential: googleCredentialSchemaValue,
    password: z
      .string({
        required_error: "Current FinTrack password is required for migration",
      })
      .min(1, "Current FinTrack password is required for migration")
      .max(128, "Password is too long"),
  }),
});
