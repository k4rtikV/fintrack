import { Pencil, Trash2 } from "lucide-react";

import Button from "../ui/Button";
import { formatCurrency, formatDate } from "../../utils/formatters";

const getName = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  return typeof value === "string" ? fallback : value.name || fallback;
};

const TransactionTable = ({
  currency,
  transactions,
  onEdit,
  onDelete,
  deletingId,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              Transaction
            </th>
            <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              Account
            </th>
            <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              Category
            </th>
            <th className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              Date
            </th>
            <th className="border-b border-slate-200 px-4 py-3 text-right dark:border-slate-800">
              Amount
            </th>
            <th className="border-b border-slate-200 px-4 py-3 text-right dark:border-slate-800">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((transaction) => {
            const isIncome = transaction.type === "INCOME";

            return (
              <tr
                key={transaction._id}
                className="group text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/40"
              >
                <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {transaction.title}
                  </p>
                  <p className="mt-1 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                    {transaction.note || transaction.paymentMethod.replaceAll("_", " ")}
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                  {getName(transaction.account, "Account")}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                  {getName(transaction.category, "Category")}
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
                  {formatCurrency(transaction.amount, currency)}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      className="h-9 w-9 p-0"
                      onClick={() => onEdit(transaction)}
                      title="Edit transaction"
                    >
                      <Pencil size={16} />
                    </Button>

                    <Button
                      variant="ghost"
                      className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      onClick={() => onDelete(transaction)}
                      disabled={deletingId === transaction._id}
                      title="Delete transaction"
                    >
                      <Trash2 size={16} />
                    </Button>
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
