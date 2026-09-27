import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  changePin,
  disablePin,
  enrollPin,
  getPinStatus,
  getSecurityActivity,
  getSessions,
  lockPin,
  resetPin,
  revokeOtherSessions,
  revokeSession,
  unlockPin,
} from "../controllers/security.controller.js";
import {
  requireAppUnlocked,
  requireRecentStrongAuth,
} from "../middleware/appLock.middleware.js";
import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";
import {
  pinChangeSchema,
  pinEnrollSchema,
  pinResetSchema,
  pinUnlockSchema,
  revokeSessionSchema,
  securityActivitySchema,
} from "../validators/security.validator.js";

const router = express.Router();

const pinAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many PIN unlock attempts from this network. Please try again later.",
  },
});

router.use(protect);

// These endpoints must remain reachable while the application is PIN-locked.
router.get("/pin/status", getPinStatus);
router.post(
  "/pin/unlock",
  pinAttemptLimiter,
  validate(pinUnlockSchema),
  unlockPin,
);
router.post(
  "/pin/reset",
  requireRecentStrongAuth,
  validate(pinResetSchema),
  resetPin,
);
router.delete(
  "/pin",
  requireRecentStrongAuth,
  disablePin,
);

router.post(
  "/pin/enroll",
  requireAppUnlocked,
  requireRecentStrongAuth,
  validate(pinEnrollSchema),
  enrollPin,
);
router.post(
  "/pin/change",
  requireAppUnlocked,
  requireRecentStrongAuth,
  validate(pinChangeSchema),
  changePin,
);
router.post("/pin/lock", requireAppUnlocked, lockPin);

// Session/activity management exposes private account security information and
// therefore requires the trusted-device lock to be open.
router.use(requireAppUnlocked);

router.get("/sessions", getSessions);
router.delete(
  "/sessions/:sessionId",
  validate(revokeSessionSchema),
  revokeSession,
);
router.post(
  "/sessions/revoke-others",
  revokeOtherSessions,
);
router.get(
  "/activity",
  validate(securityActivitySchema),
  getSecurityActivity,
);

export default router;
