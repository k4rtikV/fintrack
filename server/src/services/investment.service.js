import mongoose from "mongoose";

import Account from "../models/Account.js";
import InvestmentHolding from "../models/InvestmentHolding.js";
import InvestmentInstrument from "../models/InvestmentInstrument.js";
import InvestmentLot from "../models/InvestmentLot.js";
import InvestmentTrade from "../models/InvestmentTrade.js";
import InvestmentWatchlistItem from "../models/InvestmentWatchlistItem.js";
import AppError from "../utils/AppError.js";
import { toUtcDateOnly } from "../utils/dateOnly.js";
import { planFifoSale, roundMoney, roundQuantity } from "../utils/investmentMath.js";
import {
  getQuotesForInstruments,
  searchIndianEquities,
  serializeInstrument,
} from "./marketData.service.js";

const ensureObjectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${label}`, 400);
  }
};

const ensureInvestmentAccount = async ({ accountId, userId, session, includeArchived = false }) => {
  ensureObjectId(accountId, "investment account ID");
  const query = Account.findOne({
    _id: accountId,
    user: userId,
    type: "INVESTMENT",
    ...(includeArchived ? {} : { isArchived: false }),
  });
  if (session) query.session(session);
  const account = await query;

  if (!account) {
    throw new AppError("Investment account not found or archived", 404);
  }
  if (account.currency !== "INR") {
    throw new AppError(
      "NSE/BSE holdings currently require an INR investment account.",
      409,
      { code: "INVESTMENT_ACCOUNT_CURRENCY_UNSUPPORTED" },
    );
  }
  return account;
};

const ensureInstrument = async ({ instrumentId, session }) => {
  ensureObjectId(instrumentId, "instrument ID");
  const query = InvestmentInstrument.findById(instrumentId);
  if (session) query.session(session);
  const instrument = await query;
  if (!instrument) throw new AppError("Investment instrument not found", 404);
  return instrument;
};

const populateHolding = (query) =>
  query
    .populate("account", "name type currency balance isArchived")
    .populate("instrument");

const getInvestmentAccountsForUser = async ({ userId, includeArchived = false }) =>
  Account.find({
    user: userId,
    type: "INVESTMENT",
    ...(includeArchived ? {} : { isArchived: false }),
  }).sort({ isArchived: 1, createdAt: -1 });

const searchInvestments = async ({ query, page, records }) =>
  searchIndianEquities({ query, page, records });

const createInvestmentTradeForUser = async ({
  userId,
  accountId,
  instrumentId,
  type,
  quantity,
  price,
  fees = 0,
  tradeDate,
  note = "",
}) => {
  const numericQuantity = roundQuantity(quantity);
  const numericPrice = roundMoney(price);
  const numericFees = roundMoney(fees);
  let tradeId;

  await mongoose.connection.transaction(async (session) => {
    const account = await ensureInvestmentAccount({ accountId, userId, session });
    const instrument = await ensureInstrument({ instrumentId, session });

    let holding = await InvestmentHolding.findOne({
      user: userId,
      account: account._id,
      instrument: instrument._id,
    }).session(session);

    if (!holding) {
      if (type === "SELL") {
        throw new AppError("You do not hold this instrument in the selected account", 409);
      }
      const created = await InvestmentHolding.create(
        [{
          user: userId,
          account: account._id,
          instrument: instrument._id,
          currency: "INR",
        }],
        { session },
      );
      holding = created[0];
    }

    const grossAmount = roundMoney(numericQuantity * numericPrice);
    let netCashAmount;
    let realizedPnl = 0;
    let consumedCostBasis = 0;

    if (type === "BUY") {
      const totalCashOut = roundMoney(grossAmount + numericFees);
      netCashAmount = -totalCashOut;

      account.balance = roundMoney(Number(account.balance || 0) - totalCashOut);
      await account.save({ session, validateModifiedOnly: true });

      const lotUnitCost = numericQuantity > 0
        ? roundMoney(totalCashOut / numericQuantity)
        : 0;

      await InvestmentLot.create(
        [{
          user: userId,
          holding: holding._id,
          account: account._id,
          instrument: instrument._id,
          quantityOriginal: numericQuantity,
          quantityRemaining: numericQuantity,
          unitCost: lotUnitCost,
          acquiredAt: toUtcDateOnly(tradeDate),
        }],
        { session },
      );

      holding.quantity = roundQuantity(Number(holding.quantity || 0) + numericQuantity);
      holding.costBasis = roundMoney(Number(holding.costBasis || 0) + totalCashOut);
      holding.averageCost = holding.quantity > 0
        ? roundMoney(holding.costBasis / holding.quantity)
        : 0;
    } else {
      const availableQuantity = Number(holding.quantity || 0);
      if (numericQuantity > availableQuantity + 1e-6) {
        throw new AppError(
          `Sell quantity exceeds the available holding of ${availableQuantity}`,
          409,
          { code: "INVESTMENT_SELL_EXCEEDS_HOLDING" },
        );
      }

      const lots = await InvestmentLot.find({
        user: userId,
        holding: holding._id,
        quantityRemaining: { $gt: 0 },
      })
        .sort({ acquiredAt: 1, _id: 1 })
        .session(session);

      const salePlan = planFifoSale({ lots, quantity: numericQuantity });
      if (salePlan.unallocated > 1e-6) {
        throw new AppError("Investment lot history is inconsistent with the holding quantity", 409);
      }

      const lotById = new Map(lots.map((lot) => [lot._id.toString(), lot]));
      for (const allocation of salePlan.allocations) {
        const lot = lotById.get(allocation.lotId);
        lot.quantityRemaining = allocation.quantityRemaining;
        await lot.save({ session, validateModifiedOnly: true });
      }

      consumedCostBasis = salePlan.costBasis;
      const cashIn = roundMoney(grossAmount - numericFees);
      netCashAmount = cashIn;
      realizedPnl = roundMoney(cashIn - consumedCostBasis);

      account.balance = roundMoney(Number(account.balance || 0) + cashIn);
      await account.save({ session, validateModifiedOnly: true });

      holding.quantity = roundQuantity(Math.max(availableQuantity - numericQuantity, 0));
      holding.costBasis = roundMoney(Math.max(Number(holding.costBasis || 0) - consumedCostBasis, 0));
      holding.averageCost = holding.quantity > 0
        ? roundMoney(holding.costBasis / holding.quantity)
        : 0;
      holding.realizedPnl = roundMoney(Number(holding.realizedPnl || 0) + realizedPnl);
    }

    await holding.save({ session, validateModifiedOnly: true });

    const created = await InvestmentTrade.create(
      [{
        user: userId,
        account: account._id,
        holding: holding._id,
        instrument: instrument._id,
        type,
        quantity: numericQuantity,
        price: numericPrice,
        fees: numericFees,
        grossAmount,
        netCashAmount,
        costBasis: consumedCostBasis,
        realizedPnl,
        tradeDate: toUtcDateOnly(tradeDate),
        note,
      }],
      { session },
    );
    tradeId = created[0]._id;
  });

  return InvestmentTrade.findById(tradeId)
    .populate("account", "name currency balance")
    .populate("instrument", "name shortName tradingSymbol exchange instrumentKey isin")
    .populate("holding", "quantity averageCost costBasis realizedPnl");
};

const buildQuoteMap = (quotes) =>
  new Map((quotes || []).map((quote) => [String(quote.instrumentId), quote]));

const researchLinksForInstrument = (instrument) => ({
  tradingView: `https://www.tradingview.com/symbols/${instrument.exchange}-${encodeURIComponent(instrument.tradingSymbol)}/`,
  moneycontrol: "https://www.moneycontrol.com/india/stockpricequote/",
});

const getPortfolioForUser = async ({ userId }) => {
  const holdings = await populateHolding(
    InvestmentHolding.find({ user: userId, quantity: { $gt: 0 } }),
  ).sort({ updatedAt: -1 });

  const instruments = holdings.map((holding) => holding.instrument).filter(Boolean);
  const quoteResult = await getQuotesForInstruments({ instruments, allowStale: true });
  const quoteMap = buildQuoteMap(quoteResult.quotes);

  let invested = 0;
  let marketValue = 0;
  let realizedPnl = 0;
  let unrealizedPnl = 0;

  const items = holdings.map((holding) => {
    const quote = quoteMap.get(holding.instrument._id.toString()) || {};
    const livePrice = Number(quote.lastPrice);
    const fallbackPrice = Number(holding.averageCost || 0);
    const currentPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : fallbackPrice;
    const value = roundMoney(Number(holding.quantity) * currentPrice);
    const currentUnrealized = roundMoney(value - Number(holding.costBasis || 0));

    invested += Number(holding.costBasis || 0);
    marketValue += value;
    realizedPnl += Number(holding.realizedPnl || 0);
    unrealizedPnl += currentUnrealized;

    return {
      _id: holding._id,
      account: holding.account,
      instrument: serializeInstrument(holding.instrument),
      quantity: holding.quantity,
      averageCost: holding.averageCost,
      costBasis: holding.costBasis,
      realizedPnl: holding.realizedPnl,
      currentPrice,
      marketValue: value,
      unrealizedPnl: currentUnrealized,
      totalPnl: roundMoney(currentUnrealized + Number(holding.realizedPnl || 0)),
      quote,
      research: researchLinksForInstrument(holding.instrument),
    };
  });

  invested = roundMoney(invested);
  marketValue = roundMoney(marketValue);
  realizedPnl = roundMoney(realizedPnl);
  unrealizedPnl = roundMoney(unrealizedPnl);

  return {
    holdings: items,
    summary: {
      currency: "INR",
      invested,
      marketValue,
      unrealizedPnl,
      realizedPnl,
      totalPnl: roundMoney(unrealizedPnl + realizedPnl),
      returnPercent: invested > 0 ? ((marketValue - invested) / invested) * 100 : 0,
      holdings: items.length,
    },
    market: {
      live: Boolean(quoteResult.live),
      warning: quoteResult.warning || null,
    },
  };
};

const getInvestmentTradesForUser = async ({ userId, limit = 50 }) =>
  InvestmentTrade.find({ user: userId })
    .sort({ tradeDate: -1, createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 100))
    .populate("account", "name currency")
    .populate("instrument", "name shortName tradingSymbol exchange instrumentKey");

const getWatchlistForUser = async ({ userId }) => {
  const items = await InvestmentWatchlistItem.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("instrument");
  const instruments = items.map((item) => item.instrument).filter(Boolean);
  const quoteResult = await getQuotesForInstruments({ instruments, allowStale: true });
  const quoteMap = buildQuoteMap(quoteResult.quotes);

  return {
    items: items.map((item) => ({
      _id: item._id,
      instrument: serializeInstrument(item.instrument),
      quote: quoteMap.get(item.instrument._id.toString()) || null,
      research: researchLinksForInstrument(item.instrument),
    })),
    market: { live: Boolean(quoteResult.live), warning: quoteResult.warning || null },
  };
};

const addWatchlistItemForUser = async ({ userId, instrumentId }) => {
  const instrument = await ensureInstrument({ instrumentId });
  const item = await InvestmentWatchlistItem.findOneAndUpdate(
    { user: userId, instrument: instrument._id },
    { $setOnInsert: { user: userId, instrument: instrument._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).populate("instrument");

  return {
    _id: item._id,
    instrument: serializeInstrument(item.instrument),
    research: researchLinksForInstrument(item.instrument),
  };
};

const removeWatchlistItemForUser = async ({ userId, watchlistId }) => {
  ensureObjectId(watchlistId, "watchlist item ID");
  const deleted = await InvestmentWatchlistItem.findOneAndDelete({ _id: watchlistId, user: userId });
  if (!deleted) throw new AppError("Watchlist item not found", 404);
};

const getInstrumentQuoteForUser = async ({ instrumentId }) => {
  const instrument = await ensureInstrument({ instrumentId });
  const quoteResult = await getQuotesForInstruments({ instruments: [instrument], allowStale: false });
  return {
    instrument: serializeInstrument(instrument),
    quote: quoteResult.quotes[0] || null,
    market: { live: Boolean(quoteResult.live), warning: quoteResult.warning || null },
    research: researchLinksForInstrument(instrument),
  };
};

export {
  addWatchlistItemForUser,
  createInvestmentTradeForUser,
  getInstrumentQuoteForUser,
  getInvestmentAccountsForUser,
  getInvestmentTradesForUser,
  getPortfolioForUser,
  getWatchlistForUser,
  removeWatchlistItemForUser,
  searchInvestments,
};
