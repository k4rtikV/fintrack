import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  Plus,
  RefreshCw,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import BudgetCard from "../components/budgets/BudgetCard";
import BudgetModal from "../components/budgets/BudgetModal";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Loader from "../components/ui/Loader";
import useAuth from "../hooks/useAuth";
import {
  createBudget,
  deleteBudget,
  getBudgets,
  getExpenseCategories,
  updateBudget,
} from "../services/budgetService";
import { formatCurrency } from "../utils/formatters";
import getApiError from "../utils/getApiError";

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const formatMonthLabel = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
};

const BudgetsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  const budgetsQuery = useQuery({
    queryKey: ["budgets", selectedMonth],
    queryFn: () => getBudgets(selectedMonth),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: getExpenseCategories,
  });

  const refreshBudgetData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      selectedBudget
        ? updateBudget({
            budgetId: selectedBudget._id,
            payload,
          })
        : createBudget(payload),
    onSuccess: async (response) => {
      toast.success(response.message);
      setIsModalOpen(false);
      setSelectedBudget(null);
      await refreshBudgetData();
    },
    onError: (error) => {
      toast.error(getApiError(error, "Unable to save budget"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: async (response) => {
      toast.success(response.message);
      await refreshBudgetData();
    },
    onError: (error) => {
      toast.error(getApiError(error, "Unable to delete budget"));
    },
  });

  const budgets = budgetsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const currency = user?.preferredCurrency || "INR";

  const summary = useMemo(() => {
    const totalBudget = budgets.reduce(
      (sum, budget) => sum + Number(budget.amount || 0),
      0,
    );
    const totalSpent = budgets.reduce(
      (sum, budget) => sum + Number(budget.spent || 0),
      0,
    );
    const totalRemaining = totalBudget - totalSpent;
    const overBudgetCount = budgets.filter((budget) => budget.isOverBudget).length;

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      overBudgetCount,
    };
  }, [budgets]);

  const openCreateModal = () => {
    setSelectedBudget(null);
    setIsModalOpen(true);
  };

  const openEditModal = (budget) => {
    setSelectedBudget(budget);
    setIsModalOpen(true);
  };

  const handleDelete = (budget) => {
    const confirmed = window.confirm(
      `Delete the ${budget.category?.name || "selected"} budget for ${formatMonthLabel(selectedMonth)}?`,
    );

    if (confirmed) {
      deleteMutation.mutate(budget._id);
    }
  };

  const isLoading = budgetsQuery.isLoading || categoriesQuery.isLoading;
  const hasError = budgetsQuery.isError || categoriesQuery.isError;
  const queryError = budgetsQuery.error || categoriesQuery.error;

  return (
    <PageContainer
      title="Budgets"
      description="Set monthly spending limits by expense category and compare them with your actual transactions."
      action={
        <Button onClick={openCreateModal} disabled={categoriesQuery.isLoading}>
          <Plus size={18} />
          Create budget
        </Button>
      }
    >
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <CalendarDays size={19} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Budget month
            </p>
            <p className="font-bold text-slate-900 dark:text-white">
              {formatMonthLabel(selectedMonth)}
            </p>
          </div>
        </div>

        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <WalletCards size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total budget
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {formatCurrency(summary.totalBudget, currency)}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <TrendingDown size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Spent
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {formatCurrency(summary.totalSpent, currency)}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <CircleDollarSign size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Remaining
              </p>
              <p
                className={`mt-0.5 text-xl font-bold ${
                  summary.totalRemaining < 0
                    ? "text-rose-600 dark:text-rose-300"
                    : "text-slate-950 dark:text-white"
                }`}
              >
                {formatCurrency(summary.totalRemaining, currency)}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Over budget
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {summary.overBudgetCount}
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="mt-7">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Category budgets
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Spending is calculated automatically from expense transactions in the selected month.
          </p>
        </div>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader />
          </div>
        ) : hasError ? (
          <EmptyState
            icon={RefreshCw}
            title="Unable to load budgets"
            description={getApiError(
              queryError,
              "Check your connection and try again.",
            )}
            action={
              <Button
                onClick={() => {
                  budgetsQuery.refetch();
                  categoriesQuery.refetch();
                }}
              >
                Try again
              </Button>
            }
          />
        ) : budgets.length === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title={`No budgets for ${formatMonthLabel(selectedMonth)}`}
            description="Create category budgets to start tracking how much of each monthly limit you have used."
            action={
              <Button onClick={openCreateModal}>
                <Plus size={18} />
                Create first budget
              </Button>
            }
          />
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget._id}
                budget={budget}
                currency={currency}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <BudgetModal
        budget={selectedBudget}
        categories={categories}
        existingBudgets={budgets}
        isOpen={isModalOpen}
        isSaving={saveMutation.isPending}
        month={selectedMonth}
        onClose={() => {
          if (!saveMutation.isPending) {
            setIsModalOpen(false);
            setSelectedBudget(null);
          }
        }}
        onSubmit={(payload) => saveMutation.mutateAsync(payload)}
      />
    </PageContainer>
  );
};

export default BudgetsPage;
