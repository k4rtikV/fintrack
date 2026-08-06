import { PieChart as PieChartIcon } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { formatCurrency } from "../../utils/formatters";
import DashboardCard from "../layout/DashboardCard";
import EmptyState from "../ui/EmptyState";

const fallbackColors = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
];

const CategoryBreakdown = ({ data = [], currency = "INR" }) => {
  return (
    <DashboardCard className="min-h-[410px]">
      <div>
        <h2 className="font-bold text-slate-900 dark:text-white">
          Expense categories
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Where your money went this month.
        </p>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={PieChartIcon}
          title="No expense categories yet"
          description="Category distribution will appear after expense transactions are added."
        />
      ) : (
        <>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={item.categoryId || item.name}
                      fill={item.color || fallbackColors[index % fallbackColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value, currency)}
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {data.slice(0, 5).map((item, index) => (
              <div
                key={item.categoryId || item.name}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        item.color || fallbackColors[index % fallbackColors.length],
                    }}
                  />

                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {item.name}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(item.amount, currency)}
                  </p>
                  <p className="text-xs text-slate-400">{item.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardCard>
  );
};

export default CategoryBreakdown;
