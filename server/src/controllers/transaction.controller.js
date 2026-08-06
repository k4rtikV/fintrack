import {
  createTransactionForUser,
  deleteTransactionForUser,
  getTransactionByIdForUser,
  getTransactionsForUser,
  updateTransactionForUser,
} from "../services/transaction.service.js";

const createTransaction = async (req, res) => {
  const transaction = await createTransactionForUser({
    userId: req.user._id,
    ...req.validatedData.body,
  });

  res.status(201).json({
    success: true,
    message: "Transaction created successfully",
    data: {
      transaction,
    },
  });
};

const getTransactions = async (req, res) => {
  const result = await getTransactionsForUser({
    userId: req.user._id,
    accountId: req.query.accountId,
    categoryId: req.query.categoryId,
    type: req.query.type?.toUpperCase(),
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    results: result.transactions.length,
    pagination: result.pagination,
    data: {
      transactions: result.transactions,
    },
  });
};

const getTransaction = async (req, res) => {
  const transaction = await getTransactionByIdForUser({
    transactionId: req.validatedData.params.transactionId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    data: {
      transaction,
    },
  });
};

const updateTransaction = async (req, res) => {
  const transaction = await updateTransactionForUser({
    transactionId: req.validatedData.params.transactionId,
    userId: req.user._id,
    updates: req.validatedData.body,
  });

  res.status(200).json({
    success: true,
    message: "Transaction updated successfully",
    data: {
      transaction,
    },
  });
};

const deleteTransaction = async (req, res) => {
  await deleteTransactionForUser({
    transactionId: req.validatedData.params.transactionId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: "Transaction deleted and account balance restored",
  });
};

export {
  createTransaction,
  deleteTransaction,
  getTransaction,
  getTransactions,
  updateTransaction,
};