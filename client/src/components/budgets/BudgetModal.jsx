import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Button from "../ui/Button";

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const createInitialForm = (budget, month) => ({
  categoryId: budget?.category?._id || "",
  amount: budget ? String(budget.amount ?? "") : "",
  note: budget?.note || "",
  month,
});

const BudgetModal = ({
  budget,
  categories,
  existingBudgets,
  isOpen,
  isSaving,
  month,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(() => createInitialForm(budget, month));
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(createInitialForm(budget, month));
      setError("");
    }
  }, [budget, isOpen, month]);

  const availableCategories = useMemo(() => {
    if (budget) {
      return categories;
    }

    const usedCategoryIds = new Set(
      existingBudgets.map((item) => item.category?._id),
    );

    return categories.filter(
      (category) =>
        !category.isArchived && !usedCategoryIds.has(category._id),
    );
  }, [budget, categories, existingBudgets]);

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

    const amount = Number(form.amount);

    if (!budget && !form.categoryId) {
      setError("Choose an expense category for this budget.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a budget amount greater than zero.");
      return;
    }

    const note = form.note.trim();

    if (note.length > 300) {
      setError("Budget note cannot exceed 300 characters.");
      return;
    }

    const payload = {
      amount,
      note,
    };

    if (!budget) {
      payload.categoryId = form.categoryId;
      payload.month = month;
    }

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {budget ? "Edit budget" : "Create budget"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {budget
                ? `Update the limit for ${budget.category?.name || "this category"}.`
                : "Set a monthly spending limit for an expense category."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close budget form"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {!budget && (
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Expense category
              <select
                value={form.categoryId}
                onChange={(event) =>
                  updateField("categoryId", event.target.value)
                }
                className={fieldClassName}
              >
                <option value="">Select category</option>
                {availableCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!budget && availableCategories.length === 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              Every active expense category already has a budget for this month.
            </p>
          )}

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Monthly limit
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => updateField("amount", event.target.value)}
              className={fieldClassName}
              placeholder="5000"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Note <span className="font-normal text-slate-400">(optional)</span>
            <textarea
              rows={3}
              maxLength={300}
              value={form.note}
              onChange={(event) => updateField("note", event.target.value)}
              className={`${fieldClassName} resize-none`}
              placeholder="Groceries, dining, subscriptions..."
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

            <Button
              type="submit"
              disabled={isSaving || (!budget && availableCategories.length === 0)}
            >
              {isSaving
                ? "Saving..."
                : budget
                  ? "Save changes"
                  : "Create budget"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetModal;
