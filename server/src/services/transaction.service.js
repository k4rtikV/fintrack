import mongoose from "mongoose";

import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";
import { endOfUtcDateOnly, toUtcDateOnly } from "../utils/dateOnly.js";
import { buildBalanceDeltas, mergeBalanceDeltas } from "../utils/transactionSemantics.js";
import { syncBudgetAlertsForTransaction } from "./notification.service.js";

const ensureAccountBelongsToUser = async ({
  accountId,
  userId,
  session,
  includeArchived = false,
}) => {
  const filter = { _id: accountId, user: userId };
  if (!includeArchived) filter.isArchived = false;

  const query = Account.findOne(filter);
  if (session) query.session(session);
  const account = await query;

  if (!account) {
    throw new AppError(includeArchived ? "Account not found" : "Account not found or archived", 404);
  }
  return account;
};

const ensureCategoryBelongsToUser = async ({
  categoryId,
  userId,
  type,
  session,
  includeArchived = false,
}) => {
  if (!categoryId) throw new AppError("Category is required", 400);
  const filter = { _id: categoryId, user: userId };
  if (!includeArchived) filter.isArchived = false;

  const query = Category.findOne(filter);
  if (session) query.session(session);
  const category = await query;

  if (!category) {
    throw new AppError(includeArchived ? "Category not found" : "Category not found or archived", 404);
  }
  if (category.type !== type) {
    throw new AppError(`An ${type.toLowerCase()} transaction must use an ${type.toLowerCase()} category`, 400);
  }
  return category;
};

const ensureTransferPair = async ({
  sourceAccountId,
  destinationAccountId,
  userId,
  session,
  sourceIncludeArchived = false,
  destinationIncludeArchived = false,
}) => {
  if (!destinationAccountId) throw new AppError("Destination account is required for a transfer", 400);
  if (sourceAccountId.toString() === destinationAccountId.toString()) {
    throw new AppError("Transfer destination must be different from the source account", 400);
  }

  const [sourceAccount, destinationAccount] = await Promise.all([
    ensureAccountBelongsToUser({ accountId: sourceAccountId, userId, session, includeArchived: sourceIncludeArchived }),
    ensureAccountBelongsToUser({ accountId: destinationAccountId, userId, session, includeArchived: destinationIncludeArchived }),
  ]);

  if (sourceAccount.currency !== destinationAccount.currency) {
    throw new AppError(
      "Transfers between different currencies are not supported yet. Use accounts with the same currency.",
      409,
      { code: "TRANSFER_CURRENCY_MISMATCH" },
    );
  }

  return { sourceAccount, destinationAccount };
};

const populateTransaction = (query) =>
  query
    .populate("account", "name type currency balance isArchived")
    .populate("destinationAccount", "name type currency balance isArchived")
    .populate("category", "name type icon color isArchived");

const applyBalanceDeltas = async ({ deltas, accountDocuments, session }) => {
  for (const [accountId, delta] of deltas.entries()) {
    if (!delta) continue;
    const account = accountDocuments.get(accountId);
    if (!account) throw new AppError("A transaction account could not be resolved", 409);
    account.balance += delta;
    await account.save({ session, validateModifiedOnly: true });
  }
};

const createTransactionForUser = async ({
  userId,
  accountId,
  destinationAccountId,
  categoryId,
  type,
  amount,
  title,
  note,
  transactionDate,
  paymentMethod,
  tags,
}) => {
  let createdTransaction;

  await mongoose.connection.transaction(async (session) => {
    const accountDocuments = new Map();

    if (type === "TRANSFER") {
      const { sourceAccount, destinationAccount } = await ensureTransferPair({
        sourceAccountId: accountId,
        destinationAccountId,
        userId,
        session,
      });
      accountDocuments.set(sourceAccount._id.toString(), sourceAccount);
      accountDocuments.set(destinationAccount._id.toString(), destinationAccount);
    } else {
      const account = await ensureAccountBelongsToUser({ accountId, userId, session });
      await ensureCategoryBelongsToUser({ categoryId, userId, type, session });
      accountDocuments.set(account._id.toString(), account);
    }

    const deltas = buildBalanceDeltas({ type, amount, accountId, destinationAccountId });
    await applyBalanceDeltas({ deltas, accountDocuments, session });

    const created = await Transaction.create(
      [{
        user: userId,
        account: accountId,
        destinationAccount: type === "TRANSFER" ? destinationAccountId : null,
        category: type === "TRANSFER" ? null : categoryId,
        type,
        amount,
        title,
        note,
        transactionDate: toUtcDateOnly(transactionDate),
        paymentMethod: type === "TRANSFER" && paymentMethod === "OTHER" ? "BANK_TRANSFER" : paymentMethod,
        tags,
      }],
      { session },
    );
    createdTransaction = created[0];
  });

  const populatedTransaction = await populateTransaction(Transaction.findById(createdTransaction._id));
  if (populatedTransaction.type === "EXPENSE") {
    await syncBudgetAlertsForTransaction({
      userId,
      categoryId: populatedTransaction.category._id,
      transactionDate: populatedTransaction.transactionDate,
    });
  }
  return populatedTransaction;
};

const getTransactionsForUser = async ({
  userId,
  accountId,
  categoryId,
  type,
  startDate,
  endDate,
  search,
  sortBy = "transactionDate",
  sortOrder = "desc",
  page = 1,
  limit = 20,
}) => {
  const filter = { user: userId };
  const clauses = [];

  if (accountId) clauses.push({ $or: [{ account: accountId }, { destinationAccount: accountId }] });
  if (categoryId) filter.category = categoryId;
  if (type) filter.type = type;

  if (search?.trim()) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchPattern = new RegExp(escapedSearch, "i");
    clauses.push({ $or: [{ title: searchPattern }, { note: searchPattern }, { tags: searchPattern }, { paymentMethod: searchPattern }] });
  }

  if (clauses.length) filter.$and = clauses;
  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) filter.transactionDate.$gte = toUtcDateOnly(startDate);
    if (endDate) filter.transactionDate.$lte = endOfUtcDateOnly(endDate);
  }

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const allowedSortFields = new Set(["transactionDate", "amount", "title", "createdAt"]);
  const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "transactionDate";
  const safeSortOrder = sortOrder === "asc" ? 1 : -1;
  const sort = { [safeSortBy]: safeSortOrder };
  if (safeSortBy !== "createdAt") sort.createdAt = -1;

  const fetchPage = (resolvedPage) =>
    populateTransaction(Transaction.find(filter))
      .sort(sort)
      .skip((resolvedPage - 1) * safeLimit)
      .limit(safeLimit);

  const [initialTransactions, total] = await Promise.all([
    fetchPage(safePage),
    Transaction.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / safeLimit);
  const resolvedPage = pages > 0 ? Math.min(safePage, pages) : 1;
  const transactions = total > 0 && resolvedPage !== safePage ? await fetchPage(resolvedPage) : initialTransactions;

  return { transactions, pagination: { page: resolvedPage, limit: safeLimit, total, pages } };
};

const getTransactionByIdForUser = async ({ transactionId, userId }) => {
  if (!mongoose.isValidObjectId(transactionId)) throw new AppError("Invalid transaction ID", 400);
  const transaction = await populateTransaction(Transaction.findOne({ _id: transactionId, user: userId }));
  if (!transaction) throw new AppError("Transaction not found", 404);
  return transaction;
};

const updateTransactionForUser = async ({ transactionId, userId, updates }) => {
  let updatedTransaction;

  await mongoose.connection.transaction(async (session) => {
    const transaction = await Transaction.findOne({ _id: transactionId, user: userId }).session(session);
    if (!transaction) throw new AppError("Transaction not found", 404);

    const oldSource = await ensureAccountBelongsToUser({
      accountId: transaction.account,
      userId,
      session,
      includeArchived: true,
    });
    const oldDestination = transaction.type === "TRANSFER"
      ? await ensureAccountBelongsToUser({ accountId: transaction.destinationAccount, userId, session, includeArchived: true })
      : null;

    const nextType = updates.type ?? transaction.type;
    const nextAmount = updates.amount ?? transaction.amount;
    const nextAccountId = updates.accountId ?? transaction.account.toString();
    const existingDestinationId = transaction.destinationAccount?.toString() || null;
    const nextDestinationAccountId = nextType === "TRANSFER"
      ? (updates.destinationAccountId !== undefined ? updates.destinationAccountId : existingDestinationId)
      : null;
    const existingCategoryId = transaction.category?.toString() || null;
    const nextCategoryId = nextType === "TRANSFER"
      ? null
      : (updates.categoryId !== undefined ? updates.categoryId : existingCategoryId);

    const accountDocuments = new Map([[oldSource._id.toString(), oldSource]]);
    if (oldDestination) accountDocuments.set(oldDestination._id.toString(), oldDestination);

    let nextSource;
    let nextDestination = null;
    if (nextType === "TRANSFER") {
      const pair = await ensureTransferPair({
        sourceAccountId: nextAccountId,
        destinationAccountId: nextDestinationAccountId,
        userId,
        session,
        sourceIncludeArchived: oldSource._id.toString() === nextAccountId.toString(),
        destinationIncludeArchived: Boolean(oldDestination && oldDestination._id.toString() === nextDestinationAccountId?.toString()),
      });
      nextSource = pair.sourceAccount;
      nextDestination = pair.destinationAccount;
    } else {
      nextSource = oldSource._id.toString() === nextAccountId.toString()
        ? oldSource
        : await ensureAccountBelongsToUser({ accountId: nextAccountId, userId, session });
      const categoryChanged = existingCategoryId !== nextCategoryId || transaction.type !== nextType;
      await ensureCategoryBelongsToUser({
        categoryId: nextCategoryId,
        userId,
        type: nextType,
        session,
        includeArchived: !categoryChanged,
      });
    }

    accountDocuments.set(nextSource._id.toString(), nextSource);
    if (nextDestination) accountDocuments.set(nextDestination._id.toString(), nextDestination);

    const reverseOld = buildBalanceDeltas({
      type: transaction.type,
      amount: transaction.amount,
      accountId: transaction.account,
      destinationAccountId: transaction.destinationAccount,
      direction: -1,
    });
    const applyNext = buildBalanceDeltas({
      type: nextType,
      amount: nextAmount,
      accountId: nextAccountId,
      destinationAccountId: nextDestinationAccountId,
    });
    await applyBalanceDeltas({ deltas: mergeBalanceDeltas(reverseOld, applyNext), accountDocuments, session });

    const scalarFields = ["amount", "title", "note", "paymentMethod", "tags"];
    for (const field of scalarFields) if (updates[field] !== undefined) transaction[field] = updates[field];
    if (updates.transactionDate !== undefined) transaction.transactionDate = toUtcDateOnly(updates.transactionDate);
    transaction.type = nextType;
    transaction.account = nextAccountId;
    transaction.destinationAccount = nextType === "TRANSFER" ? nextDestinationAccountId : null;
    transaction.category = nextType === "TRANSFER" ? null : nextCategoryId;
    if (nextType === "TRANSFER" && (!updates.paymentMethod || updates.paymentMethod === "OTHER")) transaction.paymentMethod = "BANK_TRANSFER";

    await transaction.save({ session, validateModifiedOnly: true });
    updatedTransaction = transaction;
  });

  const populatedTransaction = await populateTransaction(Transaction.findById(updatedTransaction._id));
  if (populatedTransaction.type === "EXPENSE") {
    await syncBudgetAlertsForTransaction({
      userId,
      categoryId: populatedTransaction.category._id,
      transactionDate: populatedTransaction.transactionDate,
    });
  }
  return populatedTransaction;
};

const deleteTransactionForUser = async ({ transactionId, userId }) => {
  await mongoose.connection.transaction(async (session) => {
    const transaction = await Transaction.findOne({ _id: transactionId, user: userId }).session(session);
    if (!transaction) throw new AppError("Transaction not found", 404);

    const sourceAccount = await ensureAccountBelongsToUser({ accountId: transaction.account, userId, session, includeArchived: true });
    const accountDocuments = new Map([[sourceAccount._id.toString(), sourceAccount]]);
    if (transaction.type === "TRANSFER") {
      const destinationAccount = await ensureAccountBelongsToUser({ accountId: transaction.destinationAccount, userId, session, includeArchived: true });
      accountDocuments.set(destinationAccount._id.toString(), destinationAccount);
    }

    const deltas = buildBalanceDeltas({
      type: transaction.type,
      amount: transaction.amount,
      accountId: transaction.account,
      destinationAccountId: transaction.destinationAccount,
      direction: -1,
    });
    await applyBalanceDeltas({ deltas, accountDocuments, session });
    await transaction.deleteOne({ session });
  });
};

export {
  createTransactionForUser,
  deleteTransactionForUser,
  getTransactionByIdForUser,
  getTransactionsForUser,
  updateTransactionForUser,
};
