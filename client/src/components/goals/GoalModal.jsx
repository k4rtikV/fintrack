import { X } from "lucide-react";
import { useEffect, useState } from "react";

import Button from "../ui/Button";
import {
  addMonthsToDateKey,
  getDateKey,
  getDateKeyInTimeZone,
} from "../../utils/dateUtils";

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const getDefaultTargetDate = (timezone) =>
  addMonthsToDateKey(getDateKeyInTimeZone(new Date(), timezone), 6);

const toDateInputValue = (value, timezone) =>
  getDateKey(value) || getDefaultTargetDate(timezone);

const createInitialForm = (goal, timezone) => ({
  name: goal?.name || "",
  targetAmount: goal ? String(goal.targetAmount ?? "") : "",
  currentAmount: goal ? String(goal.currentAmount ?? 0) : "0",
  targetDate: toDateInputValue(goal?.targetDate, timezone),
  note: goal?.note || "",
  color: goal?.color || "emerald",
  icon: goal?.icon || "target",
});

const iconOptions = [
  { value: "target", label: "Target" },
  { value: "savings", label: "Savings" },
  { value: "travel", label: "Travel" },
  { value: "home", label: "Home" },
  { value: "car", label: "Car" },
  { value: "laptop", label: "Laptop" },
  { value: "education", label: "Education" },
  { value: "trophy", label: "Milestone" },
];

const colorOptions = [
  { value: "emerald", label: "Emerald" },
  { value: "blue", label: "Blue" },
  { value: "violet", label: "Violet" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
  { value: "cyan", label: "Cyan" },
];

const GoalModal = ({
  goal,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
  timezone,
}) => {
  const [form, setForm] = useState(() => createInitialForm(goal, timezone));
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(createInitialForm(goal, timezone));
      setError("");
    }
  }, [goal, isOpen, timezone]);

  if (!isOpen) {
    return null;
  }

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const targetAmount = Number(form.targetAmount);
    const currentAmount = Number(form.currentAmount);
    const note = form.note.trim();

    if (name.length < 2) {
      setError("Goal name must contain at least 2 characters.");
      return;
    }

    if (name.length > 80) {
      setError("Goal name cannot exceed 80 characters.");
      return;
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError("Enter a target amount greater than zero.");
      return;
    }

    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      setError("Current saved amount cannot be negative.");
      return;
    }

    if (!form.targetDate) {
      setError("Choose a target date.");
      return;
    }

    if (note.length > 300) {
      setError("Goal note cannot exceed 300 characters.");
      return;
    }

    await onSubmit({
      name,
      targetAmount,
      currentAmount,
      targetDate: form.targetDate,
      note,
      color: form.color,
      icon: form.icon,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {goal ? "Edit goal" : "Create goal"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {goal
                ? "Update your target or the amount you have saved."
                : "Set a financial target and track your progress toward it."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close goal form"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Goal name
            <input
              type="text"
              maxLength={80}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={fieldClassName}
              placeholder="Emergency fund"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Target amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.targetAmount}
                onChange={(event) =>
                  updateField("targetAmount", event.target.value)
                }
                className={fieldClassName}
                placeholder="100000"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Already saved
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.currentAmount}
                onChange={(event) =>
                  updateField("currentAmount", event.target.value)
                }
                className={fieldClassName}
                placeholder="0"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Target date
            <input
              type="date"
              value={form.targetDate}
              onChange={(event) =>
                updateField("targetDate", event.target.value)
              }
              className={fieldClassName}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Icon
              <select
                value={form.icon}
                onChange={(event) => updateField("icon", event.target.value)}
                className={fieldClassName}
              >
                {iconOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Accent
              <select
                value={form.color}
                onChange={(event) => updateField("color", event.target.value)}
                className={fieldClassName}
              >
                {colorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Note <span className="font-normal text-slate-400">(optional)</span>
            <textarea
              rows={3}
              maxLength={300}
              value={form.note}
              onChange={(event) => updateField("note", event.target.value)}
              className={`${fieldClassName} resize-none`}
              placeholder="Why this goal matters, what the money is for..."
            />
            <span className="mt-1 block text-right text-xs font-normal text-slate-400">
              {form.note.length}/300
            </span>
          </label>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>

            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : goal
                  ? "Save changes"
                  : "Create goal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalModal;
