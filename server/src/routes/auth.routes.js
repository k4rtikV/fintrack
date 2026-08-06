import express from "express";

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

router.post(
  "/register",
  validate(registerSchema),
  register,
);

router.post(
  "/verify-registration-otp",
  validate(verifyRegistrationOtpSchema),
  verifyRegistration,
);

router.post(
  "/resend-registration-otp",
  validate(resendRegistrationOtpSchema),
  resendRegistration,
);

router.post(
  "/login",
  validate(loginSchema),
  login,
);

router.post(
  "/verify-login-otp",
  validate(verifyLoginOtpSchema),
  verifyLogin,
);

router.post(
  "/resend-login-otp",
  validate(resendLoginOtpSchema),
  resendLogin,
);

router.post("/logout", logout);

router.get("/me", protect, getCurrentUser);

export default router;