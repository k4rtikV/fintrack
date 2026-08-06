import {
  ArrowUpRight,
  Landmark,
  PiggyBank,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import useAuth from "../hooks/useAuth";

const stats = [
  {
    label: "Total balance",
    value: "₹0.00",
    note: "Across all accounts",
    icon: Landmark,
  },
  {
    label: "Monthly income",
    value: "₹0.00",
    note: "No income recorded",
    icon: TrendingUp,
  },
  {
    label: "Monthly expenses",
    value: "₹0.00",
    note: "No expenses recorded",
    icon: ReceiptText,
  },
  {
    label: "Savings rate",
    value: "0%",
    note: "Add transactions to calculate",
    icon: PiggyBank,
  },
];

const gettingStartedSteps = [
  "Add your first account",
  "Create income and expense categories",
  "Record your first transaction",
];

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.fullName?.split(" ")[0] || "there";

  return (
    <PageContainer
      title={`Welcome back, ${firstName} 👋`}
      description="Here is your financial overview. Your real analytics will populate as you add accounts and transactions."
      action={
        <Button onClick={() => navigate("/transactions")}>
          <ArrowUpRight size={17} />
          Add transaction
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <DashboardCard key={label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {label}
                </p>

                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {value}
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Icon size={19} />
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-400">{note}</p>
          </DashboardCard>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <DashboardCard className="min-h-96">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                Cash flow overview
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Income and expense trends will appear here.
              </p>
            </div>

            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              This month
            </span>
          </div>

          <EmptyState
            icon={TrendingUp}
            title="No financial activity yet"
            description="Add your first transaction to begin tracking cash flow."
          />
        </DashboardCard>

        <DashboardCard>
          <h2 className="font-bold text-slate-900 dark:text-white">
            Getting started
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Complete these steps to unlock your dashboard.
          </p>

          <div className="mt-5 space-y-3">
            {gettingStartedSteps.map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                  {index + 1}
                </span>

                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => navigate("/accounts")}
          >
            Set up FinTrack
          </Button>
        </DashboardCard>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
