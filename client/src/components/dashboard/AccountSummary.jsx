import { Landmark } from "lucide-react";

import { formatCurrency } from "../../utils/formatters";
import DashboardCard from "../layout/DashboardCard";
import EmptyState from "../ui/EmptyState";

const AccountSummary = ({ accounts = [], currency = "INR" }) => {
  return (
    <DashboardCard>
      <div>
        <h2 className="font-bold text-slate-900 dark:text-white">
          Account balances
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Balance distribution across active accounts.
        </p>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No accounts added"
          description="Add an account to start tracking your total balance."
        />
      ) : (
        <div className="mt-5 space-y-4">
          {accounts.slice(0, 5).map((account) => (
            <div key={account._id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {account.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {account.type.replaceAll("_", " ")}
                  </p>
                </div>

                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrency(account.balance, account.currency || currency)}
                </p>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(Math.max(account.percentage || 0, 0), 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
};

export default AccountSummary;
