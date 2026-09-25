import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  getCurrentUser,
  googleAuthenticate,
  googleConfig,
  linkLegacyGoogle,
  logout,
} from "../controllers/auth.controller.js";
import protect from "../middleware/auth.middleware.js";
import { requireApprovedBrowserOrigin } from "../middleware/csrf.middleware.js";
import validate from "../middleware/validate.js";
import {
  googleAuthenticationSchema,
  legacyGoogleLinkSchema,
} from "../validators/auth.validator.js";

const router = express.Router();

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const authRateLimitMax = parsePositiveInteger(
  process.env.AUTH_RATE_LIMIT_MAX,
  60,
);
const authRateLimitWindowMinutes = parsePositiveInteger(
  process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES,
  15,
);

const authAttemptLimiter = rateLimit({
  windowMs: authRateLimitWindowMinutes * 60 * 1000,
  limit: authRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many authentication attempts from this network. Please try again shortly.",
  },
});

const legacyLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many legacy account migration attempts. Please try again later.",
  },
});

router.get("/google/config", googleConfig);

router.post(
  "/google",
  requireApprovedBrowserOrigin,
  authAttemptLimiter,
  validate(googleAuthenticationSchema),
  googleAuthenticate,
);

router.post(
  "/google/link-legacy",
  requireApprovedBrowserOrigin,
  authAttemptLimiter,
  legacyLinkLimiter,
  validate(legacyGoogleLinkSchema),
  linkLegacyGoogle,
);

router.post("/logout", protect, logout);
router.get("/me", protect, getCurrentUser);

export default router;
