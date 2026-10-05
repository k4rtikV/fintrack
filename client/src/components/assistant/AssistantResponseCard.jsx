import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  Link2,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useId } from "react";
import { Link } from "react-router-dom";

const statusConfig = {
  positive: {
    label: "On track",
    badge:
      "border-emerald-900/60 bg-emerald-500/10 text-emerald-300",
    icon: CheckCircle2,
  },
  neutral: {
    label: "Informational",
    badge:
      "border-steel-600/50 bg-steel-500/10 text-steel-200",
    icon: BrainCircuit,
  },
  warning: {
    label: "Needs attention",
    badge:
      "border-amber-900/60 bg-amber-500/10 text-amber-300",
    icon: AlertTriangle,
  },
  critical: {
    label: "High attention",
    badge:
      "border-rose-900/60 bg-rose-500/10 text-rose-300",
    icon: AlertTriangle,
  },
};

const metricToneClasses = {
  positive: "border-emerald-900/50 bg-emerald-500/10",
  neutral: "border-slate-700 bg-slate-900/70",
  warning: "border-amber-900/50 bg-amber-500/10",
  critical: "border-rose-900/50 bg-rose-500/10",
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
    get_recent_transactions: "Ordinary transactions",
    get_recurring_transactions: "Autopay",
    get_investment_portfolio: "Investment portfolio",
    get_investment_activity: "Investment activity",
    get_investment_watchlist: "Investment watchlist",
    get_investment_calendar: "Investment calendar",
    get_stock_research: "Stock research",
    get_account_activity: "Unified account activity",
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

const MiniRibbon = ({ chart }) => {
  const gradientId = `assistantRibbonFill-${useId().replaceAll(":", "")}`;
  const points = Array.isArray(chart?.points)
    ? chart.points.filter((point) => Number.isFinite(Number(point?.value)))
    : [];

  if (points.length < 2) {
    return null;
  }

  const width = 520;
  const height = 112;
  const paddingX = 6;
  const paddingY = 10;
  const values = points.map((point) => Number(point.value));
  const low = Math.min(...values);
  const high = Math.max(...values);
  const spread = Math.max(high - low, Math.abs(high) * 0.01, 1);
  const coords = points.map((point, index) => {
    const x = paddingX + (index / (points.length - 1)) * (width - paddingX * 2);
    const y = paddingY + ((high - Number(point.value)) / spread) * (height - paddingY * 2);
    return { x, y };
  });
  const path = coords
    .map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
  const area = `${path} L${coords.at(-1).x.toFixed(2)},${height} L${coords[0].x.toFixed(2)},${height} Z`;
  const change = Number(chart.changePercent);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-950/70 via-slate-900/70 to-steel-900/35 p-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-copper-300">
          {chart.label || "Trend"}
        </span>
        {Number.isFinite(change) && (
          <span className={`text-xs font-semibold ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" role="img" aria-label={`${chart.label || "Trend"} compact price chart`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c58a62" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#c58a62" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke="#c58a62" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={coords.at(-1).x} cy={coords.at(-1).y} r="4.5" fill="#d9a57e" stroke="#0d1620" strokeWidth="2" />
      </svg>
    </div>
  );
};

const ResponseLink = ({ item }) => {
  const href = String(item?.href || "");
  if (!href || !item?.label) return null;

  const className =
    "inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-copper-500/60 hover:text-copper-200";

  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {item.label}
        <ExternalLink size={13} />
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {item.label}
      <Link2 size={13} />
    </Link>
  );
};

const AssistantResponseCard = ({ presentation, onSuggestion, suggestionsDisabled = false }) => {
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
  const evidence = Array.isArray(presentation.evidence)
    ? presentation.evidence.filter(Boolean).slice(0, 4)
    : [];
  const links = Array.isArray(presentation.links)
    ? presentation.links.filter((item) => item?.label && item?.href).slice(0, 3)
    : [];
  const suggestions = Array.isArray(presentation.suggestions)
    ? presentation.suggestions.filter(Boolean).slice(0, 3)
    : [];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/85 text-slate-200 shadow-sm">
      <div className="border-b border-slate-700 bg-slate-950/35 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-copper-300">
              <Sparkles size={14} />
              FinTrack insight
            </div>
            <p className="text-base font-semibold leading-6 text-white">
              {presentation.summary}
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.badge}`}
          >
            <StatusIcon size={13} />
            {presentation.statusLabel || config.label}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {metrics.length > 0 && (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {metrics.map((metric, index) => (
              <div
                key={`${metric.label}-${index}`}
                className={`rounded-xl border p-3.5 ${metricToneClasses[metric.tone] || metricToneClasses.neutral}`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-1 text-lg font-semibold leading-6 text-white">
                  {metric.value}
                </p>
                {metric.detail && (
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {metric.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <MiniRibbon chart={presentation.chart} />

        <div className="text-sm leading-6 text-slate-200">
          <p className="whitespace-pre-wrap">{presentation.answer}</p>
        </div>

        {insights.length > 0 && (
          <div className="rounded-xl border border-steel-600/35 bg-steel-500/10 p-3.5">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-steel-200">
              <BrainCircuit size={15} />
              Key insights
            </div>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={`${insight}-${index}`} className="flex gap-2 text-sm leading-5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-copper-400" />
                  <p>{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <WalletCards size={15} />
              Suggested next steps
            </div>
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div
                  key={`${recommendation}-${index}`}
                  className="flex gap-2 rounded-xl border border-slate-700 bg-slate-950/45 px-3.5 py-3 text-sm leading-5"
                >
                  <ArrowRight size={15} className="mt-0.5 shrink-0 text-copper-400" />
                  <p>{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map((item) => (
              <ResponseLink key={`${item.label}-${item.href}`} item={item} />
            ))}
          </div>
        )}

        {suggestions.length > 0 && typeof onSuggestion === "function" && (
          <div className="border-t border-slate-700/80 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Follow up
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => onSuggestion(suggestion)}
                  disabled={suggestionsDisabled}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-left text-xs leading-4 text-slate-300 transition hover:border-copper-500/60 hover:bg-copper-500/10 hover:text-copper-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-700 pt-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={13} />
            {confidenceLabel(presentation.confidence)}
          </span>

          {toolsUsed.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span>Data used:</span>
              {toolsUsed.map((tool) => (
                <span key={tool} className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                  {formatToolName(tool)}
                </span>
              ))}
            </div>
          )}

          {evidence.map((item, index) => (
            <span key={`${item}-${index}`} className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-400">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssistantResponseCard;
