import express from "express";

import {
  archiveAccount,
  createAccount,
  getAccount,
  getAccounts,
  updateAccount,
} from "../controllers/account.controller.js";

import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";

import {
  accountIdSchema,
  createAccountSchema,
  updateAccountSchema,
} from "../validators/account.validator.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .post(validate(createAccountSchema), createAccount)
  .get(getAccounts);

router
  .route("/:accountId")
  .get(validate(accountIdSchema), getAccount)
  .patch(validate(updateAccountSchema), updateAccount);

router.patch(
  "/:accountId/archive",
  validate(accountIdSchema),
  archiveAccount,
);

export default router;