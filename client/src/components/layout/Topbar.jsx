import { Bell, Menu, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService";
import NotificationPanel from "../notifications/NotificationPanel";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

const Topbar = ({ onMenuClick }) => {
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
    const intervalId = window.setInterval(() => loadNotifications({ silent: true }), 60000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!notificationAreaRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
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
      items.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })),
    );
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-slate-200/80 bg-slate-50/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          aria-label="Search transactions"
          placeholder="Search transactions..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <div ref={notificationAreaRef} className="relative">
          <button
            type="button"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            onClick={() => {
              setNotificationsOpen((open) => !open);
              if (!notificationsOpen) loadNotifications();
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
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
    </header>
  );
};

export default Topbar;
