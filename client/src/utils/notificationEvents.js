const NOTIFICATIONS_CHANGED_EVENT = "fintrack:notifications-changed";

const announceNotificationsChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
};

export { NOTIFICATIONS_CHANGED_EVENT, announceNotificationsChanged };
