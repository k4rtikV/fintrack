import express from "express";

import {
  changePassword,
  getSettings,
  updateNotificationSettings,
  updateProfileSettings,
} from "../controllers/settings.controller.js";
import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";
import {
  changePasswordSchema,
  updateNotificationSettingsSchema,
  updateProfileSettingsSchema,
} from "../validators/settings.validator.js";

const router = express.Router();

router.use(protect);

router.get("/", getSettings);

router.patch(
  "/profile",
  validate(updateProfileSettingsSchema),
  updateProfileSettings,
);

router.patch(
  "/notifications",
  validate(updateNotificationSettingsSchema),
  updateNotificationSettings,
);

router.patch(
  "/password",
  validate(changePasswordSchema),
  changePassword,
);

export default router;
