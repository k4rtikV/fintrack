import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Plus,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import GoalCard from "../components/goals/GoalCard";
import GoalModal from "../components/goals/GoalModal";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Loader from "../components/ui/Loader";
import useAuth from "../hooks/useAuth";
import {
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
} from "../services/goalService";
import { formatCurrency } from "../utils/formatters";
import getApiError from "../utils/getApiError";
import { announceNotificationsChanged } from "../utils/notificationEvents";

const GoalsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: getGoals,
  });

  const refreshGoalData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["goals"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      selectedGoal
        ? updateGoal({
            goalId: selectedGoal._id,
            payload,
          })
        : createGoal(payload),
    onSuccess: async (response) => {
      toast.success(response.message);
      setIsModalOpen(false);
      setSelectedGoal(null);
      await refreshGoalData();
      announceNotificationsChanged();
    },
    onError: (error) => {
      toast.error(getApiError(error, "Unable to save goal"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: async (response) => {
      toast.success(response.message);
      await refreshGoalData();
    },
    onError: (error) => {
      toast.error(getApiError(error, "Unable to delete goal"));
    },
  });

  const goals = goalsQuery.data || [];
  const currency = user?.preferredCurrency || "INR";

  const summary = useMemo(() => {
    const totalTarget = goals.reduce(
      (sum, goal) => sum + Number(goal.targetAmount || 0),
      0,
    );

    const totalSaved = goals.reduce(
      (sum, goal) => sum + Number(goal.currentAmount || 0),
      0,
    );

    const remaining = goals.reduce(
      (sum, goal) => sum + Number(goal.remainingAmount || 0),
      0,
    );

    const completed = goals.filter(
      (goal) => goal.status === "COMPLETED",
    ).length;

    return {
      totalTarget,
      totalSaved,
      remaining,
      completed,
    };
  }, [goals]);

  const openCreateModal = () => {
    setSelectedGoal(null);
    setIsModalOpen(true);
  };

  const openEditModal = (goal) => {
    setSelectedGoal(goal);
    setIsModalOpen(true);
  };

  const handleDelete = (goal) => {
    const confirmed = window.confirm(`Delete the goal "${goal.name}"?`);

    if (confirmed) {
      deleteMutation.mutate(goal._id);
    }
  };

  if (goalsQuery.isLoading) {
    return (
      <PageContainer
        title="Goals"
        description="Set savings targets and track your progress toward the things that matter."
        action={
          <Button onClick={openCreateModal}>
            <Plus size={18} />
            Create goal
          </Button>
        }
      >
        <div className="flex min-h-72 items-center justify-center">
          <Loader label="Loading goals..." />
        </div>
      </PageContainer>
    );
  }

  if (goalsQuery.isError) {
    return (
      <PageContainer
        title="Goals"
        description="Set savings targets and track your progress toward the things that matter."
      >
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-500/20 dark:bg-rose-500/10">
          <p className="font-semibold text-rose-700 dark:text-rose-300">
            {getApiError(goalsQuery.error, "Unable to load goals")}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => goalsQuery.refetch()}
          >
            <RefreshCw size={17} />
            Try again
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Goals"
      description="Set savings targets and track your progress toward the things that matter."
      action={
        <Button onClick={openCreateModal}>
          <Plus size={18} />
          Create goal
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <Target size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total target
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {formatCurrency(summary.totalTarget, currency)}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CircleDollarSign size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total saved
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {formatCurrency(summary.totalSaved, currency)}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <Clock3 size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Still needed
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {formatCurrency(summary.remaining, currency)}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <Trophy size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Completed
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {summary.completed}
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Your goals
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Update the saved amount as you make progress toward each target.
          </p>
        </div>

        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create your first savings goal to start tracking progress."
            action={
              <Button onClick={openCreateModal}>
                <Plus size={18} />
                Create goal
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal._id}
                goal={goal}
                currency={currency}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <GoalModal
        goal={selectedGoal}
        isOpen={isModalOpen}
        isSaving={saveMutation.isPending}
        timezone={user?.timezone}
        onClose={() => {
          if (!saveMutation.isPending) {
            setIsModalOpen(false);
            setSelectedGoal(null);
          }
        }}
        onSubmit={(payload) => saveMutation.mutateAsync(payload)}
      />
    </PageContainer>
  );
};

export default GoalsPage;
