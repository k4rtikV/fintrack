import { Copy, Pencil, Save, Trash2 } from "lucide-react";

import { formatCurrency, formatDate } from "../../utils/formatters";
import CategoryIcon from "../ui/CategoryIcon";

const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent transition focus:outline-none focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-50";

const TransactionTable = ({
  currency,
  transactions,
  selectedIds,
  onToggle,
  onToggleAll,
  onEdit,
  onDuplicate,
  onSaveTemplate,
  onDelete,
  deletingId,
}) => {
  const allSelected = transactions.length > 0 && transactions.every((item) => selectedIds.includes(item._id));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all visible transactions" />
            </th>
            <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">Transaction</th>
            <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">Account</th>
            <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">Category</th>
            <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">Date</th>
            <th className="border-b border-slate-200 px-4 py-3 text-right dark:border-slate-800">Amount</th>
            <th className="border-b border-slate-200 px-4 py-3 text-right dark:border-slate-800">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const isIncome = transaction.type === "INCOME";
            const isSelected = selectedIds.includes(transaction._id);

            return (
              <tr key={transaction._id} className={`group text-sm transition ${isSelected ? "bg-emerald-50/70 dark:bg-emerald-500/10" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/40"}`}>
                <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                  <input type="checkbox" checked={isSelected} onChange={() => onToggle(transaction._id)} aria-label={`Select ${transaction.title}`} />
                </td>
                <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <CategoryIcon icon={transaction.category?.icon} color={transaction.category?.color} />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{transaction.title}</p>
                      <p className="mt-1 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">{transaction.note || transaction.paymentMethod.replaceAll("_", " ")}</p>
                    </div>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">{transaction.account?.name || "Account"}</td>
                <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">{transaction.category?.name || "Category"}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">{formatDate(transaction.transactionDate)}</td>
                <td className={`whitespace-nowrap border-b border-slate-100 px-4 py-4 text-right font-bold dark:border-slate-800/80 ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {isIncome ? "+" : "−"}{formatCurrency(transaction.amount, transaction.account?.currency || currency)}
                </td>
                <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                  <div className="flex justify-end gap-1">
                    <button type="button" className={`${iconButtonClass} text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10`} onClick={() => onEdit(transaction)} title="Edit transaction"><Pencil size={16} /></button>
                    <button type="button" className={`${iconButtonClass} text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10`} onClick={() => onDuplicate(transaction)} title="Duplicate transaction"><Copy size={16} /></button>
                    <button type="button" className={`${iconButtonClass} text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10`} onClick={() => onSaveTemplate(transaction)} title="Save as template"><Save size={16} /></button>
                    <button type="button" className={`${iconButtonClass} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10`} onClick={() => onDelete(transaction)} disabled={deletingId === transaction._id} title="Delete transaction"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
