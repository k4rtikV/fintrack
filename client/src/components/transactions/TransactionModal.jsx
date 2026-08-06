import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Button from "../ui/Button";

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const getToday = () => new Date().toISOString().slice(0, 10);

const createInitialForm = (transaction) => ({
  type: transaction?.type || "EXPENSE",
  title: transaction?.title || "",
  amount: transaction?.amount ? String(transaction.amount) : "",
  accountId: transaction?.account?._id || transaction?.account || "",
  categoryId: transaction?.category?._id || transaction?.category || "",
  transactionDate: transaction?.transactionDate
    ? new Date(transaction.transactionDate).toISOString().slice(0, 10)
    : getToday(),
  paymentMethod: transaction?.paymentMethod || "OTHER",
  note: transaction?.note || "",
  tags: transaction?.tags?.join(", ") || "",
});

const TransactionModal = ({
  accounts,
  categories,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
  transaction,
}) => {
  const [form, setForm] = useState(() => createInitialForm(transaction));
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(createInitialForm(transaction));
      setError("");
    }
  }, [isOpen, transaction]);

  const matchingCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  if (!isOpen) {
    return null;
  }

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "type" ? { categoryId: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const amount = Number(form.amount);

    if (!form.title.trim() || form.title.trim().length < 2) {
      setError("Enter a title containing at least 2 characters.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!form.accountId || !form.categoryId) {
      setError("Select an account and category.");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);

    await onSubmit({
      accountId: form.accountId,
      categoryId: form.categoryId,
      type: form.type,
      amount,
      title: form.title.trim(),
      note: form.note.trim(),
      transactionDate: new Date(`${form.transactionDate}T12:00:00`).toISOString(),
      paymentMethod: form.paymentMethod,
      tags,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {transaction ? "Edit transaction" : "Add transaction"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Account balances update automatically after saving.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close transaction form"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            {["EXPENSE", "INCOME"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateField("type", type)}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  form.type === type
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {type === "EXPENSE" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Title
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={100}
                className={fieldClassName}
                placeholder="Groceries, salary, rent..."
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                className={fieldClassName}
                placeholder="0.00"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Date
              <input
                type="date"
                value={form.transactionDate}
                onChange={(event) =>
                  updateField("transactionDate", event.target.value)
                }
                className={fieldClassName}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Account
              <select
                value={form.accountId}
                onChange={(event) => updateField("accountId", event.target.value)}
                className={fieldClassName}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Category
              <select
                value={form.categoryId}
                onChange={(event) => updateField("categoryId", event.target.value)}
                className={fieldClassName}
              >
                <option value="">Select category</option>
                {matchingCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Payment method
              <select
                value={form.paymentMethod}
                onChange={(event) =>
                  updateField("paymentMethod", event.target.value)
                }
                className={fieldClassName}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Tags
              <input
                value={form.tags}
                onChange={(event) => updateField("tags", event.target.value)}
                className={fieldClassName}
                placeholder="food, monthly, work"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Note
              <textarea
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                maxLength={500}
                rows={3}
                className={`${fieldClassName} resize-none`}
                placeholder="Optional details"
              />
            </label>
          </div>

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
                : transaction
                  ? "Save changes"
                  : "Add transaction"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
