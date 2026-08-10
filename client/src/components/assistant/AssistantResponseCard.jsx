import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

const statusConfig = {
  positive: {
    label: "On track",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  neutral: {
    label: "Informational",
    badge:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: BrainCircuit,
  },
  warning: {
    label: "Needs attention",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300",
    icon: AlertTriangle,
  },
  critical: {
    label: "High attention",
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300",
    icon: AlertTriangle,
  },
};

const metricToneClasses = {
  positive:
    "border-emerald-200/100 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-500/10",
  neutral:
    "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
  warning:
    "border-amber-200/100 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-500/10",
  critical:
    "border-rose-200/100 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-500/10",
};

const formatToolName = (toolName) => {
  const labels = {
    get_financial_health_summary: "Financial health",
    get_financial_overview: "Financial overview",
    compare_month_to_date: "Month comparison",
    get_spending_by_category: "Category spending",
    get_budget_status: "Budget status",
    get_goal_progress: "Goal progress",
    get_account_balances: "Account balances",
    get_recent_transactions: "Recent transactions",
    get_recurring_transactions: "Recurring transactions",
    get_monthly_trend: "Monthly trend",
    analyze_spending_patterns: "Spending patterns",
    get_financial_forecast: "Financial forecast",
    simulate_financial_scenario: "What-if simulation",
  };

  return (
    labels[toolName] ||
    String(toolName || "FinTrack data")
      .replace(/^get_/, "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const confidenceLabel = (confidence) => {
  const labels = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
    not_applicable: "Direct data",
  };

  return labels[confidence] || "Direct data";
};

const AssistantResponseCard = ({ presentation }) => {
  if (!presentation) {
    return null;
  }

  const config = statusConfig[presentation.status] || statusConfig.neutral;
  const StatusIcon = config.icon;
  const metrics = Array.isArray(presentation.metrics)
    ? presentation.metrics.slice(0, 4)
    : [];
  const insights = Array.isArray(presentation.insights)
    ? presentation.insights.slice(0, 4)
    : [];
  const recommendations = Array.isArray(presentation.recommendations)
    ? presentation.recommendations.slice(0, 3)
    : [];
  const toolsUsed = Array.isArray(presentation.toolsUsed)
    ? [...new Set(presentation.toolsUsed)]
    : [];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <div className="border-b border-slate-200 bg-white/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <Sparkles size={14} />
              FinTrack insight
            </div>
            <p className="text-base font-semibold leading-6 text-slate-950 dark:text-white">
              {presentation.summary}
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.badge}`}
          >
            <StatusIcon size={13} />
            {config.label}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {metrics.length > 0 && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {metrics.map((metric, index) => (
              <div
                key={`${metric.label}-${index}`}
                className={`rounded-xl border p-3.5 ${
                  metricToneClasses[metric.tone] || metricToneClasses.neutral
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-1 text-lg font-semibold leading-6 text-slate-950 dark:text-white">
                  {metric.value}
                </p>
                {metric.detail && (
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {metric.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-sm leading-6 text-slate-700 dark:text-slate-200">
          <p className="whitespace-pre-wrap">{presentation.answer}</p>
        </div>

        {insights.length > 0 && (
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3.5 dark:border-cyan-900/40 dark:bg-cyan-500/10">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
              <BrainCircuit size={15} />
              Key insights
            </div>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={`${insight}-${index}`} className="flex gap-2 text-sm leading-5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                  <p>{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <WalletCards size={15} />
              Suggested next steps
            </div>
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div
                  key={`${recommendation}-${index}`}
                  className="flex gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-5 dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <ArrowRight
                    size={15}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                  <p>{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-[11px] text-slate-400 dark:border-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={13} />
            {confidenceLabel(presentation.confidence)}
          </span>

          {toolsUsed.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span>Data used:</span>
              {toolsUsed.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full bg-slate-200/70 px-2 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                >
                  {formatToolName(tool)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantResponseCard;
