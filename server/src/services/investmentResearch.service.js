import axios from "axios";
import mongoose from "mongoose";

import InvestmentInstrument from "../models/InvestmentInstrument.js";
import InvestmentHolding from "../models/InvestmentHolding.js";
import InvestmentWatchlistItem from "../models/InvestmentWatchlistItem.js";
import AppError from "../utils/AppError.js";
import { normalizeCandles } from "../utils/investmentHistory.js";
import { researchLinksForInstrument } from "../utils/investmentResearchLinks.js";
import { getQuotesForInstruments, serializeInstrument } from "./marketData.service.js";

// Market research is strictly read-only. Never use provider holdings, funds, positions or orders.
const BASE = "https://api.upstox.com";
const TIMEOUT = 8000;
const MAX_CACHE_ENTRIES = 140;
const responseCache = new Map();
const numeric = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
const periods = Object.freeze({
  "1D": { unit: "minutes", interval: 5, lookback: 8, days: 1, ttl: 60000 },
  "5D": { unit: "minutes", interval: 15, lookback: 14, days: 5, ttl: 120000 },
  "1M": { unit: "days", interval: 1, lookback: 32, ttl: 300000 },
  "3M": { unit: "days", interval: 1, lookback: 95, ttl: 600000 },
  "6M": { unit: "days", interval: 1, lookback: 190, ttl: 600000 },
  "1Y": { unit: "weeks", interval: 1, lookback: 375, ttl: 900000 },
  "MAX": { unit: "months", interval: 1, from: "2000-01-01", ttl: 60 * 60 * 1000 },
});

const token = () => {
  const value = String(process.env.UPSTOX_ANALYTICS_TOKEN || "").trim();
  if (!value) throw new AppError("Upstox market data is not configured", 503, { code: "MARKET_DATA_NOT_CONFIGURED" });
  return value;
};
const providerError = (error) => {
  if (error instanceof AppError) return error;
  if ([401, 403].includes(error?.response?.status)) return new AppError("Upstox market-data token expired or rejected", 503, { code: "MARKET_DATA_AUTH_FAILED" });
  if (error?.response?.status === 429) return new AppError("Upstox is rate limiting market research", 503, { code: "MARKET_DATA_RATE_LIMITED" });
  return new AppError("Upstox market research is temporarily unavailable", 502, { code: "MARKET_RESEARCH_UNAVAILABLE" });
};
const request = async (path, params) => {
  try {
    const response = await axios.get(`${BASE}${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token()}` },
      params, timeout: TIMEOUT,
    });
    if (response.data?.status === "error") throw new Error("Provider reported error");
    return response.data?.data;
  } catch (error) { throw providerError(error); }
};
const cached = async (key, ttl, load, { forceRefresh = false } = {}) => {
  const existing = responseCache.get(key);
  if (!forceRefresh && existing?.data !== undefined && Date.now() < existing.expiresAt) return existing.data;
  if (existing?.pending) return existing.pending;
  const pending = load().then((data) => {
    if (responseCache.size >= MAX_CACHE_ENTRIES) responseCache.delete(responseCache.keys().next().value);
    // Recheck incomplete company research sooner instead of caching partial failures for hours.
    const effectiveTtl = Array.isArray(data?.unavailable) && data.unavailable.length ? Math.min(ttl, 5 * 60 * 1000) : ttl;
    responseCache.set(key, { data, expiresAt: Date.now() + effectiveTtl });
    return data;
  }).catch((error) => {
    if (forceRefresh) {
      // Manual refresh must report provider errors, not pretend cached data is fresh.
      if (existing?.data !== undefined) responseCache.set(key, existing);
      else responseCache.delete(key);
      throw error;
    }
    if (existing?.data !== undefined) {
      responseCache.set(key, { ...existing, expiresAt: Date.now() + Math.min(ttl, 60000) });
      return Array.isArray(existing.data) ? existing.data : {
        ...existing.data, stale: true, warning: "Showing cached research because the provider is unavailable",
      };
    }
    responseCache.delete(key);
    throw error;
  });
  responseCache.set(key, { ...(existing || {}), pending });
  return pending;
};
const lookupInstrument = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid instrument ID", 400);
  const instrument = await InvestmentInstrument.findById(id);
  if (!instrument) throw new AppError("Instrument not found", 404);
  return instrument;
};
const istDay = (value = Date.now()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
}).format(value);
const dayOffset = (isoDay, days) => {
  const date = new Date(`${isoDay}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const getInstrumentHistory = async ({ instrumentId, period = "1M", forceRefresh = false }) => {
  const instrument = await lookupInstrument(instrumentId);
  const config = periods[period];
  if (!config) throw new AppError("Unsupported chart period", 400);
  const today = istDay();
  return cached(`history:${instrument.instrumentKey}:${period}:${today}`, config.ttl, async () => {
    const key = encodeURIComponent(instrument.instrumentKey);
    const historicalPath = `/v3/historical-candle/${key}/${config.unit}/${config.interval}/${today}/${config.from || dayOffset(today, -config.lookback)}`;
    if (!config.days) {
      const data = await request(historicalPath);
      return { instrument: serializeInstrument(instrument), period, candles: normalizeCandles(data?.candles, config), source: "Upstox Historical V3", fetchedAt: new Date().toISOString() };
    }
    // Historical V3 is not a substitute for the current session's intraday candles.
    // Use both sources for 1D/5D and retain the latest completed session when
    // the current session is closed, on a holiday, or temporarily unavailable.
    const intradayPath = `/v3/historical-candle/intraday/${key}/${config.unit}/${config.interval}`;
    const [historical, intraday] = await Promise.allSettled([request(historicalPath), request(intradayPath)]);
    if (historical.status === "rejected" && intraday.status === "rejected") throw historical.reason;
    const candles = normalizeCandles([
      ...(historical.status === "fulfilled" ? historical.value?.candles || [] : []),
      ...(intraday.status === "fulfilled" ? intraday.value?.candles || [] : []),
    ], config);
    return { instrument: serializeInstrument(instrument), period, candles, source: "Upstox Historical/Intraday V3", fetchedAt: new Date().toISOString() };
  }, { forceRefresh });
};
const getInstrumentResearch = async ({ instrumentId }) => {
  const instrument = await lookupInstrument(instrumentId);
  const isin = instrument.isin;
  return cached(`research:${isin}`, 6 * 60 * 60 * 1000, async () => {
    const paths = ["profile", "key-ratios", "income-statement", "balance-sheet", "cash-flow", "share-holdings", "corporate-actions"];
    const results = await Promise.allSettled(paths.map((part) => request(`/v2/fundamentals/${encodeURIComponent(isin)}/${part}`, part === "income-statement" ? { type: "consolidated", time_period: "yearly" }
      : ["balance-sheet", "cash-flow"].includes(part) ? { type: "consolidated" } : undefined)));
    if (results.every((entry) => entry.status === "rejected")) throw results[0].reason;
    const result = (index) => results[index].status === "fulfilled" ? results[index].value : null;
    return {
      instrument: serializeInstrument(instrument),
      profile: result(0), ratios: Array.isArray(result(1)) ? result(1).slice(0, 25) : [],
      incomeStatement: result(2), balanceSheet: result(3), cashFlow: result(4),
      shareholding: Array.isArray(result(5)) ? result(5).slice(0, 20) : [],
      corporateActions: Array.isArray(result(6)) ? result(6).slice(0, 50) : [],
      unavailable: paths.filter((_, i) => results[i].status === "rejected"),
      fetchedAt: new Date().toISOString(), source: "Upstox Fundamentals",
    };
  });
};
const safeUrl = (value) => {
  try { const url = new URL(String(value)); return url.protocol === "https:" ? url.href : null; }
  catch { return null; }
};
const getInstrumentNews = async ({ instrumentId }) => {
  const instrument = await lookupInstrument(instrumentId);
  return cached(`news:${instrument.instrumentKey}`, 15 * 60 * 1000, async () => {
    const data = await request("/v2/news", { category: "instrument_keys", instrument_keys: instrument.instrumentKey, page_number: 1, page_size: 12 });
    const items = Array.isArray(data?.[instrument.instrumentKey]) ? data[instrument.instrumentKey] : [];
    return {
      items: items.filter((item) => safeUrl(item.article_link)).slice(0, 12).map((item) => ({
        heading: String(item.heading || "").slice(0, 300), summary: String(item.summary || "").slice(0, 1000),
        link: safeUrl(item.article_link), publishedAt: Number.isFinite(Number(item.published_time)) ? new Date(Number(item.published_time)).toISOString() : null,
      })), fetchedAt: new Date().toISOString(), source: "Upstox News",
    };
  });
};
const getInvestmentCalendar = async ({ userId, forceRefresh = false }) => {
  const [holdings, watchlist] = await Promise.all([
    InvestmentHolding.find({ user: userId, quantity: { $gt: 0 } }).populate("instrument", "isin tradingSymbol exchange").limit(30).lean(),
    InvestmentWatchlistItem.find({ user: userId }).populate("instrument", "isin tradingSymbol exchange").limit(30).lean(),
  ]);
  const byIsin = new Map();
  for (const record of [...holdings, ...watchlist]) {
    if (record.instrument?.isin && !byIsin.has(record.instrument.isin)) byIsin.set(record.instrument.isin, record.instrument);
  }
  const tracked = [...byIsin.values()].slice(0, 10);
  const today = istDay();
  const [holidays, ...actions] = await Promise.allSettled([
    cached(`holidays:${today.slice(0, 4)}`, 12 * 60 * 60 * 1000, () => request("/v2/market/holidays"), { forceRefresh }),
    ...tracked.map((instrument) => cached(`calendar-action:${instrument.isin}`, 6 * 60 * 60 * 1000,
      () => request(`/v2/fundamentals/${encodeURIComponent(instrument.isin)}/corporate-actions`), { forceRefresh })),
  ]);
  const holidayData = holidays.status === "fulfilled" && Array.isArray(holidays.value) ? holidays.value : [];
  const marketHolidays = holidayData.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item?.date || "") && item.date >= today &&
    (item.closed_exchanges || []).some((exchange) => ["NSE", "BSE"].includes(exchange))).slice(0, 25).map((item) => ({
    date: item.date, name: String(item.description || "Market holiday"), type: "MARKET_HOLIDAY",
    exchanges: item.closed_exchanges.filter((exchange) => ["NSE", "BSE"].includes(exchange)),
  }));
  const corporateActions = tracked.flatMap((instrument, index) => {
    const data = actions[index];
    if (data?.status !== "fulfilled" || !Array.isArray(data.value)) return [];
    return data.value.slice(0, 20).map((item) => ({
      type: "CORPORATE_ACTION", symbol: instrument.tradingSymbol,
      exchange: instrument.exchange, name: String(item.name || "Corporate action"),
      dateLabel: String(item.expiry_date || ""), amount: numeric(item.amount),
      ratio: item.ratio ? String(item.ratio) : null,
      details: Array.isArray(item.event_details) ? item.event_details.slice(0, 10).map((detail) => ({ name: String(detail.name || ""), value: String(detail.value || "") })) : [],
    }));
  });
  return {
    marketHolidays, corporateActions, trackedInstruments: tracked.length,
    availability: {
      holidays: holidays.status === "fulfilled" ? "AVAILABLE" : "UNAVAILABLE",
      corporateActions: actions.some((item) => item.status === "rejected") ? "PARTIAL" : "AVAILABLE",
    },
    warning: holidays.status === "rejected" || actions.some((result) => result.status === "rejected") ? "Some calendar data is currently unavailable" : null,
    fetchedAt: new Date().toISOString(),
  };
};
const getInstrumentOverview = async ({ instrumentId, forceRefresh = false }) => {
  const instrument = await lookupInstrument(instrumentId);
  const quotes = await getQuotesForInstruments({ instruments: [instrument], allowStale: true, forceRefresh });
  return { instrument: serializeInstrument(instrument), quote: quotes.quotes[0] || null, market: { live: Boolean(quotes.live), warning: quotes.warning || null }, research: researchLinksForInstrument(instrument) };
};
export { getInstrumentHistory, getInstrumentResearch, getInstrumentNews, getInvestmentCalendar, getInstrumentOverview, normalizeCandles, periods };
