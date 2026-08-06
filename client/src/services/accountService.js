import api from "../api/axios";

const getAccounts = async ({ includeArchived = false } = {}) => {
  const response = await api.get("/accounts", {
    params: includeArchived ? { includeArchived: true } : {},
  });

  return response.data.data.accounts;
};

const createAccount = async (payload) => {
  const response = await api.post("/accounts", payload);
  return response.data;
};

const updateAccount = async ({ accountId, payload }) => {
  const response = await api.patch(`/accounts/${accountId}`, payload);
  return response.data;
};

const archiveAccount = async (accountId) => {
  const response = await api.patch(`/accounts/${accountId}/archive`);
  return response.data;
};

export {
  archiveAccount,
  createAccount,
  getAccounts,
  updateAccount,
};
