import { X } from "lucide-react";
import { useEffect, useState } from "react";

import Button from "../ui/Button";

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const accountTypes = [
  ["BANK", "Bank account"],
  ["CASH", "Cash"],
  ["CARD", "Credit or debit card"],
  ["WALLET", "Digital wallet"],
  ["INVESTMENT", "Investment"],
];

const colorOptions = [
  ["emerald", "Emerald"],
  ["blue", "Blue"],
  ["violet", "Violet"],
  ["amber", "Amber"],
  ["rose", "Rose"],
  ["slate", "Slate"],
];

const createInitialForm = (account) => ({
  name: account?.name || "",
  type: account?.type || "BANK",
  balance: account ? String(account.balance ?? 0) : "0",
  currency: account?.currency || "INR",
  color: account?.color || "emerald",
  icon: account?.icon || "wallet",
});

const AccountModal = ({
  account,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(() => createInitialForm(account));
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(createInitialForm(account));
      setError("");
    }
  }, [account, isOpen]);

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
    const balance = Number(form.balance);

    if (name.length < 2) {
      setError("Enter an account name containing at least 2 characters.");
      return;
    }

    if (!account && !Number.isFinite(balance)) {
      setError("Enter a valid opening balance.");
      return;
    }

    const payload = {
      name,
      type: form.type,
      currency: form.currency,
      color: form.color,
      icon: form.icon,
    };

    if (!account) {
      payload.balance = balance;
    }

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {account ? "Edit account" : "Create account"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {account
                ? "Update the account details used across FinTrack."
                : "Add the place where you keep or manage money."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close account form"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Account name
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                maxLength={60}
                className={fieldClassName}
                placeholder="HDFC Bank, Cash wallet, Zerodha..."
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Account type
              <select
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
                className={fieldClassName}
              >
                {accountTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Currency
              <select
                value={form.currency}
                onChange={(event) => updateField("currency", event.target.value)}
                className={fieldClassName}
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </label>

            {!account && (
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Opening balance
                <input
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={(event) => updateField("balance", event.target.value)}
                  className={fieldClassName}
                  placeholder="0.00"
                />
              </label>
            )}

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Card colour
              <select
                value={form.color}
                onChange={(event) => updateField("color", event.target.value)}
                className={fieldClassName}
              >
                {colorOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {account && (
            <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              Account balances are changed through transactions, so the current
              balance cannot be edited directly.
            </p>
          )}

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
                : account
                  ? "Save changes"
                  : "Create account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;
