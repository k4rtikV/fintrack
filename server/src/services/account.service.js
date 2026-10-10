import mongoose from "mongoose";

import Account from "../models/Account.js";
import InvestmentHolding from "../models/InvestmentHolding.js";
import InvestmentLot from "../models/InvestmentLot.js";
import StatementImportBatch from "../models/StatementImportBatch.js";
import StatementImportEntry from "../models/StatementImportEntry.js";
import InvestmentTrade from "../models/InvestmentTrade.js";
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

const updateAccountForUser = async ({ accountId, userId, updates }) => {
  ensureValidObjectId(accountId);
  // A financial operation also writes its account balance in a MongoDB
  // transaction. Protect type/currency checks and this account write with
  // the same transactional conflict boundary to prevent an import/trade race.
  return mongoose.connection.transaction(async (session) => {
    const account = await Account.findOne({
      _id: accountId, user: userId, isArchived: false,
    }).session(session);
    if (!account) throw new AppError("Account not found", 404);

    if (updates.name && updates.name !== account.name) {
      const duplicateAccount = await Account.findOne({
        user: userId,
        name: updates.name,
        isArchived: false,
        _id: { $ne: account._id },
      }).session(session);
      if (duplicateAccount) throw new AppError("You already have an active account with this name", 409);
    }

    const changingType = updates.type && updates.type !== account.type;
    const changingCurrency = updates.currency && updates.currency !== account.currency;
    if (changingType && updates.type === "INVESTMENT" && account.currency !== "INR") {
      throw new AppError("Investment accounts require INR. Preserve this legacy-currency account and create a new INR investment account.", 409, {
        code: "INVESTMENT_ACCOUNT_CURRENCY_UNSUPPORTED",
      });
    }
    if (changingType || changingCurrency) {
      const accountReferences = { user: userId, $or: [
        { account: account._id }, { destinationAccount: account._id },
      ] };
      // Sequential operations: Mongoose explicitly forbids Promise.all on a
      // single transaction session. Includes historical/imported references.
      const referenced = Boolean(
        await Transaction.exists(accountReferences).session(session) ||
        await RecurringTransaction.exists(accountReferences).session(session) ||
        await InvestmentTrade.exists({ user: userId, account: account._id }).session(session) ||
        await InvestmentHolding.exists({ user: userId, account: account._id }).session(session) ||
        await InvestmentLot.exists({ user: userId, account: account._id }).session(session) ||
        await StatementImportEntry.exists({ user: userId, account: account._id }).session(session) ||
        await StatementImportBatch.exists({ user: userId, account: account._id }).session(session)
      );
      if (changingType && referenced) {
        throw new AppError(
          "Account type cannot change after transactions, Autopay rules, imports, or investment activity. Create a new account instead.",
          409, { code: "ACCOUNT_TYPE_LOCKED" },
        );
      }
      if (changingCurrency && isAccountCurrencyChangeLocked({
        currentCurrency: account.currency, nextCurrency: updates.currency,
        hasFinancialReferences: referenced, currentBalance: account.balance,
      })) {
        throw new AppError(
          "Account currency can only be changed while the account is unused and has a zero balance. Archive this account and create a new account for a different currency.",
          409, { code: "ACCOUNT_CURRENCY_LOCKED" },
        );
      }
    }

    for (const field of ["name", "type", "currency", "color", "icon"]) {
      if (updates[field] !== undefined) account[field] = updates[field];
    }
    await account.save({ session });
    return account;
  });
};

const archiveAccountForUser = async ({
  accountId,
  userId,
}) => {
  const account = await getAccountByIdForUser({
    accountId,
    userId,
  });

  const [activeRecurringCount, openHoldingCount] = await Promise.all([
    RecurringTransaction.countDocuments({
      user: userId,
      isActive: true,
      $or: [
        { account: account._id },
        { destinationAccount: account._id },
      ],
    }),
    InvestmentHolding.countDocuments({
      user: userId,
      account: account._id,
      quantity: { $gt: 0 },
    }),
  ]);

  if (activeRecurringCount > 0) {
    throw new AppError(
      `Pause, update, or delete ${activeRecurringCount} active Autopay rule${
        activeRecurringCount === 1 ? "" : "s"
      } using this account before archiving it`,
      409,
    );
  }

  if (openHoldingCount > 0) {
    throw new AppError(
      `Sell or move the ${openHoldingCount} open investment holding${openHoldingCount === 1 ? "" : "s"} in this account before archiving it`,
      409,
      { code: "INVESTMENT_ACCOUNT_HAS_OPEN_HOLDINGS" },
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