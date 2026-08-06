import { ReceiptText } from "lucide-react";

import { formatCurrency, formatDate } from "../../utils/formatters";
import DashboardCard from "../layout/DashboardCard";
import EmptyState from "../ui/EmptyState";

const TopExpensesList = ({ expenses = [], currency = "INR" }) => {
  return (
    <DashboardCard>
      <div>
        <h2 className="font-bold text-slate-900 dark:text-white">
          Top expenses
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your largest expenses this month.
        </p>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No expenses recorded"
          description="Your largest monthly expenses will appear here."
        />
      ) : (
        <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {expenses.map((expense) => (
            <div
              key={expense._id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{
                    backgroundColor: `${expense.category?.color || "#64748b"}20`,
                  }}
                >
                  {expense.category?.icon || "₹"}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {expense.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {expense.category?.name || "Uncategorised"} · {formatDate(expense.transactionDate)}
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
