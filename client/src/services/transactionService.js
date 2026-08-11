import api from "../api/axios";

const getTransactions = async (params = {}) => {
  const response = await api.get("/transactions", { params });
  return {
    transactions: response.data.data.transactions,
    pagination: response.data.pagination,
  };
};

const getTransactionsForExport = async (params = {}) => {
  const exportFilters = { ...params };
  delete exportFilters.page;
  delete exportFilters.limit;

  const pageSize = 100;
  const transactions = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await api.get("/transactions", {
      params: {
        ...exportFilters,
        page,
        limit: pageSize,
      },
    });

    const rows = response.data.data.transactions || [];
    transactions.push(...rows);

    const pagination = response.data.pagination;
    totalPages = Math.max(Number(pagination?.pages) || 0, 1);
    page += 1;

    if (rows.length === 0) break;
  } while (page <= totalPages);

  return transactions;
};

const createTransaction = async (payload) =>
  (await api.post("/transactions", payload)).data;

const updateTransaction = async ({ transactionId, payload }) =>
  (await api.patch(`/transactions/${transactionId}`, payload)).data;

const deleteTransaction = async (transactionId) =>
  (await api.delete(`/transactions/${transactionId}`)).data;

const getAccounts = async () =>
  (await api.get("/accounts")).data.data.accounts;

const getCategories = async (type) =>
  (
    await api.get("/categories", {
      params: type ? { type } : {},
    })
  ).data.data.categories;

export {
  createTransaction,
  deleteTransaction,
  getAccounts,
  getCategories,
  getTransactions,
  getTransactionsForExport,
  updateTransaction,
};
