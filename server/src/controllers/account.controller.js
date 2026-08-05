import {
  archiveAccountForUser,
  createAccountForUser,
  getAccountByIdForUser,
  getAccountsForUser,
  updateAccountForUser,
} from "../services/account.service.js";

const createAccount = async (req, res) => {
  const account = await createAccountForUser({
    userId: req.user._id,
    ...req.validatedData.body,
  });

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: {
      account,
    },
  });
};

const getAccounts = async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";

  const accounts = await getAccountsForUser({
    userId: req.user._id,
    includeArchived,
  });

  res.status(200).json({
    success: true,
    results: accounts.length,
    data: {
      accounts,
    },
  });
};

const getAccount = async (req, res) => {
  const account = await getAccountByIdForUser({
    accountId: req.validatedData.params.accountId,
    userId: req.user._id,
    includeArchived: true,
  });

  res.status(200).json({
    success: true,
    data: {
      account,
    },
  });
};

const updateAccount = async (req, res) => {
  const account = await updateAccountForUser({
    accountId: req.validatedData.params.accountId,
    userId: req.user._id,
    updates: req.validatedData.body,
  });

  res.status(200).json({
    success: true,
    message: "Account updated successfully",
    data: {
      account,
    },
  });
};

const archiveAccount = async (req, res) => {
  const account = await archiveAccountForUser({
    accountId: req.validatedData.params.accountId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: "Account archived successfully",
    data: {
      account,
    },
  });
};

export {
  archiveAccount,
  createAccount,
  getAccount,
  getAccounts,
  updateAccount,
};