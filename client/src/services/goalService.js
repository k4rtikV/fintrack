import api from "../api/axios";

const getGoals = async () => {
  const response = await api.get("/goals");

  return response.data.data.goals;
};

const createGoal = async (payload) =>
  (await api.post("/goals", payload)).data;

const updateGoal = async ({ goalId, payload }) =>
  (await api.patch(`/goals/${goalId}`, payload)).data;

const deleteGoal = async (goalId) =>
  (await api.delete(`/goals/${goalId}`)).data;

export {
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
};
