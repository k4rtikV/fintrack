import { ReceiptText } from "lucide-react";

import { formatCurrency, formatDate } from "../../utils/formatters";
import DashboardCard from "../layout/DashboardCard";
import CategoryIcon from "../ui/CategoryIcon";
import EmptyState from "../ui/EmptyState";

const TopExpensesList = ({ expenses = [], currency = "INR" }) => {
  return (
    <DashboardCard>
      <div>
        <h2 className="font-bold text-slate-900 dark:text-white">Top expenses</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your largest expenses overall.
        </p>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No expenses recorded"
          description="Your largest expenses will appear here."
        />
      ) : (
        <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {expenses.map((expense) => (
            <div
              key={expense._id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CategoryIcon
                  icon={expense.category?.icon}
                  color={expense.category?.color}
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {expense.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {expense.category?.name || "Uncategorised"} · {formatDate(expense.transactionDate)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {expense.account?.name || "Account"}
                  </p>
                </div>
              </div>

              <p className="shrink-0 text-sm font-bold text-rose-600 dark:text-rose-300">
                -{formatCurrency(expense.amount, expense.account?.currency || currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
};

export default TopExpensesList;
