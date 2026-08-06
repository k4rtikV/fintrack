import api from "../api/axios";

const getTransactions = async (params = {}) => {
  const response = await api.get("/transactions", { params });

  return {
    transactions: response.data.data.transactions,
    pagination: response.data.pagination,
  };
};

const createTransaction = async (payload) => {
  const response = await api.post("/transactions", payload);
  return response.data;
};

const updateTransaction = async ({ transactionId, payload }) => {
  const response = await api.patch(
    `/transactions/${transactionId}`,
    payload,
  );

  return response.data;
};

const deleteTransaction = async (transactionId) => {
  const response = await api.delete(`/transactions/${transactionId}`);
  return response.data;
};

const getAccounts = async () => {
  const response = await api.get("/accounts");
  return response.data.data.accounts;
};

const getCategories = async (type) => {
  const response = await api.get("/categories", {
    params: type ? { type } : {},
  });

  return response.data.data.categories;
};

export {
  createTransaction,
  deleteTransaction,
  getAccounts,
  getCategories,
  getTransactions,
  updateTransaction,
};
