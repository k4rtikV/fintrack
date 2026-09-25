import mongoose from "mongoose";

import Account from "../models/Account.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";
import { isAccountCurrencyChangeLocked } from "../utils/financialPolicy.js";

const ensureValidObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid account ID", 400);
  }
};

const createAccountForUser = async ({
  userId,
  name,
  type,
  balance,
  currency,
  color,
  icon,
}) => {
  const existingAccount = await Account.findOne({
    user: userId,
    name,
    isArchived: false,
  });

  if (existingAccount) {
    throw new AppError(
      "You already have an active account with this name",
      409,
    );
  }

  const account = await Account.create({
    user: userId,
    name,
    type,
    balance,
    currency,
    color,
    icon,
  });

  return account;
};

const getAccountsForUser = async ({
  userId,
  includeArchived = false,
}) => {
  const filter = {
    user: userId,
  };

  if (!includeArchived) {
    filter.isArchived = false;
  }

  return Account.find(filter).sort({
    isArchived: 1,
    createdAt: -1,
  });
};

const getAccountByIdForUser = async ({
  accountId,
  userId,
  includeArchived = false,
}) => {
  ensureValidObjectId(accountId);

  const filter = {
    _id: accountId,
    user: userId,
  };

  if (!includeArchived) {
    filter.isArchived = false;
  }

  const account = await Account.findOne(filter);

  if (!account) {
    throw new AppError("Account not found", 404);
  }

  return account;
};

const updateAccountForUser = async ({
  accountId,
  userId,
  updates,
}) => {
  const account = await getAccountByIdForUser({
    accountId,
    userId,
  });

  if (updates.name && updates.name !== account.name) {
    const duplicateAccount = await Account.findOne({
      user: userId,
      name: updates.name,
      isArchived: false,
      _id: {
        $ne: account._id,
      },
    });

    if (duplicateAccount) {
      throw new AppError(
        "You already have an active account with this name",
        409,
      );
    }
  }

  if (updates.currency && updates.currency !== account.currency) {
    const [transactionReference, recurringReference] = await Promise.all([
      Transaction.exists({
        user: userId,
        account: account._id,
      }),
      RecurringTransaction.exists({
        user: userId,
        account: account._id,
      }),
    ]);

    if (
      isAccountCurrencyChangeLocked({
        currentCurrency: account.currency,
        nextCurrency: updates.currency,
        hasFinancialReferences: Boolean(
          transactionReference || recurringReference,
        ),
        currentBalance: account.balance,
      })
    ) {
      throw new AppError(
        "Account currency can only be changed while the account is unused and has a zero balance. Archive this account and create a new account for a different currency.",
        409,
        { code: "ACCOUNT_CURRENCY_LOCKED" },
      );
    }
  }

  const allowedFields = [
    "name",
    "type",
    "currency",
    "color",
    "icon",
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      account[field] = updates[field];
    }
  }

  await account.save();

  return account;
};

const archiveAccountForUser = async ({
  accountId,
  userId,
}) => {
  const account = await getAccountByIdForUser({
    accountId,
    userId,
  });

  const activeRecurringCount = await RecurringTransaction.countDocuments({
    user: userId,
    account: account._id,
    isActive: true,
  });

  if (activeRecurringCount > 0) {
    throw new AppError(
      `Pause, update, or delete ${activeRecurringCount} active recurring schedule${
        activeRecurringCount === 1 ? "" : "s"
      } using this account before archiving it`,
      409,
    );
  }

  account.isArchived = true;
  await account.save();

  return account;
};

export {
  archiveAccountForUser,
  createAccountForUser,
  getAccountByIdForUser,
  getAccountsForUser,
  updateAccountForUser,
};