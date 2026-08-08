import express from "express";

import {
  createBudget,
  deleteBudget,
  getBudget,
  getBudgets,
  updateBudget,
} from "../controllers/budget.controller.js";

import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";

import {
  budgetIdSchema,
  budgetListQuerySchema,
  createBudgetSchema,
  updateBudgetSchema,
} from "../validators/budget.validator.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .post(validate(createBudgetSchema), createBudget)
  .get(validate(budgetListQuerySchema), getBudgets);

router
  .route("/:budgetId")
  .get(validate(budgetIdSchema), getBudget)
  .patch(validate(updateBudgetSchema), updateBudget)
  .delete(validate(budgetIdSchema), deleteBudget);

export default router;
