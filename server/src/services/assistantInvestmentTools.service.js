import Account from "../models/Account.js";
import InvestmentHolding from "../models/InvestmentHolding.js";
import InvestmentInstrument from "../models/InvestmentInstrument.js";
import InvestmentTrade from "../models/InvestmentTrade.js";
import InvestmentWatchlistItem from "../models/InvestmentWatchlistItem.js";
import { getActivityForUser } from "./transactionActivity.service.js";
import {
  getPortfolioForUser,
  getWatchlistForUser,
  searchInvestments,
} from "./investment.service.js";
import { getPortfolioAnalyticsForUser } from "./investmentAnalytics.service.js";
import {
  getInstrumentHistory,
  getInstrumentNews,
  getInvestmentCalendar,
  getInstrumentOverview,
  getInstrumentResearch,
} from "./investmentResearch.service.js";
import { getMarketDataStatus } from "./marketData.service.js";

const HISTORY_PERIODS = ["1D", "5D", "1M", "3M", "6M", "1Y", "MAX"];
const STOCK_RESEARCH_SCOPES = ["QUOTE", "HISTORY", "FUNDAMENTALS", "NEWS", "FULL"];
const INVESTMENT_ACTIVITY_TYPES = ["BUY", "SELL"];
const ACCOUNT_ACTIVITY_TYPES = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "INVESTMENT",
  "INVESTMENT_BUY",
  "INVESTMENT_SELL",
];

const round2 = (value) => Number((Number(value) || 0).toFixed(2));
const clampInteger = (value, { min, max, fallback }) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeText = (value) => String(value || "").trim();
const dateKey = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
};

const quoteEvidence = ({ quote, exchangeStatus = "UNKNOWN" }) => {
  const lastPrice = Number(quote?.lastPrice);
  const fetchedAt = quote?.quoteFetchedAt ? new Date(quote.quoteFetchedAt) : null;
  const lastTradeAt = quote?.lastTradeAt ? new Date(quote.lastTradeAt) : null;
  const fetchedAgeMs = fetchedAt && Number.isFinite(fetchedAt.getTime())
    ? Date.now() - fetchedAt.getTime()
    : null;

  let freshness = "UNAVAILABLE";
  if (Number.isFinite(lastPrice) && lastPrice > 0) {
    if (exchangeStatus === "OPEN" && fetchedAgeMs !== null && fetchedAgeMs <= 2 * 60 * 1000) {
      freshness = "LIVE";
    } else if (exchangeStatus === "CLOSED") {
      freshness = "CLOSED_MARKET";
    } else if (fetchedAgeMs !== null && fetchedAgeMs <= 15 * 60 * 1000) {
      freshness = "DELAYED";
    } else {
      freshness = "CACHED";
    }
  }

  return {
    freshness,
    exchangeStatus,
    quoteFetchedAt: fetchedAt && Number.isFinite(fetchedAt.getTime()) ? fetchedAt.toISOString() : null,
    lastTradeAt: lastTradeAt && Number.isFinite(lastTradeAt.getTime()) ? lastTradeAt.toISOString() : null,
  };
};

const compactQuote = ({ quote, exchangeStatus }) => ({
  lastPrice: quote?.lastPrice == null ? null : round2(quote.lastPrice),
  previousClose: quote?.previousClose == null ? null : round2(quote.previousClose),
  change: quote?.change == null ? null : round2(quote.change),
  changePercent: quote?.changePercent == null ? null : round2(quote.changePercent),
  yearHigh: quote?.yearHigh == null ? null : round2(quote.yearHigh),
  yearLow: quote?.yearLow == null ? null : round2(quote.yearLow),
  volume: Number.isFinite(Number(quote?.volume)) ? Number(quote.volume) : null,
  ...quoteEvidence({ quote, exchangeStatus }),
});

const resolveAccountByName = async ({ userId, name, investmentOnly = false }) => {
  const requested = normalizeText(name);
  if (!requested) return { account: null, requested: null, matches: [] };

  const query = {
    user: userId,
    ...(investmentOnly ? { type: "INVESTMENT" } : {}),
  };
  const accounts = await Account.find(query)
    .select("name type currency balance isArchived")
    .sort({ isArchived: 1, createdAt: -1 })
    .lean();
  const lowered = requested.toLowerCase();
  const exact = accounts.find((account) => account.name.toLowerCase() === lowered);
  if (exact) return { account: exact, requested, matches: [exact.name] };
  const partial = accounts.filter((account) => account.name.toLowerCase().includes(lowered));
  return {
    account: partial.length === 1 ? partial[0] : null,
    requested,
    matches: partial.slice(0, 6).map((account) => account.name),
  };
};

const getUserPreferredInstrumentIds = async (userId) => {
  const [holdings, watchlist] = await Promise.all([
    InvestmentHolding.find({ user: userId, quantity: { $gt: 0 } }).select("instrument").lean(),
    InvestmentWatchlistItem.find({ user: userId }).select("instrument").lean(),
  ]);
  return new Set(
    [...holdings, ...watchlist]
      .map((item) => item.instrument?.toString())
      .filter(Boolean),
  );
};

const resolveInstrumentForUser = async ({ userId, query, exchange }) => {
  const requested = normalizeText(query);
  if (!requested) {
    return { instrument: null, requested: null, ambiguous: false, candidates: [] };
  }

  const exchangeFilter = ["NSE", "BSE"].includes(exchange) ? exchange : null;
  const exactSymbolRegex = new RegExp(`^${escapeRegex(requested)}$`, "i");
  const localFilter = {
    ...(exchangeFilter ? { exchange: exchangeFilter } : {}),
    $or: [
      { tradingSymbol: exactSymbolRegex },
      { isin: exactSymbolRegex },
      { name: { $regex: escapeRegex(requested), $options: "i" } },
      { shortName: { $regex: escapeRegex(requested), $options: "i" } },
    ],
  };

  let candidates = await InvestmentInstrument.find(localFilter).limit(16).lean();
  if (!candidates.length) {
    try {
      const searched = await searchInvestments({ query: requested, page: 1, records: 12 });
      const ids = searched.instruments.map((item) => item._id);
      candidates = ids.length
        ? await InvestmentInstrument.find({ _id: { $in: ids }, ...(exchangeFilter ? { exchange: exchangeFilter } : {}) }).lean()
        : [];
    } catch {
      // The caller will receive a no-match result. Market/provider errors are
      // still surfaced when a resolved instrument is subsequently queried.
      candidates = [];
    }
  }

  if (!candidates.length) {
    return { instrument: null, requested, ambiguous: false, candidates: [] };
  }

  const preferredIds = await getUserPreferredInstrumentIds(userId);
  const requestedUpper = requested.toUpperCase();
  const ranked = candidates
    .map((instrument) => {
      let score = 0;
      if (preferredIds.has(instrument._id.toString())) score += 100;
      if (String(instrument.tradingSymbol || "").toUpperCase() === requestedUpper) score += 60;
      if (String(instrument.isin || "").toUpperCase() === requestedUpper) score += 55;
      if (String(instrument.name || "").toLowerCase() === requested.toLowerCase()) score += 40;
      if (exchangeFilter && instrument.exchange === exchangeFilter) score += 20;
      if (instrument.exchange === "NSE") score += 1;
      return { instrument, score };
    })
    .sort((a, b) => b.score - a.score || String(a.instrument.tradingSymbol).localeCompare(String(b.instrument.tradingSymbol)));

  const top = ranked[0];
  const competing = ranked.filter((item) => item.score === top.score);
  const ambiguous = !exchangeFilter && competing.length > 1 && competing.some(
    (item) => item.instrument.exchange !== top.instrument.exchange,
  );

  return {
    instrument: ambiguous ? null : top.instrument,
    requested,
    ambiguous,
    candidates: ranked.slice(0, 6).map(({ instrument }) => ({
      symbol: instrument.tradingSymbol,
      exchange: instrument.exchange,
      name: instrument.shortName || instrument.name,
      isin: instrument.isin,
    })),
  };
};

const sampleCandles = (candles, maxPoints = 28) => {
  const rows = Array.isArray(candles) ? candles.filter((row) => Number.isFinite(Number(row?.close))) : [];
  if (rows.length <= maxPoints) return rows.map((row) => ({ at: row.at, close: round2(row.close) }));
  const step = (rows.length - 1) / (maxPoints - 1);
  const sampled = [];
  for (let index = 0; index < maxPoints; index += 1) {
    const row = rows[Math.round(index * step)];
    sampled.push({ at: row.at, close: round2(row.close) });
  }
  return sampled;
};

const summarizeHistory = (candles, period) => {
  const rows = Array.isArray(candles) ? candles.filter((row) => Number.isFinite(Number(row?.close))) : [];
  if (!rows.length) return { period, points: 0, firstClose: null, lastClose: null, change: null, changePercent: null, high: null, low: null, sampled: [] };
  const first = rows[0];
  const last = rows.at(-1);
  const firstClose = Number(first.close);
  const lastClose = Number(last.close);
  const change = lastClose - firstClose;
  const highs = rows.map((row) => Number(row.high)).filter(Number.isFinite);
  const lows = rows.map((row) => Number(row.low)).filter(Number.isFinite);
  return {
    period,
    points: rows.length,
    firstAt: first.at,
    lastAt: last.at,
    firstClose: round2(firstClose),
    lastClose: round2(lastClose),
    change: round2(change),
    changePercent: firstClose > 0 ? round2((change / firstClose) * 100) : null,
    high: highs.length ? round2(Math.max(...highs)) : null,
    low: lows.length ? round2(Math.min(...lows)) : null,
    sampled: sampleCandles(rows),
  };
};

const getInvestmentPortfolioTool = async ({ user, args = {} }) => {
  const [portfolio, analytics, marketStatus] = await Promise.all([
    getPortfolioForUser({ userId: user._id }),
    getPortfolioAnalyticsForUser({ userId: user._id }),
    getMarketDataStatus(),
  ]);

  const requestedSymbol = normalizeText(args.symbol);
  const requestedExchange = ["NSE", "BSE"].includes(args.exchange) ? args.exchange : null;
  const requestedAccount = normalizeText(args.account);
  let holdings = portfolio.holdings || [];

  if (requestedSymbol) {
    const upper = requestedSymbol.toUpperCase();
    holdings = holdings.filter((holding) =>
      String(holding.instrument?.tradingSymbol || "").toUpperCase() === upper ||
      String(holding.instrument?.name || "").toLowerCase().includes(requestedSymbol.toLowerCase()),
    );
  }
  if (requestedExchange) holdings = holdings.filter((holding) => holding.instrument?.exchange === requestedExchange);
  if (requestedAccount) holdings = holdings.filter((holding) => holding.account?.name?.toLowerCase().includes(requestedAccount.toLowerCase()));

  const rows = holdings.map((holding) => {
    const exchangeStatus = marketStatus.exchangeStatus?.[holding.instrument?.exchange] || "UNKNOWN";
    return {
      symbol: holding.instrument?.tradingSymbol,
      exchange: holding.instrument?.exchange,
      name: holding.instrument?.shortName || holding.instrument?.name,
      account: holding.account?.name,
      quantity: Number(holding.quantity || 0),
      averageCost: round2(holding.averageCost),
      costBasis: round2(holding.costBasis),
      currentPrice: round2(holding.currentPrice),
      priceIsCostEstimate: Boolean(holding.priceIsCostEstimate),
      marketValue: round2(holding.marketValue),
      unrealizedPnl: round2(holding.unrealizedPnl),
      realizedPnl: round2(holding.realizedPnl),
      totalPnl: round2(holding.totalPnl),
      quote: compactQuote({ quote: holding.quote, exchangeStatus }),
    };
  });

  const selectionInvested = round2(rows.reduce((sum, item) => sum + Number(item.costBasis || 0), 0));
  const selectionMarketValue = round2(rows.reduce((sum, item) => sum + Number(item.marketValue || 0), 0));
  const selectionUnrealizedPnl = round2(rows.reduce((sum, item) => sum + Number(item.unrealizedPnl || 0), 0));
  const selectionRealizedPnl = round2(rows.reduce((sum, item) => sum + Number(item.realizedPnl || 0), 0));
  const selectionTotalPnl = round2(selectionUnrealizedPnl + selectionRealizedPnl);
  const selectionSummary = {
    invested: selectionInvested,
    marketValue: selectionMarketValue,
    unrealizedPnl: selectionUnrealizedPnl,
    realizedPnl: selectionRealizedPnl,
    totalPnl: selectionTotalPnl,
    returnPercent: selectionInvested > 0 ? round2((selectionMarketValue - selectionInvested) / selectionInvested * 100) : 0,
    holdings: rows.length,
  };

  return {
    supported: true,
    domain: "INVESTMENTS",
    source: "FINTRACK_INVESTMENT_LEDGER_AND_UPSTOX_MARKET_DATA",
    currency: "INR",
    filters: {
      symbol: requestedSymbol || null,
      exchange: requestedExchange,
      account: requestedAccount || null,
    },
    summary: {
      ...portfolio.summary,
      invested: round2(portfolio.summary?.invested),
      marketValue: round2(portfolio.summary?.marketValue),
      unrealizedPnl: round2(portfolio.summary?.unrealizedPnl),
      realizedPnl: round2(portfolio.summary?.realizedPnl),
      totalPnl: round2(portfolio.summary?.totalPnl),
      returnPercent: round2(portfolio.summary?.returnPercent),
      visibleHoldings: rows.length,
    },
    selectionSummary,
    holdings: rows,
    analytics: {
      cash: round2(analytics?.brokerCash),
      equityValue: round2(analytics?.equityValue),
      totalInvestmentValue: round2(analytics?.totalValue),
      realizedPnl: round2(analytics?.realizedPnl),
      unrealizedPnl: round2(analytics?.unrealizedPnl),
      totalPnl: round2(analytics?.totalPnl),
      equityPercent: round2(analytics?.equityPercent),
      cashPercent: round2(analytics?.cashPercent),
      topHoldingPercent: round2(analytics?.topHoldingPercent),
      concentrationIndex: Number(analytics?.concentrationIndex || 0),
      quoteFallbackCount: Number(analytics?.quoteFallbackCount || 0),
      holdingCount: Array.isArray(analytics?.byHolding) ? analytics.byHolding.length : rows.length,
      byExchange: analytics?.byExchange || [],
      byAccount: analytics?.byAccount || [],
    },
    market: {
      provider: marketStatus.provider || "Upstox",
      exchangeStatus: marketStatus.exchangeStatus || {},
      warning: portfolio.market?.warning || null,
    },
    note: rows.length || !Object.values({ requestedSymbol, requestedAccount, requestedExchange }).some(Boolean)
      ? null
      : "No current FinTrack holding matched the requested portfolio filter.",
  };
};

const getInvestmentActivityTool = async ({ user, args = {}, asOf }) => {
  const limit = clampInteger(args.limit, { min: 1, max: 30, fallback: 12 });
  const days = clampInteger(args.days, { min: 1, max: 730, fallback: 90 });
  const type = INVESTMENT_ACTIVITY_TYPES.includes(args.type) ? args.type : null;
  const accountResolution = await resolveAccountByName({ userId: user._id, name: args.account, investmentOnly: true });
  if (args.account && !accountResolution.account) {
    return {
      supported: true,
      domain: "INVESTMENTS",
      source: "FINTRACK_INVESTMENT_LEDGER",
      trades: [],
      note: accountResolution.matches.length
        ? `The investment account name was ambiguous. Matching accounts: ${accountResolution.matches.join(", ")}.`
        : `No FinTrack investment account matched \"${accountResolution.requested}\".`,
    };
  }

  const start = new Date(asOf);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  const query = {
    user: user._id,
    tradeDate: { $gte: start, $lte: new Date(asOf) },
    ...(type ? { type } : {}),
    ...(accountResolution.account ? { account: accountResolution.account._id } : {}),
  };

  const requestedSymbol = normalizeText(args.symbol);
  if (requestedSymbol) {
    const instruments = await InvestmentInstrument.find({
      tradingSymbol: { $regex: `^${escapeRegex(requestedSymbol)}$`, $options: "i" },
      ...(["NSE", "BSE"].includes(args.exchange) ? { exchange: args.exchange } : {}),
    }).select("_id").lean();
    query.instrument = { $in: instruments.map((item) => item._id) };
  }

  const trades = await InvestmentTrade.find(query)
    .sort({ tradeDate: -1, createdAt: -1 })
    .limit(limit)
    .populate("account", "name currency")
    .populate("instrument", "tradingSymbol exchange name shortName");

  const rows = trades.map((trade) => ({
    type: trade.type,
    symbol: trade.instrument?.tradingSymbol,
    exchange: trade.instrument?.exchange,
    name: trade.instrument?.shortName || trade.instrument?.name,
    account: trade.account?.name,
    quantity: Number(trade.quantity || 0),
    price: round2(trade.price),
    fees: round2(trade.fees),
    grossAmount: round2(trade.grossAmount),
    netCashAmount: round2(trade.netCashAmount),
    costBasis: round2(trade.costBasis),
    realizedPnl: round2(trade.realizedPnl),
    tradeDate: trade.tradeDate,
  }));

  return {
    supported: true,
    domain: "INVESTMENTS",
    source: "FINTRACK_INVESTMENT_LEDGER",
    currency: "INR",
    dataCoverage: { days, startDate: dateKey(start), endDate: dateKey(asOf) },
    filters: {
      type,
      symbol: requestedSymbol || null,
      exchange: ["NSE", "BSE"].includes(args.exchange) ? args.exchange : null,
      account: accountResolution.account?.name || null,
    },
    trades: rows,
    summary: {
      count: rows.length,
      buys: rows.filter((trade) => trade.type === "BUY").length,
      sells: rows.filter((trade) => trade.type === "SELL").length,
      netCashMovement: round2(rows.reduce((sum, trade) => sum + trade.netCashAmount, 0)),
      realizedPnl: round2(rows.reduce((sum, trade) => sum + trade.realizedPnl, 0)),
    },
  };
};

const getInvestmentWatchlistTool = async ({ user }) => {
  const [watchlist, marketStatus] = await Promise.all([
    getWatchlistForUser({ userId: user._id }),
    getMarketDataStatus(),
  ]);
  return {
    supported: true,
    domain: "INVESTMENTS",
    source: "FINTRACK_WATCHLIST_AND_UPSTOX_MARKET_DATA",
    currency: "INR",
    items: (watchlist.items || []).map((item) => ({
      symbol: item.instrument?.tradingSymbol,
      exchange: item.instrument?.exchange,
      name: item.instrument?.shortName || item.instrument?.name,
      quote: compactQuote({
        quote: item.quote,
        exchangeStatus: marketStatus.exchangeStatus?.[item.instrument?.exchange] || "UNKNOWN",
      }),
    })),
    market: {
      provider: marketStatus.provider || "Upstox",
      exchangeStatus: marketStatus.exchangeStatus || {},
      warning: watchlist.market?.warning || null,
    },
  };
};


const getInvestmentCalendarTool = async ({ user }) => {
  const calendar = await getInvestmentCalendar({ userId: user._id });
  return {
    supported: true,
    domain: "INVESTMENT_CALENDAR",
    source: "FINTRACK_TRACKED_INSTRUMENTS_AND_UPSTOX_CALENDAR",
    trackedInstruments: Number(calendar.trackedInstruments || 0),
    marketHolidays: (calendar.marketHolidays || []).slice(0, 20),
    corporateActions: (calendar.corporateActions || []).slice(0, 30),
    availability: calendar.availability || {},
    warning: calendar.warning || null,
    fetchedAt: calendar.fetchedAt || null,
    note: "Calendar scope is limited to NSE/BSE market holidays and corporate actions for instruments held or watchlisted inside FinTrack. It does not read the user's Upstox brokerage account.",
  };
};

const getStockResearchTool = async ({ user, args = {} }) => {
  const scope = STOCK_RESEARCH_SCOPES.includes(args.scope) ? args.scope : "QUOTE";
  const period = HISTORY_PERIODS.includes(args.period) ? args.period : "1M";
  const resolved = await resolveInstrumentForUser({
    userId: user._id,
    query: args.query,
    exchange: args.exchange,
  });

  if (!resolved.instrument) {
    return {
      supported: true,
      domain: "PUBLIC_MARKET_RESEARCH",
      source: "FINTRACK_INSTRUMENT_INDEX",
      resolved: false,
      ambiguous: resolved.ambiguous,
      requested: resolved.requested,
      candidates: resolved.candidates,
      note: resolved.ambiguous
        ? "Multiple NSE/BSE listings matched. Specify the exchange or use the exact trading symbol."
        : `No NSE/BSE instrument matched \"${resolved.requested || "the requested stock"}\".`,
    };
  }

  const instrumentId = resolved.instrument._id;
  const needHistory = scope === "HISTORY" || scope === "FULL";
  const needResearch = scope === "FUNDAMENTALS" || scope === "FULL";
  const needNews = scope === "NEWS" || scope === "FULL";
  const [overviewResult, historyResult, researchResult, newsResult, marketStatus] = await Promise.all([
    getInstrumentOverview({ instrumentId }),
    needHistory ? getInstrumentHistory({ instrumentId, period }) : Promise.resolve(null),
    needResearch ? getInstrumentResearch({ instrumentId }) : Promise.resolve(null),
    needNews ? getInstrumentNews({ instrumentId }) : Promise.resolve(null),
    getMarketDataStatus(),
  ]);

  const instrument = overviewResult.instrument;
  const exchangeStatus = marketStatus.exchangeStatus?.[instrument.exchange] || "UNKNOWN";
  const profile = researchResult?.profile || {};
  const ratios = Array.isArray(researchResult?.ratios) ? researchResult.ratios.slice(0, 10) : [];
  const incomeStatement = Array.isArray(researchResult?.incomeStatement?.income_statement)
    ? researchResult.incomeStatement.income_statement.slice(0, 8).map((section) => ({
        category: section.category,
        latest: section.history?.[0]?.value ?? null,
        period: section.history?.[0]?.period || null,
      }))
    : [];
  const cashFlow = Array.isArray(researchResult?.cashFlow?.cash_flow)
    ? researchResult.cashFlow.cash_flow.slice(0, 6).map((section) => ({
        category: section.category,
        latest: section.history?.[0]?.value ?? null,
        period: section.history?.[0]?.period || null,
      }))
    : [];
  const balance = researchResult?.balanceSheet?.history?.[0] || null;

  return {
    supported: true,
    domain: "PUBLIC_MARKET_RESEARCH",
    source: "UPSTOX_READ_ONLY_MARKET_DATA",
    resolved: true,
    instrument: {
      symbol: instrument.tradingSymbol,
      exchange: instrument.exchange,
      name: instrument.shortName || instrument.name,
      isin: instrument.isin,
    },
    navigationPath: `/investments/stocks/${instrumentId}`,
    scope,
    quote: compactQuote({ quote: overviewResult.quote, exchangeStatus }),
    history: historyResult ? summarizeHistory(historyResult.candles, period) : null,
    fundamentals: researchResult ? {
      profile: String(profile.company_profile || "").slice(0, 1000),
      sector: profile.sector || null,
      ratios: ratios.map((ratio) => ({
        name: ratio.name,
        companyValue: ratio.company_value ?? null,
        sectorValue: ratio.sector_value ?? null,
      })),
      incomeStatement,
      balanceSheet: balance ? {
        period: balance.period || null,
        totalAssets: balance.total_asset ?? null,
        totalLiabilities: balance.total_liability ?? null,
      } : null,
      cashFlow,
      shareholding: Array.isArray(researchResult.shareholding)
        ? researchResult.shareholding.slice(0, 8).map((item) => ({
            category: item.category,
            value: item.history?.[0]?.value ?? null,
            period: item.history?.[0]?.period || null,
          }))
        : [],
      corporateActions: Array.isArray(researchResult.corporateActions)
        ? researchResult.corporateActions.slice(0, 8).map((event) => ({
            name: event.name || "Corporate action",
            date: event.expiry_date || null,
            amount: event.amount ?? null,
            ratio: event.ratio || null,
          }))
        : [],
      unavailable: researchResult.unavailable || [],
    } : null,
    news: newsResult ? (newsResult.items || []).slice(0, 6).map((item) => ({
      heading: String(item.heading || "").slice(0, 220),
      summary: String(item.summary || "").slice(0, 500),
      publishedAt: item.publishedAt || null,
      link: item.link || null,
    })) : null,
    market: {
      provider: marketStatus.provider || "Upstox",
      exchangeStatus,
      warning: overviewResult.market?.warning || null,
    },
    note: "Upstox data is public market/research data only. FinTrack does not connect to or synchronize the user's Upstox brokerage account.",
  };
};

const getAccountActivityTool = async ({ user, args = {}, asOf }) => {
  const accountResolution = await resolveAccountByName({ userId: user._id, name: args.account });
  if (!accountResolution.account) {
    return {
      supported: true,
      domain: "UNIFIED_ACTIVITY",
      source: "FINTRACK_UNIFIED_ACTIVITY",
      activity: [],
      note: accountResolution.matches.length
        ? `The account name was ambiguous. Matching accounts: ${accountResolution.matches.join(", ")}.`
        : `No FinTrack account matched \"${accountResolution.requested || "the requested account"}\".`,
    };
  }

  const limit = clampInteger(args.limit, { min: 1, max: 30, fallback: 15 });
  const days = clampInteger(args.days, { min: 1, max: 730, fallback: 90 });
  const type = ACCOUNT_ACTIVITY_TYPES.includes(args.type) ? args.type : null;
  const start = new Date(asOf);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  const result = await getActivityForUser({
    userId: user._id,
    accountId: accountResolution.account._id,
    type,
    search: normalizeText(args.search) || undefined,
    startDate: dateKey(start),
    endDate: dateKey(asOf),
    page: 1,
    limit,
  });

  const activity = (result.transactions || []).map((row) => ({
    recordKind: row.recordKind,
    type: row.type,
    title: row.title,
    amount: round2(row.amount),
    date: row.transactionDate,
    account: row.account?.name || accountResolution.account.name,
    destinationAccount: row.destinationAccount?.name || null,
    category: row.category?.name || null,
    currency: row.account?.currency || accountResolution.account.currency,
    instrument: row.instrument ? {
      symbol: row.instrument.tradingSymbol,
      exchange: row.instrument.exchange,
      name: row.instrument.shortName || row.instrument.name,
    } : null,
    quantity: row.quantity == null ? null : Number(row.quantity),
    executionPrice: row.price == null ? null : round2(row.price),
    fees: row.fees == null ? null : round2(row.fees),
    netCashAmount: row.netCashAmount == null ? null : round2(row.netCashAmount),
    realizedPnl: row.realizedPnl == null ? null : round2(row.realizedPnl),
  }));

  return {
    supported: true,
    domain: "UNIFIED_ACTIVITY",
    source: "FINTRACK_UNIFIED_ACTIVITY",
    account: {
      name: accountResolution.account.name,
      type: accountResolution.account.type,
      currency: accountResolution.account.currency,
      balance: round2(accountResolution.account.balance),
      isArchived: Boolean(accountResolution.account.isArchived),
    },
    dataCoverage: { days, startDate: dateKey(start), endDate: dateKey(asOf) },
    filters: { type, search: normalizeText(args.search) || null },
    activity,
    pagination: result.pagination,
    note: "Investment BUY/SELL rows are shown for activity context but remain separate from ordinary income/expense accounting.",
  };
};

export {
  ACCOUNT_ACTIVITY_TYPES,
  HISTORY_PERIODS,
  INVESTMENT_ACTIVITY_TYPES,
  STOCK_RESEARCH_SCOPES,
  getAccountActivityTool,
  getInvestmentActivityTool,
  getInvestmentCalendarTool,
  getInvestmentPortfolioTool,
  getInvestmentWatchlistTool,
  getStockResearchTool,
  quoteEvidence,
  resolveInstrumentForUser,
  summarizeHistory,
};
