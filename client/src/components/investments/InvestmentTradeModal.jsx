import { ArrowDownToLine, ArrowUpFromLine, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Button from "../ui/Button";
import { formatCurrency } from "../../utils/formatters";

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-copper-400 focus:ring-2 focus:ring-copper-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const today = () => new Date().toISOString().slice(0, 10);

const createForm = ({ type = "BUY", accountId = "", price = "" } = {}) => ({
  type,
  accountId,
  quantity: "",
  price: price ? String(price) : "",
  fees: "0",
  tradeDate: today(),
  note: "",
});

const InvestmentTradeModal = ({
  isOpen,
  instrument,
  accounts = [],
  holding,
  defaultType = "BUY",
  suggestedPrice,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(() => createForm());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      createForm({
        type: defaultType,
        accountId: holding?.account?._id || accounts[0]?._id || "",
        price: suggestedPrice,
      }),
    );
    setError("");
  }, [accounts, defaultType, holding, isOpen, suggestedPrice]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account._id === form.accountId),
    [accounts, form.accountId],
  );

  if (!isOpen || !instrument) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const quantity = Number(form.quantity);
  const price = Number(form.price);
  const fees = Number(form.fees || 0);
  const gross = Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0;
  const cashEffect = form.type === "BUY" ? -(gross + fees) : gross - fees;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.accountId) {
      setError("Select an investment account.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid trade price.");
      return;
    }
    if (!Number.isFinite(fees) || fees < 0) {
      setError("Fees cannot be negative.");
      return;
    }

    await onSubmit({
      accountId: form.accountId,
      instrumentId: instrument._id,
      type: form.type,
      quantity,
      price,
      fees,
      tradeDate: form.tradeDate,
      note: form.note.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-copper-600 dark:text-copper-300">
              {instrument.exchange} · {instrument.tradingSymbol}
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
              Record investment trade
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {instrument.shortName || instrument.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close investment trade form"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-950/70">
            {[
              ["BUY", ArrowDownToLine, "Buy"],
              ["SELL", ArrowUpFromLine, "Sell"],
            ].map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => updateField("type", value)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  form.type === value
                    ? "bg-copper-500 text-white dark:text-slate-950"
                    : "text-slate-500 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Investment account
              <select
                value={form.accountId}
                onChange={(event) => updateField("accountId", event.target.value)}
                className={fieldClassName}
                disabled={Boolean(holding?.account?._id)}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name} · {formatCurrency(account.balance, account.currency)} cash
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Quantity
              <input
                type="number"
                min="0.000001"
                step="0.000001"
                value={form.quantity}
                onChange={(event) => updateField("quantity", event.target.value)}
                className={fieldClassName}
                placeholder="10"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Price per share
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                className={fieldClassName}
                placeholder="1250.00"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Fees / brokerage
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.fees}
                onChange={(event) => updateField("fees", event.target.value)}
                className={fieldClassName}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Trade date
              <input
                type="date"
                value={form.tradeDate}
                onChange={(event) => updateField("tradeDate", event.target.value)}
                className={fieldClassName}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Note <span className="font-normal text-slate-400">(optional)</span>
              <textarea
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                maxLength={300}
                rows={2}
                className={fieldClassName}
                placeholder="Broker contract note reference, reason, etc."
              />
            </label>
          </div>

          <div className="rounded-2xl border border-steel-200/70 bg-steel-50/70 p-4 dark:border-steel-800/70 dark:bg-steel-950/35">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Estimated cash movement</span>
              <span className={`font-bold ${cashEffect >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
                {formatCurrency(cashEffect, selectedAccount?.currency || "INR")}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Buys reduce broker cash and create FIFO lots. Sells consume those lots oldest-first and add the proceeds back to broker cash. These trades are not ordinary income or expenses.
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving || accounts.length === 0}>
              {isSaving ? "Saving..." : `Record ${form.type === "BUY" ? "buy" : "sell"}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvestmentTradeModal;
