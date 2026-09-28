import { FolderTree, ReceiptText, Repeat2 } from "lucide-react";
import { NavLink } from "react-router-dom";

const workspaceItems = [
  ["/transactions", "Transactions", ReceiptText, true],
  ["/transactions/autopay", "Autopay", Repeat2, false],
  ["/transactions/categories", "Categories", FolderTree, false],
];

const TransactionWorkspaceNav = ({ className = "" }) => (
  <nav aria-label="Transactions workspace" className={`mb-5 mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 ${className}`}>
    {workspaceItems.map(([to, label, Icon, end]) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) => [
          "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-200",
          isActive
            ? "bg-copper-100 text-copper-800 shadow-sm dark:bg-copper-500/15 dark:text-copper-300"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        ].join(" ")}
      >
        <Icon size={16} />
        {label}
      </NavLink>
    ))}
  </nav>
);

export default TransactionWorkspaceNav;
