import express from "express";

import {
  createRecurring,
  deleteRecurring,
  getRecurring,
  getRecurringById,
  processRecurring,
  processSingleRecurring,
  updateRecurring,
} from "../controllers/recurring.controller.js";

import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";

import {
  createRecurringSchema,
  recurringIdSchema,
  updateRecurringSchema,
} from "../validators/recurring.validator.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .post(validate(createRecurringSchema), createRecurring)
  .get(getRecurring);

router.post("/process", processRecurring);

router.post(
  "/:recurringId/process",
  validate(recurringIdSchema),
  processSingleRecurring,
);

router
  .route("/:recurringId")
  .get(validate(recurringIdSchema), getRecurringById)
  .patch(validate(updateRecurringSchema), updateRecurring)
  .delete(validate(recurringIdSchema), deleteRecurring);

export default router;
