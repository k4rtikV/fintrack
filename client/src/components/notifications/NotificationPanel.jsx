import { CheckCheck, CircleDollarSign, Repeat2, Target, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const typeIcon = {
  BUDGET: CircleDollarSign,
  GOAL: Target,
  RECURRING: Repeat2,
  SYSTEM: CircleDollarSign,
};

const formatRelativeTime = (value) => {
  const date = new Date(value);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const NotificationPanel = ({
  notifications,
  unreadCount,
  loading,
  onClose,
  onMarkRead,
  onMarkAllRead,
}) => {
  const navigate = useNavigate();

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      await onMarkRead(notification._id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-x-3 top-[4.75rem] z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:max-h-none sm:w-[min(92vw,420px)]">
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-950 dark:text-white">Notifications</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </div>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
            >
              <CheckCheck size={15} />
              <span>Read all</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close notifications"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      <div className="notification-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y sm:max-h-[480px]">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <CheckCheck size={20} />
            </div>
            <div className="font-medium text-slate-800 dark:text-slate-100">No notifications yet</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Budget, goal, and recurring alerts will appear here.
            </div>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = typeIcon[notification.type] || CircleDollarSign;
            return (
              <button
                key={notification._id}
                type="button"
                onClick={() => openNotification(notification)}
                className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70 ${
                  notification.isRead ? "bg-white dark:bg-slate-900" : "bg-emerald-50/60 dark:bg-emerald-500/5"
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {notification.title}
                    </div>
                    {!notification.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <div className="mt-1 break-words text-xs leading-5 text-slate-600 dark:text-slate-400">
                    {notification.message}
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-400">
                    {formatRelativeTime(notification.createdAt)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
