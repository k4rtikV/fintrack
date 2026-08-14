import { z } from "zod";

const sessionIdSchema = z
  .string()
  .uuid("Session ID is invalid");

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

export {
  revokeSessionSchema,
  securityActivitySchema,
};
