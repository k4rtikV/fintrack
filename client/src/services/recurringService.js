import api from "../api/axios";

const getRecurring = async () => {
  const response = await api.get("/recurring");
  return response.data.data.recurring;
};

const createRecurring = async (payload) =>
  (await api.post("/recurring", payload)).data;

const updateRecurring = async ({ recurringId, payload }) =>
  (await api.patch(`/recurring/${recurringId}`, payload)).data;

const deleteRecurring = async (recurringId) =>
  (await api.delete(`/recurring/${recurringId}`)).data;

const processRecurringItem = async (recurringId) =>
  (await api.post(`/recurring/${recurringId}/process`)).data;

const getAccounts = async () =>
  (await api.get("/accounts")).data.data.accounts;

const getCategories = async () =>
  (await api.get("/categories")).data.data.categories;

export {
  createRecurring,
  deleteRecurring,
  getAccounts,
  getCategories,
  getRecurring,
  processRecurringItem,
  updateRecurring,
};
