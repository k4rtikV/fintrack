import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactCurrency, formatCurrency } from "../../utils/formatters";
import DashboardCard from "../layout/DashboardCard";
import EmptyState from "../ui/EmptyState";

const metricLabel = {
  income: "Income",
  expense: "Expenses",
  netSavings: "Net savings",
};

const ReportCashFlowChart = ({ data = [], currency = "INR" }) => {
  const hasActivity = data.some(
    (item) => Number(item.income) > 0 || Number(item.expense) > 0,
  );
  const isSingleMonth = data.length === 1;
  const periodLabel = isSingleMonth
    ? data[0]?.label || "Selected month"
    : `${data.length} month${data.length === 1 ? "" : "s"}`;

  const singleMonthData = isSingleMonth
    ? [
        { name: "Income", value: Number(data[0]?.income || 0), metric: "income" },
        { name: "Expenses", value: Number(data[0]?.expense || 0), metric: "expense" },
        { name: "Net savings", value: Number(data[0]?.netSavings || 0), metric: "netSavings" },
      ]
    : [];

  return (
    <DashboardCard className="min-h-[430px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">
            Cash flow
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isSingleMonth
              ? "Compare income, expenses, and net savings for the selected month."
              : "Compare income, expenses, and net savings across the selected report period."}
          </p>
        </div>

        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {periodLabel}
        </span>
      </div>

      {!hasActivity ? (
        <EmptyState
          icon={TrendingUp}
          title="No cash-flow activity in this period"
          description="Choose another report period or record transactions to populate the cash-flow analysis."
        />
      ) : isSingleMonth ? (
        <div className="mt-6 h-[330px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={singleMonthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.25} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCompactCurrency(value, currency)}
                width={74}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value, currency), "Amount"]}
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                }}
              />
              <Bar dataKey="value" fill="#64748b" radius={[8, 8, 0, 0]} maxBarSize={90} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-6 h-[330px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.25} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCompactCurrency(value, currency)}
                width={74}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(value, currency),
                  metricLabel[name] || name,
                ]}
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                }}
              />
              <Legend formatter={(value) => metricLabel[value] || value} />
              <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={48} />
              <Line
                type="linear"
                dataKey="netSavings"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: data.length <= 8 ? 4 : 2 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardCard>
  );
};

export default ReportCashFlowChart;
