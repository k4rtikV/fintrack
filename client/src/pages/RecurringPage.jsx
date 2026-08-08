import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck2,
  CalendarClock,
  PauseCircle,
  PlayCircle,
  Plus,
  Repeat2,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import RecurringCard from "../components/recurring/RecurringCard";
import RecurringModal from "../components/recurring/RecurringModal";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Loader from "../components/ui/Loader";
import useAuth from "../hooks/useAuth";
import {
  createRecurring,
  deleteRecurring,
  getAccounts,
  getCategories,
  getRecurring,
  processRecurringItem,
  updateRecurring,
} from "../services/recurringService";
import getApiError from "../utils/getApiError";

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const RecurringPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState(null);
  const [togglingId, setTogglingId] = useState("");
  const [processingId, setProcessingId] = useState("");

  const recurringQuery = useQuery({
    queryKey: ["recurring"],
    queryFn: getRecurring,
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const refreshFinanceData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["recurring"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      selectedRecurring
        ? updateRecurring({
            recurringId: selectedRecurring._id,
            payload,
          })
        : createRecurring(payload),
    onSuccess: async (response) => {
      toast.success(response.message);
      setIsModalOpen(false);
      setSelectedRecurring(null);
      await refreshFinanceData();
    },
    onError: (error) =>
      toast.error(getApiError(error, "Unable to save recurring transaction")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecurring,
    onSuccess: async (response) => {
      toast.success(response.message);
      await refreshFinanceData();
    },
    onError: (error) =>
      toast.error(getApiError(error, "Unable to delete recurring transaction")),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ recurringId, isActive }) =>
      updateRecurring({
        recurringId,
        payload: { isActive },
      }),
    onSuccess: async (response) => {
      toast.success(response.message);
      setTogglingId("");
      await refreshFinanceData();
    },
    onError: (error) => {
      setTogglingId("");
      toast.error(getApiError(error, "Unable to update schedule"));
    },
  });

  const processMutation = useMutation({
    mutationFn: processRecurringItem,
    onSuccess: async (response) => {
      toast.success(response.message);
      setProcessingId("");
      await refreshFinanceData();
    },
    onError: (error) => {
      setProcessingId("");
      toast.error(getApiError(error, "Unable to process this schedule"));
    },
  });

  const recurring = recurringQuery.data || [];
  const accounts = accountsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const currency = user?.preferredCurrency || "INR";

  const summary = useMemo(() => {
    const today = startOfToday();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return recurring.reduce(
      (result, item) => {
        result.total += 1;

        if (item.isActive) {
          result.active += 1;

          const nextRun = new Date(item.nextRunDate);
          if (
            !Number.isNaN(nextRun.getTime()) &&
            nextRun >= today &&
            nextRun <= sevenDaysFromNow
          ) {
            result.upcoming += 1;
          }
        } else {
          result.paused += 1;
        }

        return result;
      },
      {
        total: 0,
        active: 0,
        upcoming: 0,
        paused: 0,
      },
    );
  }, [recurring]);

  const openCreateModal = () => {
    setSelectedRecurring(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedRecurring(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    if (
      window.confirm(
        `Delete the recurring schedule “${item.title}”? Existing generated transactions will remain unchanged.`,
      )
    ) {
      deleteMutation.mutate(item._id);
    }
  };

  const handleToggleActive = (item) => {
    setTogglingId(item._id);
    toggleMutation.mutate({
      recurringId: item._id,
      isActive: !item.isActive,
    });
  };

  const handleProcessDue = (item) => {
    setProcessingId(item._id);
    processMutation.mutate(item._id);
  };

  const isLoading =
    recurringQuery.isLoading ||
    accountsQuery.isLoading ||
    categoriesQuery.isLoading;

  const queryError =
    recurringQuery.error || accountsQuery.error || categoriesQuery.error;

  return (
    <PageContainer
      title="Recurring"
      description="Automate repeating income and expenses and let FinTrack create the transactions when they become due."
      action={
        <Button onClick={openCreateModal}>
          <Plus size={18} />
          Create schedule
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <Repeat2 size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total schedules
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {summary.total}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <PlayCircle size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Active
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {summary.active}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <CalendarCheck2 size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Next 7 days
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {summary.upcoming}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <PauseCircle size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Paused
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {summary.paused}
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Schedules
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Generated occurrences appear automatically in Transactions and update the selected account balance.
          </p>
        </div>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader label="Loading recurring transactions..." />
          </div>
        ) : queryError ? (
          <EmptyState
            icon={CalendarClock}
            title="Unable to load recurring transactions"
            description={getApiError(
              queryError,
              "Check your connection and try again.",
            )}
            action={
              <Button onClick={() => recurringQuery.refetch()}>
                Try again
              </Button>
            }
          />
        ) : recurring.length === 0 ? (
          <EmptyState
            icon={Repeat2}
            title="No recurring transactions yet"
            description="Create a schedule for rent, salary, subscriptions, SIPs, bills, or any other repeating transaction."
            action={
              <Button onClick={openCreateModal}>
                <Plus size={18} />
                Create schedule
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {recurring.map((item) => (
              <RecurringCard
                key={item._id}
                recurring={item}
                currency={currency}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onProcessDue={handleProcessDue}
                isToggling={
                  toggleMutation.isPending && togglingId === item._id
                }
                isProcessing={
                  processMutation.isPending && processingId === item._id
                }
              />
            ))}
          </div>
        )}
      </section>

      <RecurringModal
        recurring={selectedRecurring}
        accounts={accounts}
        categories={categories}
        isOpen={isModalOpen}
        isSaving={saveMutation.isPending}
        onClose={() => {
          if (!saveMutation.isPending) {
            setIsModalOpen(false);
            setSelectedRecurring(null);
          }
        }}
        onSubmit={(payload) => saveMutation.mutateAsync(payload)}
      />
    </PageContainer>
  );
};

export default RecurringPage;
