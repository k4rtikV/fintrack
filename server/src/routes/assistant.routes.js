import express from "express";
import { rateLimit } from "express-rate-limit";

import { chatWithAssistant } from "../controllers/assistant.controller.js";
import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";
import { assistantChatSchema } from "../validators/assistant.validator.js";

const router = express.Router();

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
};

const assistantRateLimitMax = parsePositiveInteger(
  process.env.ASSISTANT_RATE_LIMIT_MAX,
  120,
);

const assistantRateLimitWindowMinutes = parsePositiveInteger(
  process.env.ASSISTANT_RATE_LIMIT_WINDOW_MINUTES,
  15,
);

const assistantLimiter = rateLimit({
  windowMs: assistantRateLimitWindowMinutes * 60 * 1000,
  limit: assistantRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  // This route is protected before the limiter runs, so requests can be
  // limited per FinTrack account instead of sharing one IP-based bucket.
  keyGenerator: (req) => String(req.user._id),

  message: {
    success: false,
    message:
      "Too many AI Assistant requests from this FinTrack account. Please try again shortly.",
  },
});

router.use(protect);
router.use(assistantLimiter);

router.post("/chat", validate(assistantChatSchema), chatWithAssistant);

export default router;
