import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Button from "../ui/Button";
import { getDateKey, getDateKeyInTimeZone } from "../../utils/dateUtils";

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-copper-400 focus:ring-2 focus:ring-copper-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const createInitialForm = (recurring, timezone) => ({
  title: recurring?.title || "",
  type: recurring?.type || "EXPENSE",
  amount: recurring ? String(recurring.amount ?? "") : "",
  accountId: recurring?.account?._id || recurring?.account || "",
  destinationAccountId: recurring?.destinationAccount?._id || recurring?.destinationAccount || "",
  categoryId: recurring?.category?._id || recurring?.category || "",
  paymentMethod: recurring?.paymentMethod || "OTHER",
  frequency: recurring?.frequency || "MONTHLY",
  interval: recurring ? String(recurring.interval || 1) : "1",
  startDate: getDateKey(recurring?.startDate) || getDateKeyInTimeZone(new Date(), timezone),
  endDate: getDateKey(recurring?.endDate),
  note: recurring?.note || "",
  tags: Array.isArray(recurring?.tags) ? recurring.tags.join(", ") : "",
});

const RecurringModal = ({ recurring, accounts, categories, isOpen, isSaving, onClose, onSubmit, timezone }) => {
  const [form, setForm] = useState(() => createInitialForm(recurring, timezone));
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(createInitialForm(recurring, timezone));
      setError("");
    }
  }, [isOpen, recurring, timezone]);

  const filteredCategories = useMemo(() => categories.filter((category) => category.type === form.type), [categories, form.type]);
  const sourceAccount = useMemo(() => accounts.find((account) => account._id === form.accountId), [accounts, form.accountId]);
  const destinationAccounts = useMemo(() => accounts.filter((account) => account._id !== form.accountId && (!sourceAccount || account.currency === sourceAccount.currency)), [accounts, form.accountId, sourceAccount]);

  useEffect(() => {
    if (form.type !== "TRANSFER" && form.categoryId && !filteredCategories.some((category) => category._id === form.categoryId)) {
      setForm((current) => ({ ...current, categoryId: "" }));
    }
  }, [filteredCategories, form.categoryId, form.type]);

  useEffect(() => {
    if (form.destinationAccountId && !destinationAccounts.some((account) => account._id === form.destinationAccountId)) {
      setForm((current) => ({ ...current, destinationAccountId: "" }));
    }
  }, [destinationAccounts, form.destinationAccountId]);

  if (!isOpen) return null;

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "type" ? { categoryId: "", destinationAccountId: "", paymentMethod: value === "TRANSFER" ? "BANK_TRANSFER" : current.paymentMethod } : {}),
      ...(field === "accountId" ? { destinationAccountId: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const title = form.title.trim();
    const amount = Number(form.amount);
    const interval = Number(form.interval);

    if (title.length < 2 || title.length > 100) return setError("Title must contain between 2 and 100 characters.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount greater than zero.");
    if (!form.accountId) return setError(form.type === "TRANSFER" ? "Select a source account." : "Select an account.");
    if (form.type === "TRANSFER") {
      if (!form.destinationAccountId) return setError("Select a destination account.");
      if (form.destinationAccountId === form.accountId) return setError("Destination account must be different from source account.");
    } else if (!form.categoryId) return setError("Select a category.");
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) return setError("Interval must be a whole number between 1 and 365.");
    if (!form.startDate) return setError("Choose a start date.");
    if (form.endDate && form.endDate < form.startDate) return setError("End date cannot be before the start date.");

    const tags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10);
    await onSubmit({
      title,
      type: form.type,
      amount,
      accountId: form.accountId,
      ...(form.type === "TRANSFER" ? { destinationAccountId: form.destinationAccountId } : { categoryId: form.categoryId }),
      paymentMethod: form.type === "TRANSFER" ? "BANK_TRANSFER" : form.paymentMethod,
      frequency: form.frequency,
      interval,
      startDate: form.startDate,
      endDate: form.endDate || null,
      note: form.note.trim(),
      tags,
    });
  };

  const intervalWord = { DAILY: "day(s)", WEEKLY: "week(s)", MONTHLY: "month(s)", YEARLY: "year(s)" }[form.frequency];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{recurring ? "Edit Autopay" : "Set up Autopay"}</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Automate scheduled expenses, income, or account-to-account transfers.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close Autopay form"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            {[["EXPENSE", "Expense"], ["INCOME", "Income"], ["TRANSFER", "Transfer"]].map(([value, label]) => (
              <button key={value} type="button" onClick={() => updateField("type", value)} className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${form.type === value ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{label}</button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Title<input value={form.title} onChange={(event) => updateField("title", event.target.value)} className={fieldClassName} placeholder={form.type === "TRANSFER" ? "Monthly savings transfer" : "Monthly rent"} maxLength={100} /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => updateField("amount", event.target.value)} className={fieldClassName} placeholder="25000" /></label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{form.type === "TRANSFER" ? "From account" : "Account"}<select value={form.accountId} onChange={(event) => updateField("accountId", event.target.value)} className={fieldClassName}><option value="">Select account</option>{accounts.filter((account) => !account.isArchived).map((account) => <option key={account._id} value={account._id}>{account.name} · {account.currency}</option>)}</select></label>
            {form.type === "TRANSFER" ? (
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">To account<select value={form.destinationAccountId} onChange={(event) => updateField("destinationAccountId", event.target.value)} className={fieldClassName} disabled={!form.accountId}><option value="">Select destination</option>{destinationAccounts.map((account) => <option key={account._id} value={account._id}>{account.name} · {account.currency}</option>)}</select></label>
            ) : (
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Category<select value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)} className={fieldClassName}><option value="">Select category</option>{filteredCategories.filter((category) => !category.isArchived).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Frequency<select value={form.frequency} onChange={(event) => updateField("frequency", event.target.value)} className={fieldClassName}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Repeat every<div className="mt-1.5 flex items-center gap-2"><input type="number" min="1" max="365" step="1" value={form.interval} onChange={(event) => updateField("interval", event.target.value)} className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-copper-400 focus:ring-2 focus:ring-copper-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /><span className="text-sm text-slate-500 dark:text-slate-400">{intervalWord}</span></div></label>
            {form.type !== "TRANSFER" && <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Payment method<select value={form.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value)} className={fieldClassName}><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option><option value="OTHER">Other</option></select></label>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Start date<input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} className={fieldClassName} /></label>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">End date <span className="font-normal text-slate-400">(optional)</span><input type="date" min={form.startDate} value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} className={fieldClassName} /></label>
          </div>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Tags <span className="font-normal text-slate-400">(optional, comma separated)</span><input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} className={fieldClassName} placeholder="rent, salary, savings" /></label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Note <span className="font-normal text-slate-400">(optional)</span><textarea rows={3} maxLength={500} value={form.note} onChange={(event) => updateField("note", event.target.value)} className={`${fieldClassName} resize-none`} placeholder="Anything useful about this Autopay..." /></label>

          {form.type === "TRANSFER" && <p className="rounded-2xl border border-steel-200 bg-steel-50 px-4 py-3 text-sm text-steel-800 dark:border-steel-500/20 dark:bg-steel-500/10 dark:text-steel-200">Autopay transfers move money between same-currency accounts and do not count as income or spending.</p>}
          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

          <div className="flex justify-end gap-3"><Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : recurring ? "Save changes" : "Set up Autopay"}</Button></div>
        </form>
      </div>
    </div>
  );
};

export default RecurringModal;
