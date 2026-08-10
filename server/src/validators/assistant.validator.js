import { z } from "zod";

const chatHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .trim()
    .min(1, "History message cannot be empty")
    .max(2500, "History message is too long"),
});

export const assistantChatSchema = z.object({
  body: z.object({
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(1200, "Message cannot exceed 1200 characters"),

    history: z
      .array(chatHistoryItemSchema)
      .max(10, "Chat history cannot contain more than 10 messages")
      .default([]),
  }),
});
