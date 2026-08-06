import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatCurrency } from "../../utils/formatters";
import DashboardCard from "../layout/DashboardCard";

const chartColors = [
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#64748b",
];

const AccountDistributionChart = ({ accounts = [], currency = "INR" }) => {
  const positiveAccounts = accounts.filter(
    (account) => !account.isArchived && Number(account.balance) > 0,
  );

  return (
    <DashboardCard>
      <div>
        <h2 className="font-bold text-slate-900 dark:text-white">
          Balance distribution
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          How your positive balances are divided across active accounts.
        </p>
      </div>

      {positiveAccounts.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center text-center">
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              No positive balances to chart
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Add an opening balance or record income to an account.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_0.9fr]">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={positiveAccounts}
                  dataKey="balance"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  {positiveAccounts.map((account, index) => (
                    <Cell
                      key={account._id}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value, _name, item) => [
                    formatCurrency(value, item.payload.currency || currency),
                    item.payload.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {positiveAccounts.map((account, index) => (
              <div key={account._id} className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: chartColors[index % chartColors.length],
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {account.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatCurrency(account.balance, account.currency || currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardCard>
  );
};

export default AccountDistributionChart;
