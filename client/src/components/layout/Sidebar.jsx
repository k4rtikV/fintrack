import {
  Bot,
  ChartNoAxesCombined,
  CircleDollarSign,
  FolderTree,
  Goal,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Repeat2,
  Settings,
  WalletCards,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { NavLink, useNavigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";

const links = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/transactions", "Transactions", ReceiptText],
  ["/recurring", "Recurring", Repeat2],
  ["/accounts", "Accounts", WalletCards],
  ["/categories", "Categories", FolderTree],
  ["/budgets", "Budgets", CircleDollarSign],
  ["/goals", "Goals", Goal],
  ["/reports", "Reports", ChartNoAxesCombined],
  ["/assistant", "AI Assistant", Bot],
  ["/settings", "Settings", Settings],
];

const Sidebar = ({
  mobile = false,
  open = false,
  onClose = () => {},
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const content = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950 text-white">
      <div className="flex h-18 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950">
          <WalletCards size={21} />
        </div>

        <div>
          <p className="font-bold">FinTrack</p>
          <p className="text-xs text-slate-400">Personal finance</p>
        </div>

        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Workspace
        </p>

        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-xl px-3 py-2.5",
                "text-sm font-medium transition",
                isActive
                  ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-950/30"
                  : "text-slate-400 hover:bg-white/7 hover:text-white",
              ].join(" ")
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );

  if (!mobile) {
    return (
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        {content}
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`relative h-full w-72 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export default Sidebar;
