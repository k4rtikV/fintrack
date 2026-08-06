import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactCurrency, formatCurrency } from "../../utils/formatters";
import DashboardCard from "../layout/DashboardCard";
import EmptyState from "../ui/EmptyState";
import { TrendingUp } from "lucide-react";

const CashFlowChart = ({ data = [], currency = "INR" }) => {
  const hasActivity = data.some(
    (item) => Number(item.income) > 0 || Number(item.expense) > 0,
  );

  return (
    <DashboardCard className="min-h-[410px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">
            Cash flow trend
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Income and expenses over the last six months.
          </p>
        </div>

        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          Last 6 months
        </span>
      </div>

      {!hasActivity ? (
        <EmptyState
          icon={TrendingUp}
          title="No cash-flow activity yet"
          description="Your income and expense trend will appear after transactions are recorded."
        />
      ) : (
        <div className="mt-6 h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.25} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCompactCurrency(value, currency)}
                width={72}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(value, currency),
                  name === "income" ? "Income" : "Expenses",
                ]}
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "income" ? "Income" : "Expenses"
                }
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardCard>
  );
};

export default CashFlowChart;
