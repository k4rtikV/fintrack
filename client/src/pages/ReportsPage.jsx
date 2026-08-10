import { useQuery } from "@tanstack/react-query";
import { PiggyBank, ReceiptText, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import DashboardStatCard from "../components/dashboard/DashboardStatCard";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import ReportCashFlowChart from "../components/reports/ReportCashFlowChart";
import ReportCategoryBreakdown from "../components/reports/ReportCategoryBreakdown";
import ReportFilters from "../components/reports/ReportFilters";
import Button from "../components/ui/Button";
import CategoryIcon from "../components/ui/CategoryIcon";
import EmptyState from "../components/ui/EmptyState";
import Loader from "../components/ui/Loader";
import useAuth from "../hooks/useAuth";
import { getReportAnalytics } from "../services/reportService";
import { formatCurrency, formatDate } from "../utils/formatters";
import getApiError from "../utils/getApiError";

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset) => {
  const today = new Date();
  let start = new Date(today.getFullYear(), today.getMonth(), 1);
  let end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (preset === "last-month") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  }

  if (preset === "last-3-months") {
    start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    end = today;
  }

  if (preset === "year-to-date") {
    start = new Date(today.getFullYear(), 0, 1);
    end = today;
  }

  return {
    startDate: toDateInput(start),
    endDate: toDateInput(end),
  };
};

const ReportsPage = () => {
  const { user } = useAuth();
  const defaultRange = useMemo(() => getPresetRange("this-month"), []);
  const [preset, setPreset] = useState("this-month");
  const [range, setRange] = useState(defaultRange);
  const currency = user?.preferredCurrency || "INR";

  const reportQuery = useQuery({
    queryKey: ["reports", range.startDate, range.endDate],
    queryFn: () => getReportAnalytics(range),
    enabled: Boolean(range.startDate && range.endDate),
  });

  const handlePresetChange = (nextPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== "custom") {
      setRange(getPresetRange(nextPreset));
    }
  };

  const handleDateChange = (field, value) => {
    setPreset("custom");
    setRange((current) => ({ ...current, [field]: value }));
  };

  const data = reportQuery.data;
  const overview = data?.overview;
  const topCategory = data?.categories?.[0];

  const stats = [
    {
      label: "Income",
      value: formatCurrency(overview?.totalIncome, currency),
      note: `${overview?.incomeTransactionCount || 0} income transaction${overview?.incomeTransactionCount === 1 ? "" : "s"}`,
      icon: TrendingUp,
      tone: "emerald",
    },
    {
      label: "Expenses",
      value: formatCurrency(overview?.totalExpense, currency),
      note: `${overview?.expenseTransactionCount || 0} expense transaction${overview?.expenseTransactionCount === 1 ? "" : "s"}`,
      icon: TrendingDown,
      tone: "rose",
    },
    {
      label: "Net savings",
      value: formatCurrency(overview?.netSavings, currency),
      note: topCategory ? `Top spend: ${topCategory.name}` : "No category spend yet",
      icon: PiggyBank,
      tone: "violet",
    },
    {
      label: "Savings rate",
      value: overview?.totalIncome > 0 ? `${Number(overview.savingsRate || 0).toFixed(1)}%` : "—",
      note: overview?.totalIncome > 0 ? "Income retained after expenses" : "No income recorded",
      icon: ReceiptText,
      tone: "blue",
      trend: overview?.totalIncome > 0 ? Number(overview.savingsRate || 0) : undefined,
    },
  ];

  return (
    <PageContainer
      title="Reports"
      description="Analyse income, spending, savings, and category patterns across the period you choose."
      action={
        <Button variant="secondary" onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching}>
          <RefreshCw size={17} className={reportQuery.isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      }
    >
      <DashboardCard className="mb-5">
        <ReportFilters
          preset={preset}
          startDate={range.startDate}
          endDate={range.endDate}
          onPresetChange={handlePresetChange}
          onDateChange={handleDateChange}
        />
        <p className="mt-3 text-xs text-slate-400">
          Report period: {formatDate(range.startDate)} – {formatDate(range.endDate)}
        </p>
      </DashboardCard>

      {reportQuery.isLoading ? (
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader />
        </div>
      ) : reportQuery.isError ? (
        <DashboardCard>
          <EmptyState
            icon={ReceiptText}
            title="Unable to load reports"
            description={getApiError(reportQuery.error, "Something went wrong while loading report analytics.")}
            action={<Button onClick={() => reportQuery.refetch()}>Try again</Button>}
          />
        </DashboardCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <DashboardStatCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
            <ReportCashFlowChart data={data?.trend} currency={currency} />
            <ReportCategoryBreakdown data={data?.categories} currency={currency} />
          </div>

          <DashboardCard className="mt-6">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Largest expenses</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Top expense transactions inside the selected report period.
              </p>
            </div>

            {!data?.expenses?.length ? (
              <EmptyState
                icon={ReceiptText}
                title="No expenses in this period"
                description="Choose another period or record an expense to populate this report."
              />
            ) : (
              <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                {data.expenses.map((expense, index) => (
                  <div key={expense._id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-400">#{index + 1}</span>
                      <CategoryIcon icon={expense.category?.icon} color={expense.category?.color} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{expense.title}</p>
                        <p className="truncate text-xs text-slate-400">
                          {expense.category?.name || "Uncategorised"} · {formatDate(expense.transactionDate)} · {expense.account?.name || "Account"}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-rose-600 dark:text-rose-300">
                      -{formatCurrency(expense.amount, expense.account?.currency || currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
        </>
      )}
    </PageContainer>
  );
};

export default ReportsPage;
