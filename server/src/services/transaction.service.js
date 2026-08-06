import mongoose from "mongoose";

import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";

const getBalanceAdjustment = (type, amount) => {
  return type === "INCOME" ? amount : -amount;
};

const ensureAccountBelongsToUser = async ({
  accountId,
  userId,
  session,
}) => {
  const account = await Account.findOne({
    _id: accountId,
    user: userId,
    isArchived: false,
  }).session(session);

  if (!account) {
    throw new AppError("Account not found or archived", 404);
  }

  return account;
};

const ensureCategoryBelongsToUser = async ({
  categoryId,
  userId,
  type,
  session,
}) => {
  const category = await Category.findOne({
    _id: categoryId,
    user: userId,
    isArchived: false,
  }).session(session);

  if (!category) {
    throw new AppError("Category not found or archived", 404);
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
          transactionDate,
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

  return Transaction.findById(createdTransaction._id)
    .populate("account", "name type currency balance")
    .populate("category", "name type icon color");
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
      filter.transactionDate.$gte = new Date(startDate);
    }

    if (endDate) {
      filter.transactionDate.$lte = new Date(endDate);
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

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate("account", "name type currency")
      .populate("category", "name type icon color")
      .sort(sort)
      .skip(skip)
      .limit(safeLimit),

    Transaction.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
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
    });

    const nextType = updates.type ?? transaction.type;
    const nextAmount = updates.amount ?? transaction.amount;
    const nextAccountId = updates.accountId ?? transaction.account.toString();
    const nextCategoryId =
      updates.categoryId ?? transaction.category.toString();

    const nextAccount = await ensureAccountBelongsToUser({
      accountId: nextAccountId,
      userId,
      session,
    });

    await ensureCategoryBelongsToUser({
      categoryId: nextCategoryId,
      userId,
      type: nextType,
      session,
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
        transaction[modelField] = updates[inputField];
      }
    }

    await transaction.save({
      session,
      validateModifiedOnly: true,
    });

    updatedTransaction = transaction;
  });

  return Transaction.findById(updatedTransaction._id)
    .populate("account", "name type currency balance")
    .populate("category", "name type icon color");
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