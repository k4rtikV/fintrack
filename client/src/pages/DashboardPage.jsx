import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Landmark,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import AccountSummary from "../components/dashboard/AccountSummary";
import CashFlowChart from "../components/dashboard/CashFlowChart";
import CategoryBreakdown from "../components/dashboard/CategoryBreakdown";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import TopExpensesList from "../components/dashboard/TopExpensesList";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import useAuth from "../hooks/useAuth";
import { getDashboardAnalytics } from "../services/analyticsService";
import { formatCurrency } from "../utils/formatters";

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: getDashboardAnalytics,
  });

  const firstName = user?.fullName?.split(" ")[0] || "there";
  const currency = user?.preferredCurrency || "INR";
  const overview = data?.overview;

  const stats = [
    {
      label: "Total balance",
      value: formatCurrency(overview?.totalBalance, currency),
      note: `${overview?.accountCount || 0} active account${
        overview?.accountCount === 1 ? "" : "s"
      }`,
      icon: Landmark,
      tone: "blue",
    },
    {
      label: "Monthly income",
      value: formatCurrency(overview?.totalIncome, currency),
      note: `${overview?.incomeTransactionCount || 0} income transaction${
        overview?.incomeTransactionCount === 1 ? "" : "s"
      }`,
      icon: TrendingUp,
      tone: "emerald",
    },
    {
      label: "Monthly expenses",
      value: formatCurrency(overview?.totalExpense, currency),
      note: `${overview?.expenseTransactionCount || 0} expense transaction${
        overview?.expenseTransactionCount === 1 ? "" : "s"
      }`,
      icon: ReceiptText,
      tone: "rose",
    },
    {
      label: "Savings rate",
      value:
        overview?.totalIncome > 0
          ? `${Number(overview?.savingsRate || 0).toFixed(1)}%`
          : "—",
      note:
        overview?.totalIncome > 0
          ? `${formatCurrency(overview?.netSavings, currency)} net savings`
          : "No income recorded",
      icon: PiggyBank,
      tone: "violet",
      trend:
        overview?.totalIncome > 0
          ? Number(overview?.savingsRate || 0)
          : undefined,
    },
  ];

  return (
    <PageContainer
      title={`Welcome back, ${firstName} 👋`}
      description="Track your balances, spending, and monthly cash flow from one place."
      action={
        <Button onClick={() => navigate("/transactions")}>
          <ArrowUpRight size={17} />
          Add transaction
        </Button>
      }
    >
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-500/20 dark:bg-rose-500/10">
          <h2 className="text-lg font-bold text-rose-700 dark:text-rose-200">
            Unable to load dashboard analytics
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm text-rose-600 dark:text-rose-300">
            {error?.response?.data?.message ||
              "Something went wrong while loading your financial overview."}
          </p>

          <Button
            variant="secondary"
            className="mt-5"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw
              size={17}
              className={isFetching ? "animate-spin" : ""}
            />
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <DashboardStatCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
            <CashFlowChart data={data?.trend} currency={currency} />
            <CategoryBreakdown data={data?.categories} currency={currency} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <AccountSummary accounts={data?.accounts} currency={currency} />
            <TopExpensesList expenses={data?.expenses} currency={currency} />
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default DashboardPage;
