import express from "express";
import { rateLimit } from "express-rate-limit";
import protect from "../middleware/auth.middleware.js";
import { requireAppUnlocked } from "../middleware/appLock.middleware.js";
import validate from "../middleware/validate.js";
import { previewStatement, prepareStatement, commitStatement, importHistory } from "../controllers/statementImport.controller.js";
import { prepareStatementSchema, commitStatementSchema } from "../validators/statementImport.validator.js";

const router = express.Router();
router.use(protect, requireAppUnlocked);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many statement import requests. Try again shortly." },
});
router.use(limiter);
router.get("/history", importHistory);
router.post("/preview", previewStatement);
router.post("/prepare", validate(prepareStatementSchema), prepareStatement);
router.post("/commit", validate(commitStatementSchema), commitStatement);
export default router;
