import mongoose from "mongoose";

import Transaction from "../models/Transaction.js";
import InvestmentTrade from "../models/InvestmentTrade.js";
import InvestmentInstrument from "../models/InvestmentInstrument.js";
import { endOfUtcDateOnly, toUtcDateOnly } from "../utils/dateOnly.js";

const investmentTypes = new Set(["INVESTMENT", "INVESTMENT_BUY", "INVESTMENT_SELL"]);
const ordinaryTypes = new Set(["INCOME", "EXPENSE", "TRANSFER"]);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One read-only, server-paginated view. InvestmentTrade remains the only investment
// ledger; it is never copied to Transaction or treated as income/expense.
const buildActivityPipeline = ({ userId, accountId, categoryId, type, startDate, endDate, search, sortBy = "transactionDate", sortOrder = "desc", page = 1, limit = 20 }) => {
  const user = new mongoose.Types.ObjectId(userId);
  const account = accountId ? new mongoose.Types.ObjectId(accountId) : null;
  const category = categoryId ? new mongoose.Types.ObjectId(categoryId) : null;
  const dateRange = {};
  if (startDate) dateRange.$gte = toUtcDateOnly(startDate);
  if (endDate) dateRange.$lte = endOfUtcDateOnly(endDate);
  const pattern = search?.trim() ? new RegExp(escapeRegex(search.trim()), "i") : null;

  const ordinary = { user };
  if (account) ordinary.$or = [{ account }, { destinationAccount: account }];
  if (category) ordinary.category = category;
  if (ordinaryTypes.has(type)) ordinary.type = type;
  if (investmentTypes.has(type)) ordinary._id = { $exists: false };
  if (Object.keys(dateRange).length) ordinary.transactionDate = dateRange;
  if (pattern) {
    ordinary.$and = [{ $or: [{ title: pattern }, { note: pattern }, { tags: pattern }, { paymentMethod: pattern }] }];
  }

  const trade = { user };
  if (account) trade.account = account;
  if (type === "INVESTMENT_BUY") trade.type = "BUY";
  if (type === "INVESTMENT_SELL") trade.type = "SELL";
  if (category || ordinaryTypes.has(type)) trade._id = { $exists: false };
  if (Object.keys(dateRange).length) trade.tradeDate = dateRange;

  const tradePipeline = [
    { $match: trade },
    { $lookup: { from: InvestmentInstrument.collection.name, localField: "instrument", foreignField: "_id", as: "instrumentDetails" } },
    { $set: { instrumentDetails: { $first: "$instrumentDetails" } } },
    { $set: {
      recordKind: "INVESTMENT_TRADE",
      transactionDate: "$tradeDate",
      amount: { $abs: "$netCashAmount" },
      title: { $concat: [{ $ifNull: ["$instrumentDetails.tradingSymbol", "Share"] }, " · ", { $cond: [{ $eq: ["$type", "BUY"] }, "Buy ", "Sell "] }, { $toString: "$quantity" }, " shares"] },
      paymentMethod: "INVESTMENT",
      category: null,
      destinationAccount: null,
    } },
  ];
  if (pattern) tradePipeline.push({ $match: { $or: [{ title: pattern }, { note: pattern }, { "instrumentDetails.name": pattern }, { "instrumentDetails.shortName": pattern }, { "instrumentDetails.exchange": pattern }] } });
  tradePipeline.push({ $set: { type: { $concat: ["INVESTMENT_", "$type"] } } }, { $unset: "instrumentDetails" });

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const allowed = new Set(["transactionDate", "amount", "title", "createdAt"]);
  const field = allowed.has(sortBy) ? sortBy : "transactionDate";
  const direction = sortOrder === "asc" ? 1 : -1;
  const sort = { [field]: direction, createdAt: -1, _id: -1 };

  return {
    safePage,
    safeLimit,
    pipeline: [
      { $match: ordinary },
      { $set: { recordKind: "TRANSACTION" } },
      { $unionWith: { coll: InvestmentTrade.collection.name, pipeline: tradePipeline } },
      { $facet: {
        rows: [{ $sort: sort }, { $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit }],
        counts: [{ $count: "total" }],
      } },
    ],
  };
};

const getActivityForUser = async (filters) => {
  const { safePage, safeLimit, pipeline } = buildActivityPipeline(filters);
  const [result] = await Transaction.aggregate(pipeline).allowDiskUse(true);
  const total = result?.counts?.[0]?.total || 0;
  const pages = Math.ceil(total / safeLimit);
  const resolvedPage = pages ? Math.min(safePage, pages) : 1;
  let rows = result?.rows || [];
  if (total && resolvedPage !== safePage) {
    const corrected = buildActivityPipeline({ ...filters, page: resolvedPage });
    const [correctedResult] = await Transaction.aggregate(corrected.pipeline).allowDiskUse(true);
    rows = correctedResult?.rows || [];
  }

  const ordinaryRows = rows.filter((row) => row.recordKind === "TRANSACTION");
  const tradeRows = rows.filter((row) => row.recordKind === "INVESTMENT_TRADE");
  await Promise.all([
    Transaction.populate(ordinaryRows, [
      { path: "account", select: "name type currency isArchived" },
      { path: "destinationAccount", select: "name type currency isArchived" },
      { path: "category", select: "name type icon color isArchived" },
    ]),
    InvestmentTrade.populate(tradeRows, [
      { path: "account", select: "name type currency isArchived" },
      { path: "instrument", select: "tradingSymbol name shortName exchange instrumentKey" },
    ]),
  ]);
  return { transactions: rows, pagination: { page: resolvedPage, limit: safeLimit, total, pages } };
};

export { buildActivityPipeline, getActivityForUser };
