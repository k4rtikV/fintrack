import { Bell, Menu, Search } from "lucide-react";

import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

const Topbar = ({ onMenuClick }) => {
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
        <Search
          size={17}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          aria-label="Search transactions"
          placeholder="Search transactions..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
};

export default Topbar;
