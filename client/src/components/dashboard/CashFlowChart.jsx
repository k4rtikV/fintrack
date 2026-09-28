import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, TrendingUp } from "lucide-react";

import { formatCurrency } from "../../utils/formatters";
import EmptyState from "../ui/EmptyState";

const SERIES_META = {
  incomeFlow: {
    label: "Income",
    color: "#10b981",
    textClass: "text-emerald-300",
  },
  expenseFlow: {
    label: "Expenses",
    color: "#f43f5e",
    textClass: "text-rose-300",
  },
  netFlow: {
    label: "Net",
    color: "var(--ft-copper-bright)",
    textClass: "text-copper-300",
  },
};

const SERIES_ORDER = ["incomeFlow", "expenseFlow", "netFlow"];

const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReducedMotion(event.matches);

    mediaQuery.addEventListener?.("change", onChange);
    return () => mediaQuery.removeEventListener?.("change", onChange);
  }, []);

  return reducedMotion;
};

const CashFlowChart = ({ data = [], currency = "INR" }) => {
  const reducedMotion = useReducedMotion();
  const gradientBase = useId().replaceAll(":", "");
  const [hoverPoint, setHoverPoint] = useState(null);

  const chartData = useMemo(
    () =>
      data.map((item) => {
        const income = Math.max(0, Number(item.income) || 0);
        const expense = Math.max(0, Number(item.expense) || 0);

        return {
          ...item,
          incomeFlow: income,
          expenseFlow: -expense,
          netFlow: Number(item.netSavings ?? income - expense) || 0,
        };
      }),
    [data],
  );

  const hasActivity = chartData.some(
    (item) => item.incomeFlow > 0 || Math.abs(item.expenseFlow) > 0,
  );

  const maxMagnitude = Math.max(
    1,
    ...chartData.flatMap((item) => [
      item.incomeFlow,
      Math.abs(item.expenseFlow),
      Math.abs(item.netFlow),
    ]),
  );
  const chartLimit = maxMagnitude * 1.18;

  const latestIndex = Math.max(chartData.length - 1, 0);
  const currentMonth = chartData[latestIndex];
  const periodNet = chartData.reduce((sum, item) => sum + item.netFlow, 0);

  const formatSeriesValue = (seriesKey, payload) => {
    if (seriesKey === "expenseFlow") {
      return formatCurrency(Math.abs(payload?.expenseFlow || 0), currency);
    }

    if (seriesKey === "netFlow") {
      const value = payload?.netFlow || 0;
      return `${value >= 0 ? "+" : ""}${formatCurrency(value, currency)}`;
    }

    return formatCurrency(payload?.incomeFlow || 0, currency);
  };

  const hoverRows = hoverPoint
    ? [
        hoverPoint.seriesKey,
        ...SERIES_ORDER.filter((key) => key !== hoverPoint.seriesKey),
      ].map((key) => ({
        key,
        ...SERIES_META[key],
        value: formatSeriesValue(key, hoverPoint.payload),
      }))
    : [];

  const renderHoverDot = (seriesKey) => ({ cx, cy, index, payload }) => {
    const meta = SERIES_META[seriesKey];
    const isHovered =
      hoverPoint?.index === index && hoverPoint?.seriesKey === seriesKey;

    const matchingSeries = SERIES_ORDER.filter(
      (key) => Number(payload?.[key] || 0) === Number(payload?.[seriesKey] || 0),
    );
    const matchIndex = matchingSeries.indexOf(seriesKey);
    const overlapOffset =
      matchingSeries.length > 1
        ? (matchIndex - (matchingSeries.length - 1) / 2) * 7
        : 0;
    const dotX = cx + overlapOffset;

    const showDetails = () =>
      setHoverPoint({
        index,
        seriesKey,
        cx: dotX,
        cy,
        payload,
      });

    const hideDetails = () =>
      setHoverPoint((current) =>
        current?.index === index && current?.seriesKey === seriesKey
          ? null
          : current,
      );

    return (
      <g
        role="img"
        tabIndex={0}
        aria-label={`${payload?.label || `Period ${index + 1}`}: ${SERIES_META[seriesKey].label} ${formatSeriesValue(seriesKey, payload)}. Income ${formatSeriesValue("incomeFlow", payload)}, expenses ${formatSeriesValue("expenseFlow", payload)}, net ${formatSeriesValue("netFlow", payload)}.`}
        onMouseEnter={showDetails}
        onMouseLeave={hideDetails}
        onFocus={showDetails}
        onBlur={hideDetails}
        style={{ cursor: "help", outline: "none" }}
      >
        <circle
          cx={dotX}
          cy={cy}
          r={24}
          fill="transparent"
          stroke="transparent"
        />
        <circle
          cx={dotX}
          cy={cy}
          r={isHovered ? 5.5 : 3.25}
          fill={meta.color}
          stroke={isHovered ? "var(--ft-ivory)" : "var(--ft-blue-steel-deep)"}
          strokeWidth={isHovered ? 2.5 : 1.25}
        />
      </g>
    );
  };

  const hoverBoxOnLeft =
    hoverPoint && hoverPoint.index >= Math.max(chartData.length - 2, 0);
  const hoverBoxBelow = hoverPoint && hoverPoint.cy < 72;

  return (
    <section className="relative min-h-[430px] overflow-hidden rounded-[2rem] bg-slate-100/60 p-5 ring-1 ring-inset ring-slate-200/60 sm:p-6 dark:bg-slate-900/45 dark:ring-slate-700/35">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_0%,rgba(94,137,147,0.12),transparent_38%),radial-gradient(circle_at_10%_100%,rgba(181,111,70,0.08),transparent_40%)]" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-copper-600 dark:text-copper-400">
              <Activity size={14} />
              Cash flow
            </div>
            <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">
              How your money moved
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Income rises above the horizon; spending falls below it.
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              Six-month net
            </div>
            <div
              className={`mt-1 text-xl font-black ${
                periodNet >= 0
                  ? "text-copper-700 dark:text-copper-300"
                  : "text-rose-600 dark:text-rose-300"
              }`}
            >
              {periodNet >= 0 ? "+" : ""}
              {formatCurrency(periodNet, currency)}
            </div>
          </div>
        </div>

        {!hasActivity ? (
          <EmptyState
            icon={TrendingUp}
            title="No cash-flow activity yet"
            description="Your income and expense movement will appear after transactions are recorded."
          />
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/55 p-3 ring-1 ring-inset ring-slate-200/55 sm:grid-cols-4 dark:bg-slate-950/35 dark:ring-slate-700/35">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  Current month
                </div>
                <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">
                  {currentMonth?.label || "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  Income
                </div>
                <div className="mt-1 font-bold text-emerald-600 dark:text-emerald-300">
                  {formatCurrency(currentMonth?.incomeFlow || 0, currency)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  Expenses
                </div>
                <div className="mt-1 font-bold text-rose-600 dark:text-rose-300">
                  {formatCurrency(Math.abs(currentMonth?.expenseFlow || 0), currency)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  Net
                </div>
                <div
                  className={`mt-1 font-black ${
                    (currentMonth?.netFlow || 0) >= 0
                      ? "text-copper-700 dark:text-copper-300"
                      : "text-rose-600 dark:text-rose-300"
                  }`}
                >
                  {(currentMonth?.netFlow || 0) >= 0 ? "+" : ""}
                  {formatCurrency(currentMonth?.netFlow || 0, currency)}
                </div>
              </div>
            </div>

            <div className="relative mt-3 h-[285px] w-full">
              <div className="pointer-events-none absolute left-1 top-[18%] z-10 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-500/70">
                Inflow
              </div>
              <div className="pointer-events-none absolute bottom-[18%] left-1 z-10 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-500/65">
                Outflow
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 14, right: 12, left: 8, bottom: 2 }}
                  onMouseLeave={() => setHoverPoint(null)}
                >
                  <defs>
                    <linearGradient id={`${gradientBase}-income`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.015" />
                    </linearGradient>
                    <linearGradient id={`${gradientBase}-expense`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.015" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.22" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke="var(--ft-steel)"
                    strokeOpacity={0.09}
                    strokeDasharray="2 10"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#929ba3" }}
                    dy={8}
                  />
                  <YAxis hide domain={[-chartLimit, chartLimit]} />
                  <ReferenceLine
                    y={0}
                    stroke="var(--ft-steel)"
                    strokeOpacity={0.42}
                    strokeWidth={1.4}
                  />

                  <Area
                    type="monotone"
                    dataKey="incomeFlow"
                    stroke="#10b981"
                    strokeOpacity={0.55}
                    strokeWidth={1.5}
                    fill={`url(#${gradientBase}-income)`}
                    isAnimationActive={!reducedMotion}
                    animationDuration={650}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenseFlow"
                    stroke="#f43f5e"
                    strokeOpacity={0.52}
                    strokeWidth={1.5}
                    fill={`url(#${gradientBase}-expense)`}
                    isAnimationActive={!reducedMotion}
                    animationDuration={650}
                  />
                  <Line
                    type="monotone"
                    dataKey="netFlow"
                    stroke="var(--ft-copper-bright)"
                    strokeWidth={3.2}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={!reducedMotion}
                    animationDuration={720}
                  />

                  {SERIES_ORDER.map((seriesKey) => (
                    <Line
                      key={`${seriesKey}-hover-dots`}
                      type="monotone"
                      dataKey={seriesKey}
                      stroke="transparent"
                      strokeWidth={0}
                      dot={renderHoverDot(seriesKey)}
                      activeDot={false}
                      isAnimationActive={false}
                      legendType="none"
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>

              {hoverPoint ? (
                <div
                  className="pointer-events-none absolute z-30 min-w-[190px] rounded-xl border border-slate-600/50 bg-slate-950/95 p-3 shadow-xl shadow-black/25 backdrop-blur-md"
                  style={{
                    left: `${hoverPoint.cx}px`,
                    top: `${hoverPoint.cy}px`,
                    transform: hoverBoxOnLeft
                      ? `translate(calc(-100% - 14px), ${hoverBoxBelow ? "12px" : "-50%"})`
                      : `translate(14px, ${hoverBoxBelow ? "12px" : "-50%"})`,
                  }}
                >
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    {hoverPoint.payload?.label || "Period"}
                  </div>
                  <div className="space-y-1.5">
                    {hoverRows.map((row, rowIndex) => (
                      <div
                        key={row.key}
                        className={`flex items-center justify-between gap-5 text-xs ${
                          rowIndex === 0 ? "font-extrabold" : "font-semibold"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-slate-300">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: row.color }}
                          />
                          {row.label}
                        </span>
                        <span className={row.textClass}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-1 flex items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Green = inflow · Red = outflow · Copper = net</span>
              <span className="font-semibold text-copper-700 dark:text-copper-300">
                Hover any dot for details
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default CashFlowChart;
