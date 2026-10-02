import axios from "axios";

import InvestmentInstrument from "../models/InvestmentInstrument.js";
import AppError from "../utils/AppError.js";

const UPSTOX_BASE_URL = "https://api.upstox.com";
const QUOTE_CACHE_MS = 15 * 1000;
const MARKET_TIMEOUT_MS = 8000;
const MAX_QUOTE_KEYS = 100;
const EXCHANGE_STATUS_CACHE_MS = 60 * 1000;
const exchangeStatusCache = { expiresAt: 0, data: null };
// Share identical in-flight quote batches across concurrent portfolio/watchlist requests.
const inFlightQuoteBatches = new Map();

const getAnalyticsToken = () => String(process.env.UPSTOX_ANALYTICS_TOKEN || "").trim();

const isMarketDataConfigured = () => Boolean(getAnalyticsToken());

const requireMarketToken = () => {
  const token = getAnalyticsToken();
  if (!token) {
    throw new AppError(
      "Live market data is not configured yet. Add an Upstox Analytics Token on the FinTrack server.",
      503,
      { code: "MARKET_DATA_NOT_CONFIGURED" },
    );
  }
  return token;
};

const buildHeaders = () => ({
  Accept: "application/json",
  Authorization: `Bearer ${requireMarketToken()}`,
});

const toProviderError = (error, fallbackMessage) => {
  if (error instanceof AppError) return error;

  const upstreamStatus = error.response?.status;
  if (upstreamStatus === 401 || upstreamStatus === 403) {
    return new AppError(
      "Live market data credentials are invalid or expired. Refresh the server-side Upstox Analytics Token.",
      503,
      { code: "MARKET_DATA_AUTH_FAILED" },
    );
  }
  if (upstreamStatus === 429) {
    return new AppError(
      "Live market data is temporarily rate limited. Please try again shortly.",
      503,
      { code: "MARKET_DATA_RATE_LIMITED" },
    );
  }

  return new AppError(fallbackMessage, 502, { code: "MARKET_DATA_UNAVAILABLE" });
};

const normalizeInstrument = (item) => ({
  instrumentKey: String(item.instrument_key || "").trim(),
  exchange: item.exchange,
  segment: item.segment,
  isin: String(item.isin || "").trim(),
  tradingSymbol: String(item.trading_symbol || "").trim(),
  name: String(item.name || item.short_name || item.trading_symbol || "").trim(),
  shortName: String(item.short_name || "").trim(),
  instrumentType: String(item.instrument_type || "").trim(),
  exchangeToken: String(item.exchange_token || "").trim(),
  lotSize: Number(item.lot_size) || 1,
  tickSize: Number(item.tick_size) || 0,
  casEligible: Boolean(item.cas_eligible),
});

const serializeInstrument = (instrument) => ({
  _id: instrument._id,
  instrumentKey: instrument.instrumentKey,
  exchange: instrument.exchange,
  segment: instrument.segment,
  isin: instrument.isin,
  tradingSymbol: instrument.tradingSymbol,
  name: instrument.name,
  shortName: instrument.shortName,
  instrumentType: instrument.instrumentType,
  lotSize: instrument.lotSize,
  tickSize: instrument.tickSize,
  casEligible: instrument.casEligible,
  lastPrice: instrument.lastPrice,
  previousClose: instrument.previousClose,
  yearHigh: instrument.yearHigh,
  yearLow: instrument.yearLow,
  volume: instrument.volume,
  quoteUpdatedAt: instrument.quoteUpdatedAt,
  quoteFetchedAt: instrument.quoteFetchedAt,
  lastTradeAt: instrument.lastTradeAt,
});

const upsertInstrument = async (normalized) => {
  if (
    !normalized.instrumentKey ||
    !normalized.isin ||
    !["NSE", "BSE"].includes(normalized.exchange) ||
    !["NSE_EQ", "BSE_EQ"].includes(normalized.segment)
  ) {
    return null;
  }

  return InvestmentInstrument.findOneAndUpdate(
    { instrumentKey: normalized.instrumentKey },
    { $set: normalized },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const searchIndianEquities = async ({ query, page = 1, records = 20 }) => {
  try {
    const response = await axios.get(`${UPSTOX_BASE_URL}/v2/instruments/search`, {
      params: {
        query,
        exchanges: "NSE,BSE",
        segments: "EQ",
        page_number: page,
        records,
      },
      headers: buildHeaders(),
      timeout: MARKET_TIMEOUT_MS,
    });

    const upstreamItems = Array.isArray(response.data?.data) ? response.data.data : [];
    const instruments = [];

    for (const item of upstreamItems) {
      const instrument = await upsertInstrument(normalizeInstrument(item));
      if (instrument) instruments.push(serializeInstrument(instrument));
    }

    return {
      instruments,
      pagination: response.data?.meta_data?.page || {
        page_number: page,
        total_pages: 1,
        records,
        total_records: instruments.length,
      },
    };
  } catch (error) {
    throw toProviderError(error, "Unable to search NSE/BSE instruments right now.");
  }
};

const isFreshQuote = (instrument) =>
  (instrument.quoteFetchedAt || instrument.quoteUpdatedAt) &&
  Date.now() - new Date(instrument.quoteFetchedAt || instrument.quoteUpdatedAt).getTime() < QUOTE_CACHE_MS &&
  instrument.lastPrice != null && Number(instrument.lastPrice) > 0;

const validTimestamp = (value) => {
  if (value == null || value === "" || value === 0 || value === "0") return null;
  const date = new Date(/^\d+$/.test(String(value)) ? Number(value) : value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const normalizeQuote = (quote) => {
  const lastPrice = Number(quote?.last_price);
  const previousClose = Number(quote?.prev_close_price);

  return {
    lastPrice: Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null,
    previousClose: quote?.prev_close_price != null && Number.isFinite(previousClose) ? previousClose : null,
    yearHigh: Number.isFinite(Number(quote?.year_high)) ? Number(quote.year_high) : null,
    yearLow: Number.isFinite(Number(quote?.year_low)) ? Number(quote.year_low) : null,
    volume: Number.isFinite(Number(quote?.volume)) ? Number(quote.volume) : null,
    quoteUpdatedAt: validTimestamp(quote?.timestamp),
    lastTradeAt: validTimestamp(quote?.last_trade_time),
    quoteFetchedAt: new Date(),
  };
};

const quotePayload = (instrument) => {
  const lastPrice = instrument.lastPrice == null ? null : Number(instrument.lastPrice);
  const previousClose = instrument.previousClose == null ? null : Number(instrument.previousClose);
  const change = lastPrice != null && Number.isFinite(lastPrice) && previousClose != null && Number.isFinite(previousClose)
    ? lastPrice - previousClose
    : null;
  const changePercent = change !== null && previousClose > 0
    ? (change / previousClose) * 100
    : null;

  return {
    instrumentId: instrument._id,
    instrumentKey: instrument.instrumentKey,
    exchange: instrument.exchange,
    tradingSymbol: instrument.tradingSymbol,
    lastPrice: Number.isFinite(lastPrice) ? lastPrice : null,
    previousClose: Number.isFinite(previousClose) ? previousClose : null,
    change,
    changePercent,
    yearHigh: instrument.yearHigh,
    yearLow: instrument.yearLow,
    volume: instrument.volume,
    quoteUpdatedAt: instrument.quoteUpdatedAt,
    quoteFetchedAt: instrument.quoteFetchedAt,
    lastTradeAt: instrument.lastTradeAt,
  };
};

const fetchAndCacheQuotes = async (instruments) => {
  if (!instruments.length) return [];
  if (instruments.length > MAX_QUOTE_KEYS) {
    throw new AppError(`A maximum of ${MAX_QUOTE_KEYS} market quotes can be refreshed at once`, 400);
  }

  try {
    const response = await axios.get(`${UPSTOX_BASE_URL}/v3/market-quote/quotes`, {
      params: { instrument_key: instruments.map((item) => item.instrumentKey).join(",") },
      headers: buildHeaders(),
      timeout: MARKET_TIMEOUT_MS,
    });

    const rawQuotes = Object.values(response.data?.data || {});
    const quoteByInstrumentKey = new Map();
    for (const quote of rawQuotes) {
      const instrumentKey = String(quote?.instrument_token || "").trim();
      if (instrumentKey) quoteByInstrumentKey.set(instrumentKey, quote);
    }

    for (const instrument of instruments) {
      const quote = quoteByInstrumentKey.get(instrument.instrumentKey);
      if (!quote) continue;
      const normalized = normalizeQuote(quote);
      if (normalized.lastPrice == null) continue;
      Object.assign(instrument, normalized);
      await instrument.save({ validateModifiedOnly: true });
    }

    return instruments.map(quotePayload);
  } catch (error) {
    throw toProviderError(error, "Unable to refresh live NSE/BSE market quotes right now.");
  }
};

const getQuotesForInstruments = async ({ instruments, allowStale = true, forceRefresh = false }) => {
  const uniqueById = new Map();
  for (const instrument of instruments || []) {
    if (instrument?._id) uniqueById.set(instrument._id.toString(), instrument);
  }
  const unique = [...uniqueById.values()];
  if (!unique.length) return { quotes: [], live: false };

  const needsRefresh = forceRefresh ? unique : unique.filter((item) => !isFreshQuote(item));
  if (!needsRefresh.length) {
    return { quotes: unique.map(quotePayload), live: true };
  }

  if (!isMarketDataConfigured()) {
    return { quotes: unique.map(quotePayload), live: false };
  }

  try {
    const batchKey = needsRefresh.map((item) => item.instrumentKey).sort().join(",");
    let pending = inFlightQuoteBatches.get(batchKey);
    if (!pending) {
      pending = fetchAndCacheQuotes(needsRefresh);
      inFlightQuoteBatches.set(batchKey, pending);
      // Only the owner cleans up; failed calls must never poison later refreshes.
      void pending.finally(() => {
        if (inFlightQuoteBatches.get(batchKey) === pending) inFlightQuoteBatches.delete(batchKey);
      }).catch(() => {});
    }
    const refreshed = await pending;
    const byKey = new Map(refreshed.map((quote) => [quote.instrumentKey, quote]));
    // Separate mongoose documents can represent the same instrument across
    // concurrent requests; propagate refreshed prices to every caller.
    for (const instrument of needsRefresh) {
      const next = byKey.get(instrument.instrumentKey);
      if (!next) continue;
      for (const field of ["lastPrice", "previousClose", "yearHigh", "yearLow", "volume", "quoteUpdatedAt", "quoteFetchedAt", "lastTradeAt"]) {
        instrument[field] = next[field];
      }
    }
    return { quotes: unique.map(quotePayload), live: true };
  } catch (error) {
    if (!allowStale) throw error;
    return { quotes: unique.map(quotePayload), live: false, warning: error.message };
  }
};

const getExchangeStatuses = async () => {
  if (!isMarketDataConfigured()) return { NSE: "UNKNOWN", BSE: "UNKNOWN" };
  if (exchangeStatusCache.data && Date.now() < exchangeStatusCache.expiresAt) return exchangeStatusCache.data;
  const results = await Promise.allSettled(["NSE", "BSE"].map(async (exchange) => {
    const response = await axios.get(`${UPSTOX_BASE_URL}/v2/market/status/${exchange}`, {
      headers: buildHeaders(), timeout: MARKET_TIMEOUT_MS,
    });
    return response.data?.data?.status;
  }));
  const statuses = {};
  ["NSE", "BSE"].forEach((exchange, index) => {
    const result = results[index];
    const value = result.status === "fulfilled" ? result.value : null;
    statuses[exchange] = value === "NORMAL_OPEN" ? "OPEN"
      : typeof value === "string" && value ? "CLOSED" : "UNKNOWN";
  });
  exchangeStatusCache.data = statuses;
  exchangeStatusCache.expiresAt = Date.now() + EXCHANGE_STATUS_CACHE_MS;
  return statuses;
};

const getMarketDataStatus = async () => ({
  configured: isMarketDataConfigured(),
  provider: "Upstox",
  exchanges: ["NSE", "BSE"],
  exchangeStatus: await getExchangeStatuses(),
  quoteCacheSeconds: QUOTE_CACHE_MS / 1000,
});

export {
  getMarketDataStatus,
  getQuotesForInstruments,
  isMarketDataConfigured,
  searchIndianEquities,
  serializeInstrument,
};
