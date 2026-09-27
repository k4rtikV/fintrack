import { Bell, WalletCards } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService";
import { NOTIFICATIONS_CHANGED_EVENT } from "../../utils/notificationEvents";
import NotificationPanel from "../notifications/NotificationPanel";
import ThemeToggle from "./ThemeToggle";
import TopNavigation from "./TopNavigation";
import UserMenu from "./UserMenu";

const Topbar = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const notificationAreaRef = useRef(null);

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setNotificationsLoading(true);
    try {
      const response = await getNotifications(30);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      if (!silent) console.error("Could not load notifications", error);
    } finally {
      if (!silent) setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(
      () => loadNotifications({ silent: true }),
      60000,
    );
    const handleNotificationsChanged = () =>
      loadNotifications({ silent: true });

    window.addEventListener(
      NOTIFICATIONS_CHANGED_EVENT,
      handleNotificationsChanged,
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        NOTIFICATIONS_CHANGED_EVENT,
        handleNotificationsChanged,
      );
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!notificationAreaRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  const handleMarkRead = async (notificationId) => {
    await markNotificationRead(notificationId);
    setNotifications((items) =>
      items.map((item) =>
        item._id === notificationId
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((items) =>
      items.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt || new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/85 bg-slate-50/92 shadow-[0_1px_0_rgba(14,16,17,0.02)] backdrop-blur-2xl dark:border-slate-800/90 dark:bg-slate-950/92">
      <div className="mx-auto flex min-h-16 max-w-[1800px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2.5 pr-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-copper-300/35 bg-gradient-to-br from-copper-400 via-copper-500 to-copper-700 text-white shadow-sm shadow-copper-950/15 dark:text-slate-950">
            <WalletCards size={19} />
          </span>
          <span className="hidden text-[15px] font-extrabold tracking-[-0.02em] text-slate-950 sm:block dark:text-slate-50">
            FinTrack
          </span>
        </div>

        <div className="hidden min-w-0 flex-1 md:block">
          <TopNavigation />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />

          <div ref={notificationAreaRef} className="relative">
            <button
              type="button"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                if (!notificationsOpen) loadNotifications();
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/85 text-slate-600 transition duration-200 hover:-translate-y-0.5 hover:border-steel-300 hover:text-steel-700 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-300 dark:hover:border-steel-600 dark:hover:text-steel-300"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-steel-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:bg-steel-500 dark:ring-slate-900">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <NotificationPanel
                notifications={notifications}
                unreadCount={unreadCount}
                loading={notificationsLoading}
                onClose={() => setNotificationsOpen(false)}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
              />
            )}
          </div>

          <UserMenu />
        </div>
      </div>

      <div className="border-t border-slate-200/70 px-3 md:hidden dark:border-slate-800/80">
        <TopNavigation />
      </div>
    </header>
  );
};

export default Topbar;
