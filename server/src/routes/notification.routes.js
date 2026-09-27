import express from "express";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { requireAppUnlocked } from "../middleware/appLock.middleware.js";
import protect from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protect, requireAppUnlocked);

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);

export default router;
