import express from "express";

import {
  archiveCategory,
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
} from "../controllers/category.controller.js";

import { requireAppUnlocked } from "../middleware/appLock.middleware.js";
import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";

import {
  categoryIdSchema,
  createCategorySchema,
  updateCategorySchema,
} from "../validators/category.validator.js";

const router = express.Router();

router.use(protect, requireAppUnlocked);

router
  .route("/")
  .post(validate(createCategorySchema), createCategory)
  .get(getCategories);

router
  .route("/:categoryId")
  .get(validate(categoryIdSchema), getCategory)
  .patch(validate(updateCategorySchema), updateCategory);

router.patch(
  "/:categoryId/archive",
  validate(categoryIdSchema),
  archiveCategory,
);

export default router;