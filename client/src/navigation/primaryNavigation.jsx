import {
  Bot,
  ChartNoAxesCombined,
  CircleDollarSign,
  Goal,
  LayoutDashboard,
  LineChart,
  ReceiptText,
  WalletCards,
} from "lucide-react";

const primaryNavigation = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/accounts", label: "Accounts", icon: WalletCards },
  { path: "/transactions", label: "Transactions", icon: ReceiptText },
  { path: "/budgets", label: "Budget", icon: CircleDollarSign },
  { path: "/investments", label: "Investments", icon: LineChart },
  { path: "/goals", label: "Goals", icon: Goal },
  { path: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { path: "/assistant", label: "AI Assistant", icon: Bot },
];

const primaryAliases = new Map([
  ["/categories", "/transactions"],
  ["/recurring", "/transactions"],
  ["/transactions/autopay", "/transactions"],
  ["/transactions/categories", "/transactions"],
]);

const normalizePathname = (pathname = "") => {
  const normalized = pathname.split("?")[0].split("#")[0] || "/";
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
};

const resolvePrimaryPath = (pathname) => {
  const normalized = normalizePathname(pathname);
  if (normalized.startsWith("/investments/stocks/")) return "/investments";
  return primaryAliases.get(normalized) || normalized;
};

const getPrimaryNavigationIndex = (pathname) => {
  const resolved = resolvePrimaryPath(pathname);
  return primaryNavigation.findIndex(({ path }) => path === resolved);
};

const getNavigationDirection = (fromPath, toPath) => {
  const fromIndex = getPrimaryNavigationIndex(fromPath);
  const toIndex = getPrimaryNavigationIndex(toPath);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return "neutral";
  }

  return toIndex > fromIndex ? "forward" : "backward";
};

export {
  getNavigationDirection,
  getPrimaryNavigationIndex,
  normalizePathname,
  primaryNavigation,
  resolvePrimaryPath,
};
