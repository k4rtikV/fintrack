import express from "express";

import {
  getSecurityActivity,
  getSessions,
  revokeOtherSessions,
  revokeSession,
} from "../controllers/security.controller.js";
import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";
import {
  revokeSessionSchema,
  securityActivitySchema,
} from "../validators/security.validator.js";

const router = express.Router();

router.use(protect);

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
