import api from "../api/axios";

const getSettings = async () => {
  const response = await api.get("/settings");
  return response.data;
};

const updateProfileSettings = async (payload) => {
  const response = await api.patch("/settings/profile", payload);
  return response.data;
};

const updateNotificationSettings = async (payload) => {
  const response = await api.patch("/settings/notifications", payload);
  return response.data;
};

export {
  getSettings,
  updateNotificationSettings,
  updateProfileSettings,
};
