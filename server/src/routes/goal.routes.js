import express from "express";

import {
  createGoal,
  deleteGoal,
  getGoal,
  getGoals,
  updateGoal,
} from "../controllers/goal.controller.js";

import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";

import {
  createGoalSchema,
  goalIdSchema,
  updateGoalSchema,
} from "../validators/goal.validator.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .post(validate(createGoalSchema), createGoal)
  .get(getGoals);

router
  .route("/:goalId")
  .get(validate(goalIdSchema), getGoal)
  .patch(validate(updateGoalSchema), updateGoal)
  .delete(validate(goalIdSchema), deleteGoal);

export default router;
