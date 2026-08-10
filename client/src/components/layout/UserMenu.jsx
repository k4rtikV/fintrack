import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";

const UserMenu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const initials =
    user?.fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FT";

  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);

    return () => {
      document.removeEventListener("mousedown", close);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 text-xs font-bold text-slate-950">
          {initials}
        </span>

        <span className="hidden max-w-32 sm:block">
          <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
            {user?.fullName}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {user?.email}
          </span>
        </span>

        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <UserRound size={16} />
            Profile
          </button>

          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Settings size={16} />
            Settings
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
