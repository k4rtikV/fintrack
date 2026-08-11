import mongoose from "mongoose";

import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";
import { endOfUtcDateOnly, toUtcDateOnly } from "../utils/dateOnly.js";
import { syncBudgetAlertsForTransaction } from "./notification.service.js";

const getBalanceAdjustment = (type, amount) => {
  return type === "INCOME" ? amount : -amount;
};

const ensureAccountBelongsToUser = async ({
  accountId,
  userId,
  session,
  includeArchived = false,
}) => {
  const filter = {
    _id: accountId,
    user: userId,
  };

  if (!includeArchived) {
    filter.isArchived = false;
  }

  const account = await Account.findOne(filter).session(session);

  if (!account) {
    throw new AppError(
      includeArchived ? "Account not found" : "Account not found or archived",
      404,
    );
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
  const filter = {
    _id: categoryId,
    user: userId,
  };

  if (!includeArchived) {
    filter.isArchived = false;
  }

  const category = await Category.findOne(filter).session(session);

  if (!category) {
    throw new AppError(
      includeArchived ? "Category not found" : "Category not found or archived",
      404,
    );
  }

  if (category.type !== type) {
    throw new AppError(
      `An ${type.toLowerCase()} transaction must use an ${type.toLowerCase()} category`,
      400,
    );
  }

  return category;
};

const createTransactionForUser = async ({
  userId,
  accountId,
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
    const account = await ensureAccountBelongsToUser({
      accountId,
      userId,
      session,
    });

    await ensureCategoryBelongsToUser({
      categoryId,
      userId,
      type,
      session,
    });

    const adjustment = getBalanceAdjustment(type, amount);

    account.balance += adjustment;

    await account.save({
      session,
      validateModifiedOnly: true,
    });

    const createdTransactions = await Transaction.create(
      [
        {
          user: userId,
          account: accountId,
          category: categoryId,
          type,
          amount,
          title,
          note,
          transactionDate: toUtcDateOnly(transactionDate),
          paymentMethod,
          tags,
        },
      ],
      {
        session,
      },
    );

    createdTransaction = createdTransactions[0];
  });

  const populatedTransaction = await Transaction.findById(createdTransaction._id)
    .populate("account", "name type currency balance")
    .populate("category", "name type icon color");

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
  const filter = {
    user: userId,
  };

  if (accountId) {
    filter.account = accountId;
  }

  if (categoryId) {
    filter.category = categoryId;
  }

  if (type) {
    filter.type = type;
  }

  if (search?.trim()) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchPattern = new RegExp(escapedSearch, "i");

    filter.$or = [
      { title: searchPattern },
      { note: searchPattern },
      { tags: searchPattern },
      { paymentMethod: searchPattern },
    ];
  }

  if (startDate || endDate) {
    filter.transactionDate = {};

    if (startDate) {
      filter.transactionDate.$gte = toUtcDateOnly(startDate);
    }

    if (endDate) {
      filter.transactionDate.$lte = endOfUtcDateOnly(endDate);
    }
  }

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const allowedSortFields = new Set(["transactionDate", "amount", "title", "createdAt"]);
  const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "transactionDate";
  const safeSortOrder = sortOrder === "asc" ? 1 : -1;

  const sort = { [safeSortBy]: safeSortOrder };

  if (safeSortBy !== "createdAt") {
    sort.createdAt = -1;
  }

  const [initialTransactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate("account", "name type currency")
      .populate("category", "name type icon color")
      .sort(sort)
      .skip(skip)
      .limit(safeLimit),

    Transaction.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / safeLimit);
  const resolvedPage = pages > 0 ? Math.min(safePage, pages) : 1;
  let transactions = initialTransactions;

  if (total > 0 && resolvedPage !== safePage) {
    transactions = await Transaction.find(filter)
      .populate("account", "name type currency")
      .populate("category", "name type icon color")
      .sort(sort)
      .skip((resolvedPage - 1) * safeLimit)
      .limit(safeLimit);
  }

  return {
    transactions,
    pagination: {
      page: resolvedPage,
      limit: safeLimit,
      total,
      pages,
    },
  };
};

const getTransactionByIdForUser = async ({
  transactionId,
  userId,
}) => {
  if (!mongoose.isValidObjectId(transactionId)) {
    throw new AppError("Invalid transaction ID", 400);
  }

  const transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId,
  })
    .populate("account", "name type currency")
    .populate("category", "name type icon color");

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  return transaction;
};

const updateTransactionForUser = async ({
  transactionId,
  userId,
  updates,
}) => {
  let updatedTransaction;

  await mongoose.connection.transaction(async (session) => {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId,
    }).session(session);

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    const oldAccount = await ensureAccountBelongsToUser({
      accountId: transaction.account,
      userId,
      session,
      includeArchived: true,
    });

    const nextType = updates.type ?? transaction.type;
    const nextAmount = updates.amount ?? transaction.amount;
    const nextAccountId = updates.accountId ?? transaction.account.toString();
    const nextCategoryId =
      updates.categoryId ?? transaction.category.toString();

    const accountChanged = !oldAccount._id.equals(nextAccountId);
    const categoryChanged =
      transaction.category.toString() !== nextCategoryId ||
      transaction.type !== nextType;

    const nextAccount = accountChanged
      ? await ensureAccountBelongsToUser({
          accountId: nextAccountId,
          userId,
          session,
        })
      : oldAccount;

    await ensureCategoryBelongsToUser({
      categoryId: nextCategoryId,
      userId,
      type: nextType,
      session,
      includeArchived: !categoryChanged,
    });

    const oldAdjustment = getBalanceAdjustment(
      transaction.type,
      transaction.amount,
    );

    const nextAdjustment = getBalanceAdjustment(
      nextType,
      nextAmount,
    );

    oldAccount.balance -= oldAdjustment;

    if (oldAccount._id.equals(nextAccount._id)) {
      oldAccount.balance += nextAdjustment;

      await oldAccount.save({
        session,
        validateModifiedOnly: true,
      });
    } else {
      nextAccount.balance += nextAdjustment;

      await oldAccount.save({
        session,
        validateModifiedOnly: true,
      });

      await nextAccount.save({
        session,
        validateModifiedOnly: true,
      });
    }

    const fieldMap = {
      accountId: "account",
      categoryId: "category",
      type: "type",
      amount: "amount",
      title: "title",
      note: "note",
      transactionDate: "transactionDate",
      paymentMethod: "paymentMethod",
      tags: "tags",
    };

    for (const [inputField, modelField] of Object.entries(fieldMap)) {
      if (updates[inputField] !== undefined) {
        transaction[modelField] =
          inputField === "transactionDate"
            ? toUtcDateOnly(updates[inputField])
            : updates[inputField];
      }
    }

    await transaction.save({
      session,
      validateModifiedOnly: true,
    });

    updatedTransaction = transaction;
  });

  const populatedTransaction = await Transaction.findById(updatedTransaction._id)
    .populate("account", "name type currency balance")
    .populate("category", "name type icon color");

  if (populatedTransaction.type === "EXPENSE") {
    await syncBudgetAlertsForTransaction({
      userId,
      categoryId: populatedTransaction.category._id,
      transactionDate: populatedTransaction.transactionDate,
    });
  }

  return populatedTransaction;
};

const deleteTransactionForUser = async ({
  transactionId,
  userId,
}) => {
  await mongoose.connection.transaction(async (session) => {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId,
    }).session(session);

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    const account = await Account.findOne({
      _id: transaction.account,
      user: userId,
    }).session(session);

    if (!account) {
      throw new AppError(
        "The account associated with this transaction no longer exists",
        409,
      );
    }

    const adjustment = getBalanceAdjustment(
      transaction.type,
      transaction.amount,
    );

    account.balance -= adjustment;

    await account.save({
      session,
      validateModifiedOnly: true,
    });

    await transaction.deleteOne({
      session,
    });
  });
};

export {
  createTransactionForUser,
  deleteTransactionForUser,
  getTransactionByIdForUser,
  getTransactionsForUser,
  updateTransactionForUser,
};