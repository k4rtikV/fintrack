import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  getCurrentUser,
  login,
  logout,
  register,
  resendLogin,
  resendRegistration,
  verifyLogin,
  verifyRegistration,
} from "../controllers/auth.controller.js";

import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";

import {
  loginSchema,
  registerSchema,
  resendLoginOtpSchema,
  resendRegistrationOtpSchema,
  verifyLoginOtpSchema,
  verifyRegistrationOtpSchema,
} from "../validators/auth.validator.js";

const router = express.Router();

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
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

router.post(
  "/register",
  authAttemptLimiter,
  validate(registerSchema),
  register,
);

router.post(
  "/verify-registration-otp",
  authAttemptLimiter,
  validate(verifyRegistrationOtpSchema),
  verifyRegistration,
);

router.post(
  "/resend-registration-otp",
  authAttemptLimiter,
  validate(resendRegistrationOtpSchema),
  resendRegistration,
);

router.post(
  "/login",
  authAttemptLimiter,
  validate(loginSchema),
  login,
);

router.post(
  "/verify-login-otp",
  authAttemptLimiter,
  validate(verifyLoginOtpSchema),
  verifyLogin,
);

router.post(
  "/resend-login-otp",
  authAttemptLimiter,
  validate(resendLoginOtpSchema),
  resendLogin,
);

router.post("/logout", logout);

router.get("/me", protect, getCurrentUser);

export default router;
