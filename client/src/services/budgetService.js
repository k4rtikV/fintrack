import api from "../api/axios";

const getBudgets = async (month) => {
  const response = await api.get("/budgets", {
    params: month ? { month } : {},
  });

  return response.data.data.budgets;
};

const createBudget = async (payload) =>
  (await api.post("/budgets", payload)).data;

const updateBudget = async ({ budgetId, payload }) =>
  (await api.patch(`/budgets/${budgetId}`, payload)).data;

const deleteBudget = async (budgetId) =>
  (await api.delete(`/budgets/${budgetId}`)).data;

const getExpenseCategories = async () => {
  const response = await api.get("/categories", {
    params: { type: "EXPENSE" },
  });

  return response.data.data.categories;
};

export {
  createBudget,
  deleteBudget,
  getBudgets,
  getExpenseCategories,
  updateBudget,
};
