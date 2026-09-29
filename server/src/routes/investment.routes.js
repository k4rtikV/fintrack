import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  addWatchlistItem,
  createTrade,
  getInstrumentQuote,
  getInvestmentAccounts,
  getPortfolio,
  getTrades,
  getWatchlist,
  marketStatus,
  removeWatchlistItem,
  searchInstruments,
} from "../controllers/investment.controller.js";
import { requireAppUnlocked } from "../middleware/appLock.middleware.js";
import protect from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.js";
import {
  instrumentIdSchema,
  marketSearchSchema,
  tradeListSchema,
  tradeSchema,
  watchlistCreateSchema,
  watchlistIdSchema,
} from "../validators/investment.validator.js";

const router = express.Router();

const marketLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 90,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: {
    success: false,
    message: "Too many market-data requests. Please wait a moment and try again.",
  },
});

router.use(protect, requireAppUnlocked);

router.get("/market/status", marketStatus);
router.get("/market/search", marketLimiter, validate(marketSearchSchema), searchInstruments);
router.get("/market/quote/:instrumentId", marketLimiter, validate(instrumentIdSchema), getInstrumentQuote);

router.get("/accounts", getInvestmentAccounts);
router.get("/portfolio", marketLimiter, getPortfolio);
router.get("/trades", validate(tradeListSchema), getTrades);
router.post("/trades", validate(tradeSchema), createTrade);
router.get("/watchlist", marketLimiter, getWatchlist);
router.post("/watchlist", validate(watchlistCreateSchema), addWatchlistItem);
router.delete("/watchlist/:watchlistId", validate(watchlistIdSchema), removeWatchlistItem);

export default router;
