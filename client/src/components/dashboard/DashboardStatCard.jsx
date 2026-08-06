import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import DashboardCard from "../layout/DashboardCard";

const DashboardStatCard = ({
  label,
  value,
  note,
  icon: Icon,
  tone = "emerald",
  trend,
}) => {
  const toneClasses = {
    emerald:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    violet:
      "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  };

  const TrendIcon =
    trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;

  return (
    <DashboardCard className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
        >
          <Icon size={20} />
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs">
        {typeof trend === "number" && (
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              trend > 0
                ? "text-emerald-600 dark:text-emerald-300"
                : trend < 0
                  ? "text-rose-600 dark:text-rose-300"
                  : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <TrendIcon size={14} />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}

        <span className="text-slate-400 dark:text-slate-500">{note}</span>
      </div>
    </DashboardCard>
  );
};

export default DashboardStatCard;
