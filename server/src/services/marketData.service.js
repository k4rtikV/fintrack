import axios from "axios";

import InvestmentInstrument from "../models/InvestmentInstrument.js";
import AppError from "../utils/AppError.js";

const UPSTOX_BASE_URL = "https://api.upstox.com";
const QUOTE_CACHE_MS = 15 * 1000;
const MARKET_TIMEOUT_MS = 8000;
const MAX_QUOTE_KEYS = 100;

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
  instrument.quoteUpdatedAt &&
  Date.now() - new Date(instrument.quoteUpdatedAt).getTime() < QUOTE_CACHE_MS &&
  Number.isFinite(Number(instrument.lastPrice));

const normalizeQuote = (quote) => {
  const lastPrice = Number(quote?.last_price);
  const previousClose = Number(quote?.prev_close_price);

  return {
    lastPrice: Number.isFinite(lastPrice) ? lastPrice : null,
    previousClose: Number.isFinite(previousClose) ? previousClose : null,
    yearHigh: Number.isFinite(Number(quote?.year_high)) ? Number(quote.year_high) : null,
    yearLow: Number.isFinite(Number(quote?.year_low)) ? Number(quote.year_low) : null,
    volume: Number.isFinite(Number(quote?.volume)) ? Number(quote.volume) : null,
    quoteUpdatedAt: quote?.timestamp ? new Date(quote.timestamp) : new Date(),
  };
};

const quotePayload = (instrument) => {
  const lastPrice = Number(instrument.lastPrice);
  const previousClose = Number(instrument.previousClose);
  const change = Number.isFinite(lastPrice) && Number.isFinite(previousClose)
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
      Object.assign(instrument, normalized);
      await instrument.save({ validateModifiedOnly: true });
    }

    return instruments.map(quotePayload);
  } catch (error) {
    throw toProviderError(error, "Unable to refresh live NSE/BSE market quotes right now.");
  }
};

const getQuotesForInstruments = async ({ instruments, allowStale = true }) => {
  const uniqueById = new Map();
  for (const instrument of instruments || []) {
    if (instrument?._id) uniqueById.set(instrument._id.toString(), instrument);
  }
  const unique = [...uniqueById.values()];
  if (!unique.length) return { quotes: [], live: false };

  const needsRefresh = unique.filter((item) => !isFreshQuote(item));
  if (!needsRefresh.length) {
    return { quotes: unique.map(quotePayload), live: true };
  }

  if (!isMarketDataConfigured()) {
    return { quotes: unique.map(quotePayload), live: false };
  }

  try {
    await fetchAndCacheQuotes(needsRefresh);
    return { quotes: unique.map(quotePayload), live: true };
  } catch (error) {
    if (!allowStale) throw error;
    return { quotes: unique.map(quotePayload), live: false, warning: error.message };
  }
};

const getMarketDataStatus = () => ({
  configured: isMarketDataConfigured(),
  provider: "Upstox",
  exchanges: ["NSE", "BSE"],
  quoteCacheSeconds: QUOTE_CACHE_MS / 1000,
});

export {
  getMarketDataStatus,
  getQuotesForInstruments,
  isMarketDataConfigured,
  searchIndianEquities,
  serializeInstrument,
};
