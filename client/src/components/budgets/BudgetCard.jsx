import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { formatCurrency } from "../../utils/formatters";
import CategoryIcon from "../ui/CategoryIcon";

const BudgetCard = ({ budget, currency, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const spent = Number(budget.spent || 0);
  const amount = Number(budget.amount || 0);
  const remaining = Number(budget.remaining || 0);
  const rawPercentage = Number(budget.percentageUsed || 0);
  const progressWidth = Math.min(Math.max(rawPercentage, 0), 100);

  const progressClass = budget.isOverBudget
    ? "bg-rose-500"
    : rawPercentage >= 80
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryIcon
            icon={budget.category?.icon}
            color={budget.category?.color}
          />

          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-900 dark:text-white">
              {budget.category?.name || "Expense category"}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Budget {formatCurrency(amount, currency)}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Budget actions"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(budget);
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
                  onDelete(budget);
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
            Spent
          </p>
          <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            {formatCurrency(spent, currency)}
          </p>
        </div>

        <div className="text-right">
          <p
            className={`text-sm font-bold ${
              budget.isOverBudget
                ? "text-rose-600 dark:text-rose-300"
                : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {rawPercentage.toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {budget.isOverBudget ? "Over budget" : "used"}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${progressClass}`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          {budget.isOverBudget ? "Exceeded by" : "Remaining"}
        </span>
        <span
          className={`font-semibold ${
            budget.isOverBudget
              ? "text-rose-600 dark:text-rose-300"
              : "text-slate-700 dark:text-slate-200"
          }`}
        >
          {formatCurrency(Math.abs(remaining), currency)}
        </span>
      </div>

      {budget.note && (
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {budget.note}
        </p>
      )}
    </article>
  );
};

export default BudgetCard;
