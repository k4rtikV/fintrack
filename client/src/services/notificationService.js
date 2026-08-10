import api from "../api/axios";

const getNotifications = async (limit = 30) => {
  const response = await api.get("/notifications", { params: { limit } });
  return response.data;
};

const markNotificationRead = async (notificationId) => {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data;
};

const markAllNotificationsRead = async () => {
  const response = await api.patch("/notifications/read-all");
  return response.data;
};

export { getNotifications, markAllNotificationsRead, markNotificationRead };
