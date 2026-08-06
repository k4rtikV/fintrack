import express from "express";

import {
  getAccountSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getOverview,
  getTopExpenses,
} from "../controllers/analytics.controller.js";

import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";

import {
  analyticsDateRangeSchema,
  monthlyTrendSchema,
  topExpensesSchema,
} from "../validators/analytics.validator.js";

const router = express.Router();

router.use(protect);

router.get(
  "/overview",
  validate(analyticsDateRangeSchema),
  getOverview,
);

router.get(
  "/category-breakdown",
  validate(analyticsDateRangeSchema),
  getCategoryBreakdown,
);

router.get(
  "/monthly-trend",
  validate(monthlyTrendSchema),
  getMonthlyTrend,
);

router.get(
  "/top-expenses",
  validate(topExpensesSchema),
  getTopExpenses,
);

router.get(
  "/account-summary",
  getAccountSummary,
);

export default router;