import {
  CalendarClock,
  CheckCircle2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { formatCurrency, formatDate } from "../../utils/formatters";

const frequencyLabel = (frequency, interval = 1) => {
  const unitMap = {
    DAILY: ["day", "days"],
    WEEKLY: ["week", "weeks"],
    MONTHLY: ["month", "months"],
    YEARLY: ["year", "years"],
  };

  const [single, plural] = unitMap[frequency] || ["period", "periods"];

  if (interval === 1) {
    return `Every ${single}`;
  }

  return `Every ${interval} ${plural}`;
};

const RecurringCard = ({
  recurring,
  currency,
  onEdit,
  onDelete,
  onToggleActive,
  onProcessDue,
  isToggling,
  isProcessing,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const isIncome = recurring.type === "INCOME";
  const isActive = recurring.isActive;

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isIncome
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
          >
            <CalendarClock size={21} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-900 dark:text-white">
              {recurring.title}
            </h3>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {recurring.account?.name || "Unknown account"} ·{" "}
              {recurring.category?.name || "Unknown category"}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Recurring transaction actions"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onProcessDue(recurring);
                }}
                disabled={isProcessing}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <CheckCircle2 size={15} />
                {isProcessing ? "Processing..." : "Process due"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(recurring);
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
                  onToggleActive(recurring);
                }}
                disabled={isToggling}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {isActive ? <Pause size={15} /> : <Play size={15} />}
                {isActive ? "Pause" : "Resume"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(recurring);
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
            Amount
          </p>
          <p
            className={`mt-1 text-xl font-bold ${
              isIncome
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-slate-950 dark:text-white"
            }`}
          >
            {isIncome ? "+" : "-"}
            {formatCurrency(recurring.amount, currency)}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {isActive ? "Active" : "Paused"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Schedule</p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {frequencyLabel(recurring.frequency, recurring.interval)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Next run
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {isActive ? formatDate(recurring.nextRunDate) : "Paused"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Started
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {formatDate(recurring.startDate)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Last generated
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {recurring.lastRunDate
              ? formatDate(recurring.lastRunDate)
              : "Not yet"}
          </p>
        </div>
      </div>

      {recurring.endDate && (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          Ends {formatDate(recurring.endDate)}
        </p>
      )}

      {recurring.note && (
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {recurring.note}
        </p>
      )}
    </article>
  );
};

export default RecurringCard;
