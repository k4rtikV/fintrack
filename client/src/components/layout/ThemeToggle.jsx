import { Moon, Sun } from "lucide-react";

import useTheme from "../../hooks/useTheme";

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Use light theme" : "Use dark theme"}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/85 text-slate-600 transition duration-200 hover:-translate-y-0.5 hover:border-copper-300 hover:text-copper-700 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-300 dark:hover:border-copper-700 dark:hover:text-copper-300"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
