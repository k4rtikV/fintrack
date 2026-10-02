import { getInstrumentHistory, getInstrumentResearch, getInstrumentNews, getInvestmentCalendar, getInstrumentOverview } from "../services/investmentResearch.service.js";
import { getPortfolioAnalyticsForUser } from "../services/investmentAnalytics.service.js";
import {
  addWatchlistItemForUser,
  createInvestmentTradeForUser,
  getInstrumentQuoteForUser,
  getInvestmentAccountsForUser,
  getInvestmentTradesForUser,
  getPortfolioForUser,
  getWatchlistForUser,
  removeWatchlistItemForUser,
  searchInvestments,
} from "../services/investment.service.js";
import { getMarketDataStatus } from "../services/marketData.service.js";

const marketStatus = async (req, res) => {
  res.status(200).json({ success: true, data: { market: await getMarketDataStatus() } });
};

const searchInstruments = async (req, res) => {
  const result = await searchInvestments(req.validatedData.query);
  res.status(200).json({
    success: true,
    results: result.instruments.length,
    data: { instruments: result.instruments },
    pagination: result.pagination,
  });
};

const getInvestmentAccounts = async (req, res) => {
  const accounts = await getInvestmentAccountsForUser({ userId: req.user._id });
  res.status(200).json({ success: true, results: accounts.length, data: { accounts } });
};

const createTrade = async (req, res) => {
  const trade = await createInvestmentTradeForUser({
    userId: req.user._id,
    ...req.validatedData.body,
  });
  res.status(201).json({
    success: true,
    message: `${trade.type === "BUY" ? "Buy" : "Sell"} recorded successfully`,
    data: { trade },
  });
};

const getPortfolio = async (req, res) => {
  const portfolio = await getPortfolioForUser({ userId: req.user._id });
  res.status(200).json({ success: true, data: portfolio });
};

const getTrades = async (req, res) => {
  const trades = await getInvestmentTradesForUser({
    userId: req.user._id,
    limit: req.validatedData.query.limit,
  });
  res.status(200).json({ success: true, results: trades.length, data: { trades } });
};

const getWatchlist = async (req, res) => {
  const watchlist = await getWatchlistForUser({ userId: req.user._id });
  res.status(200).json({ success: true, data: watchlist });
};

const addWatchlistItem = async (req, res) => {
  const item = await addWatchlistItemForUser({
    userId: req.user._id,
    instrumentId: req.validatedData.body.instrumentId,
  });
  res.status(201).json({ success: true, message: "Added to watchlist", data: { item } });
};

const removeWatchlistItem = async (req, res) => {
  await removeWatchlistItemForUser({
    userId: req.user._id,
    watchlistId: req.validatedData.params.watchlistId,
  });
  res.status(200).json({ success: true, message: "Removed from watchlist" });
};

const getInstrumentQuote = async (req, res) => {
  const result = await getInstrumentQuoteForUser({
    instrumentId: req.validatedData.params.instrumentId,
  });
  res.status(200).json({ success: true, data: result });
};

const getStockOverview = async (req, res) => res.status(200).json({ success: true, data: await getInstrumentOverview({ instrumentId: req.validatedData.params.instrumentId, forceRefresh: req.validatedData.query.refresh }) });
const getStockHistory = async (req, res) => res.status(200).json({ success: true, data: await getInstrumentHistory({ instrumentId: req.validatedData.params.instrumentId, period: req.validatedData.query.period, forceRefresh: req.validatedData.query.refresh }) });
const getStockResearch = async (req, res) => res.status(200).json({ success: true, data: await getInstrumentResearch({ instrumentId: req.validatedData.params.instrumentId }) });
const getStockNews = async (req, res) => res.status(200).json({ success: true, data: await getInstrumentNews({ instrumentId: req.validatedData.params.instrumentId }) });
const getCalendar = async (req, res) => res.status(200).json({ success: true, data: await getInvestmentCalendar({ userId: req.user._id, forceRefresh: req.validatedData.query.refresh }) });
const getPortfolioAnalytics = async (req, res) => res.status(200).json({ success: true, data: await getPortfolioAnalyticsForUser({ userId: req.user._id }) });

export {
  getStockOverview,
  getStockHistory,
  getStockResearch,
  getStockNews,
  getCalendar,
  getPortfolioAnalytics,
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
};
