import {
  getNotificationsForUser,
  markAllNotificationsReadForUser,
  markNotificationReadForUser,
} from "../services/notification.service.js";

const getNotifications = async (req, res) => {
  const result = await getNotificationsForUser({
    userId: req.user._id,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    results: result.notifications.length,
    data: result,
  });
};

const markNotificationRead = async (req, res) => {
  const notification = await markNotificationReadForUser({
    notificationId: req.params.notificationId,
    userId: req.user._id,
  });

  res.status(200).json({ success: true, data: { notification } });
};

const markAllNotificationsRead = async (req, res) => {
  await markAllNotificationsReadForUser({ userId: req.user._id });
  res.status(200).json({ success: true, message: "All notifications marked as read" });
};

export { getNotifications, markAllNotificationsRead, markNotificationRead };
