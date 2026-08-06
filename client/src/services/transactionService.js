import api from "../api/axios";

const getTransactions = async (params = {}) => {
  const response = await api.get("/transactions", { params });
  return { transactions: response.data.data.transactions, pagination: response.data.pagination };
};

const getTransactionsForExport = async (params = {}) => {
  const response = await api.get("/transactions", { params: { ...params, page: 1, limit: 100 } });
  return response.data.data.transactions;
};

const createTransaction = async (payload) => (await api.post("/transactions", payload)).data;
const updateTransaction = async ({ transactionId, payload }) => (await api.patch(`/transactions/${transactionId}`, payload)).data;
const deleteTransaction = async (transactionId) => (await api.delete(`/transactions/${transactionId}`)).data;
const getAccounts = async () => (await api.get("/accounts")).data.data.accounts;
const getCategories = async (type) => (await api.get("/categories", { params: type ? { type } : {} })).data.data.categories;

export { createTransaction, deleteTransaction, getAccounts, getCategories, getTransactions, getTransactionsForExport, updateTransaction };
