import express from "express";

import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  getTransactions,
  updateTransaction,
} from "../controllers/transaction.controller.js";

import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";

import {
  createTransactionSchema,
  transactionIdSchema,
  transactionQuerySchema,
  updateTransactionSchema,
} from "../validators/transaction.validator.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .post(validate(createTransactionSchema), createTransaction)
  .get(validate(transactionQuerySchema), getTransactions);

router
  .route("/:transactionId")
  .get(validate(transactionIdSchema), getTransaction)
  .patch(validate(updateTransactionSchema), updateTransaction)
  .delete(validate(transactionIdSchema), deleteTransaction);

export default router;