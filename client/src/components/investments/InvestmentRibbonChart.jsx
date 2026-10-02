import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../../utils/formatters";

const labelFor = (at, period) => {
  const timestamp = new Date(at);
  if (!Number.isFinite(timestamp.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...(period === "1D" ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short" }) }).format(timestamp);
};
const ChartHover = ({ active, payload, period }) => {
  const row = active && payload?.[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-copper-500/25 bg-slate-950/95 px-3 py-2 text-xs text-slate-200 shadow-lg" role="status">
      <p className="mb-1.5 font-semibold text-copper-300">{labelFor(row.at, period)} · IST</p>
      <p className="font-bold text-white">Close {formatCurrency(row.close, "INR")}</p>
      <p className="mt-1 text-slate-400">Open {formatCurrency(row.open, "INR")} · High {formatCurrency(row.high, "INR")}</p>
      <p className="text-slate-400">Low {formatCurrency(row.low, "INR")}{row.volume != null ? ` · Vol ${Number(row.volume).toLocaleString("en-IN")}` : ""}</p>
    </div>
  );
};
const InvestmentRibbonChart = ({ candles = [], period = "1M", label = "PRICE HISTORY" }) => {
  const gradient = useId().replaceAll(":", "");
  const data = candles.filter((row) => Number.isFinite(Number(row?.close)) && Number(row.close) > 0);
  if (!data.length) return (
    <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-700/70 text-center text-sm text-slate-400">
      No historical candles available for this period.
    </div>
  );
  const latest = data[data.length - 1];
  const first = data[0];
  const movement = latest.close - first.open;
  const extrema = data.flatMap((item) => [item.low, item.high]).filter(Number.isFinite);
  const low = Math.min(...extrema);
  const high = Math.max(...extrema);
  const spread = Math.max(high - low, high * 0.01, 1);
  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  return (
    <div className="rounded-[28px] border border-slate-700/60 bg-gradient-to-br from-slate-950/65 via-slate-900/75 to-slate-900/90 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-copper-400">{label}</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{formatCurrency(latest.close, "INR")}</h3>
          <p className="mt-1 text-xs text-slate-400">Latest candle · {labelFor(latest.at, period)} IST</p>
        </div>
        <p className={`text-sm font-bold ${movement >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {movement >= 0 ? "+" : ""}{formatCurrency(movement, "INR")} ({first.open > 0 ? `${(movement / first.open * 100).toFixed(2)}%` : "—"})
        </p>
      </div>
      <div className="mt-4 h-64 w-full sm:h-80" aria-label="Historical price chart. Hover or focus the data for candle details.">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 3, left: -13 }}>
            <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b77a50" stopOpacity={0.24}/><stop offset="100%" stopColor="#b77a50" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="#667786" strokeOpacity={0.14} vertical={false} strokeDasharray="2 8" />
            <XAxis dataKey="at" tickFormatter={(value) => labelFor(value, period)} tick={{ fill: "#8895a3", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={35} />
            <YAxis domain={[Math.max(0, low - spread * 0.17), high + spread * 0.17]} tick={{ fill: "#8895a3", fontSize: 11 }} tickFormatter={(value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })} axisLine={false} tickLine={false} width={61} />
            <Tooltip isAnimationActive={false} cursor={{ stroke: "#bc815b", strokeOpacity: 0.4, strokeDasharray: "3 5" }} content={<ChartHover period={period} />} />
            <Area type="monotone" dataKey="close" stroke="#c58a62" strokeWidth={2.5} fill={`url(#${gradient})`} dot={false} activeDot={{ r: 5, fill: "#d9a57e", stroke: "#0d1620", strokeWidth: 2 }} isAnimationActive={!reducedMotion} animationDuration={600}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-400"><span>Copper ribbon · price trend</span><span>Hover the curve for OHLC and volume</span></div>
    </div>
  );
};
export default InvestmentRibbonChart;
