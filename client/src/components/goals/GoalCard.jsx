import {
  Car,
  GraduationCap,
  Home,
  Laptop,
  MoreVertical,
  Pencil,
  PiggyBank,
  Plane,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { useState } from "react";

import { formatCurrency, formatDate } from "../../utils/formatters";

const iconMap = {
  target: Target,
  savings: PiggyBank,
  travel: Plane,
  home: Home,
  car: Car,
  laptop: Laptop,
  education: GraduationCap,
  trophy: Trophy,
};

const colorMap = {
  emerald: {
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    progress: "bg-emerald-500",
  },
  blue: {
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    progress: "bg-blue-500",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    progress: "bg-violet-500",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    progress: "bg-amber-500",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    progress: "bg-rose-500",
  },
  cyan: {
    icon: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
    progress: "bg-cyan-500",
  },
};

const statusStyles = {
  COMPLETED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  OVERDUE:
    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  IN_PROGRESS:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const GoalCard = ({ goal, currency, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const GoalIcon = iconMap[goal.icon] || Target;
  const palette = colorMap[goal.color] || colorMap.emerald;
  const percentage = Number(goal.percentageComplete || 0);
  const progressWidth = Math.min(Math.max(percentage, 0), 100);

  const statusLabel =
    goal.status === "COMPLETED"
      ? "Completed"
      : goal.status === "OVERDUE"
        ? "Overdue"
        : "In progress";

  let targetMessage = `${goal.daysRemaining} days remaining`;

  if (goal.status === "COMPLETED") {
    targetMessage = "Goal reached";
  } else if (goal.status === "OVERDUE") {
    targetMessage = `${Math.abs(goal.daysRemaining)} days overdue`;
  } else if (goal.daysRemaining === 0) {
    targetMessage = "Due today";
  } else if (goal.daysRemaining === 1) {
    targetMessage = "1 day remaining";
  }

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${palette.icon}`}
          >
            <GoalIcon size={21} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-900 dark:text-white">
              {goal.name}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Target {formatDate(goal.targetDate)}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Goal actions"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(goal);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Pencil size={15} />
                Edit
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(goal);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Saved
          </p>
          <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {formatCurrency(goal.currentAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            of {formatCurrency(goal.targetAmount, currency)}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[goal.status] || statusStyles.IN_PROGRESS}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-500 dark:text-slate-400">Progress</span>
        <span className="text-slate-700 dark:text-slate-200">
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${
            goal.status === "OVERDUE" ? "bg-rose-500" : palette.progress
          }`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 text-sm">
        <div>
          <p className="text-slate-500 dark:text-slate-400">Remaining</p>
          <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
            {formatCurrency(goal.remainingAmount, currency)}
          </p>
        </div>

        <p
          className={`text-right text-xs font-semibold ${
            goal.status === "OVERDUE"
              ? "text-rose-600 dark:text-rose-300"
              : goal.status === "COMPLETED"
                ? "text-emerald-600 dark:text-emerald-300"
                : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {targetMessage}
        </p>
      </div>

      {goal.note && (
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {goal.note}
        </p>
      )}
    </article>
  );
};

export default GoalCard;
