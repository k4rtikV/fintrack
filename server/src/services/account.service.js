import mongoose from "mongoose";

import Account from "../models/Account.js";
import AppError from "../utils/AppError.js";

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