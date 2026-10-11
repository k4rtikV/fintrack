import api from "../api/axios";
import exportTransactionsCsv from "../utils/exportTransactionsCsv";
import { getDateKeyInTimeZone } from "../utils/dateUtils";

const getTransactions = async (params = {}) => {
  const response = await api.get("/transactions/activity", { params });
  return {
    transactions: response.data.data.transactions,
    pagination: response.data.pagination,
  };
};

const getTransactionsForExport = async (params = {}, { signal } = {}) => {
  const exportFilters = { ...params };
  delete exportFilters.page;
  delete exportFilters.limit;

  const pageSize = 100;
  const transactions = [];
  let page = 1;
  let totalPages;

  do {
    if (signal?.aborted) throw Object.assign(new Error("Transaction export canceled"), { code: "ERR_CANCELED" });
    const response = await api.get("/transactions/activity", {
      params: {
        ...exportFilters,
        page,
        limit: pageSize,
      },
      signal,
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

// Route-independent CSV exports behave like the monthly PDF coordinator:
// leaving Transactions doesn't discard the job, re-entry can't duplicate it,
// and PIN lock / logout suppresses any later private file download.
const activeExports = new Map();
const exportListeners = new Set();
const notifyExports = () => exportListeners.forEach((listener) => listener());
const subscribeTransactionExports = (listener) => {
  exportListeners.add(listener);
  return () => exportListeners.delete(listener);
};
const getTransactionExportSnapshot = () => [...activeExports.keys()].sort().join("|");
const cancelPendingTransactionExports = () => {
  for (const job of activeExports.values()) job.controller.abort();
  activeExports.clear();
  notifyExports();
};
const downloadTransactionsCsv = ({ params, userId, timezone }) => {
  const key = String(userId || "active-user");
  const existing = activeExports.get(key);
  if (existing) return existing.promise;
  const controller = new AbortController();
  const promise = getTransactionsForExport(params, { signal: controller.signal })
    .then((rows) => {
      if (controller.signal.aborted) throw Object.assign(new Error("Transaction export canceled"), { code: "ERR_CANCELED" });
      if (!rows.length) return 0;
      exportTransactionsCsv({
        transactions: rows,
        filename: `fintrack-transactions-${getDateKeyInTimeZone(new Date(), timezone)}.csv`,
      });
      return rows.length;
    })
    .finally(() => {
      if (activeExports.get(key)?.controller === controller) {
        activeExports.delete(key);
        notifyExports();
      }
    });
  activeExports.set(key, { controller, promise });
  notifyExports();
  return promise;
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
  cancelPendingTransactionExports, downloadTransactionsCsv,
  getTransactionExportSnapshot, subscribeTransactionExports,
  createTransaction,
  deleteTransaction,
  getAccounts,
  getCategories,
  getTransactions,
  getTransactionsForExport,
  updateTransaction,
};
