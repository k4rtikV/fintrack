import express from "express";
import { rateLimit } from "express-rate-limit";

import { downloadMonthlyPdf } from "../controllers/report.controller.js";
import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";
import { monthlyReportSchema } from "../validators/report.validator.js";

const router = express.Router();

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: {
    success: false,
    message: "Too many monthly report downloads. Please try again shortly.",
  },
});

router.use(protect);
router.use(reportLimiter);

router.get(
  "/monthly-pdf",
  validate(monthlyReportSchema),
  downloadMonthlyPdf,
);

export default router;
