import { Copy, Pencil, Save, Trash2 } from "lucide-react";

import { formatCurrency, formatDate } from "../../utils/formatters";
import CategoryIcon from "../ui/CategoryIcon";

const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent transition focus:outline-none focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-50";

const TransactionActions = ({
  transaction,
  onEdit,
  onDuplicate,
  onSaveTemplate,
  onDelete,
  deletingId,
}) => (
  <div className="flex flex-wrap justify-end gap-1">
    <button
      type="button"
      className={`${iconButtonClass} text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10`}
      onClick={() => onEdit(transaction)}
      title="Edit transaction"
      aria-label={`Edit ${transaction.title}`}
    >
      <Pencil size={16} />
    </button>
    <button
      type="button"
      className={`${iconButtonClass} text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10`}
      onClick={() => onDuplicate(transaction)}
      title="Duplicate transaction"
      aria-label={`Duplicate ${transaction.title}`}
    >
      <Copy size={16} />
    </button>
    <button
      type="button"
      className={`${iconButtonClass} text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10`}
      onClick={() => onSaveTemplate(transaction)}
      title="Save as template"
      aria-label={`Save ${transaction.title} as template`}
    >
      <Save size={16} />
    </button>
    <button
      type="button"
      className={`${iconButtonClass} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10`}
      onClick={() => onDelete(transaction)}
      disabled={deletingId === transaction._id}
      title="Delete transaction"
      aria-label={`Delete ${transaction.title}`}
    >
      <Trash2 size={16} />
    </button>
  </div>
);

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
  const allSelected =
    transactions.length > 0 &&
    transactions.every((item) => selectedIds.includes(item._id));

  return (
    <>
      <div className="md:hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              aria-label="Select all visible transactions"
            />
            Select all on page
          </label>

          <span className="text-xs font-medium text-slate-400">
            {transactions.length} shown
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {transactions.map((transaction) => {
            const isIncome = transaction.type === "INCOME";
            const isSelected = selectedIds.includes(transaction._id);

            return (
              <article
                key={transaction._id}
                className={`p-4 transition ${
                  isSelected
                    ? "bg-emerald-50/70 dark:bg-emerald-500/10"
                    : "bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(transaction._id)}
                    aria-label={`Select ${transaction.title}`}
                    className="mt-2 shrink-0"
                  />

                  <CategoryIcon
                    icon={transaction.category?.icon}
                    color={transaction.category?.color}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-900 dark:text-white">
                          {transaction.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          {transaction.note ||
                            transaction.paymentMethod.replaceAll("_", " ")}
                        </p>
                      </div>

                      <p
                        className={`shrink-0 whitespace-nowrap text-sm font-bold ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isIncome ? "+" : "−"}
                        {formatCurrency(
                          transaction.amount,
                          transaction.account?.currency || currency,
                        )}
                      </p>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="min-w-0">
                        <dt className="text-slate-400">Account</dt>
                        <dd className="mt-0.5 truncate font-medium text-slate-700 dark:text-slate-200">
                          {transaction.account?.name || "Account"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-slate-400">Category</dt>
                        <dd className="mt-0.5 truncate font-medium text-slate-700 dark:text-slate-200">
                          {transaction.category?.name || "Category"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-slate-400">Date</dt>
                        <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                          {formatDate(transaction.transactionDate)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800">
                      <TransactionActions
                        transaction={transaction}
                        onEdit={onEdit}
                        onDuplicate={onDuplicate}
                        onSaveTemplate={onSaveTemplate}
                        onDelete={onDelete}
                        deletingId={deletingId}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Select all visible transactions"
                />
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
                <tr
                  key={transaction._id}
                  className={`group text-sm transition ${
                    isSelected
                      ? "bg-emerald-50/70 dark:bg-emerald-500/10"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(transaction._id)}
                      aria-label={`Select ${transaction.title}`}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        icon={transaction.category?.icon}
                        color={transaction.category?.color}
                      />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {transaction.title}
                        </p>
                        <p className="mt-1 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                          {transaction.note ||
                            transaction.paymentMethod.replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                    {transaction.account?.name || "Account"}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                    {transaction.category?.name || "Category"}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                    {formatDate(transaction.transactionDate)}
                  </td>
                  <td
                    className={`whitespace-nowrap border-b border-slate-100 px-4 py-4 text-right font-bold dark:border-slate-800/80 ${
                      isIncome
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isIncome ? "+" : "−"}
                    {formatCurrency(
                      transaction.amount,
                      transaction.account?.currency || currency,
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                    <TransactionActions
                      transaction={transaction}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onSaveTemplate={onSaveTemplate}
                      onDelete={onDelete}
                      deletingId={deletingId}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TransactionTable;
