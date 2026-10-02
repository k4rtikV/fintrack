import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../../utils/formatters";
import DashboardCard from "../layout/DashboardCard";

const valueText = (value) => `${value >= 0 ? "+" : ""}${formatCurrency(value || 0, "INR")}`;
const InvestmentAnalyticsPanel = ({ analytics, loading, error }) => {
  const gradient = useId().replaceAll(":", "");
  if (loading) return <DashboardCard><p className="py-16 text-center text-slate-400">Loading portfolio analytics…</p></DashboardCard>;
  if (error || !analytics) return <DashboardCard><p className="py-16 text-center text-slate-400">Portfolio analytics could not be loaded.</p></DashboardCard>;
  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Total investment value", analytics.totalValue],
        ["Broker cash", analytics.brokerCash],
        ["Shares at last available prices", analytics.equityValue],
        ["Lifetime realised P&L", analytics.realizedPnl],
      ].map(([label, value]) => <DashboardCard key={label}><p className="text-sm text-slate-400">{label}</p><p className={`mt-2 text-xl font-bold ${label.includes("P&L") && value < 0 ? "text-rose-400" : "text-white"}`}>{formatCurrency(value, "INR")}</p></DashboardCard>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[28px] border border-slate-700/60 bg-gradient-to-br from-slate-950/65 to-slate-900/90 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-copper-400">PORTFOLIO COMPOSITION</p>
        <h2 className="mt-2 text-lg font-bold text-white">How your investments are distributed</h2>
        <p className="mt-1 text-xs text-slate-400">Share valuation excludes broker cash. Bars reflect the latest available prices.</p>
        {analytics.byHolding?.length ? <div className="mt-5 space-y-5">{analytics.byHolding.map((holding) => <div key={holding.id}>
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold text-white">{holding.symbol} <span className="text-xs font-normal text-slate-500">{holding.exchange} · {holding.account}</span></span><span className="font-semibold text-copper-300">{holding.percent.toFixed(1)}% · {formatCurrency(holding.value, "INR")}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-steel-800/60"><div className="h-full rounded-full bg-gradient-to-r from-[#906246] to-[#d3a280]" style={{ width: `${Math.max(0, Math.min(100, holding.percent))}%` }}/></div>
          {holding.estimated && <p className="mt-1 text-xs text-amber-300">Cost-basis estimate; no market quote available</p>}
        </div>)}</div> : <p className="py-16 text-center text-sm text-slate-400">Record a BUY to see portfolio allocation.</p>}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-700/60 pt-4 text-sm text-slate-300">
          <span>Equities {analytics.equityPercent.toFixed(1)}%</span><span>Cash {analytics.cashPercent.toFixed(1)}%</span><span>Largest position {analytics.topHoldingPercent.toFixed(1)}%</span>
        </div>
        {analytics.quoteFallbackCount > 0 && <p className="mt-2 text-xs text-amber-300">{analytics.quoteFallbackCount} holding(s) use cost-basis estimates. Total value is indicative.</p>}
      </div>
      <div className="space-y-5">
        <DashboardCard><h3 className="text-lg font-bold text-white">Exchange allocation</h3>
          {analytics.byExchange?.length ? <div className="mt-4 space-y-3">{analytics.byExchange.map((exchange) => <div key={exchange.name} className="flex items-center justify-between border-b border-slate-700/60 pb-2 text-sm"><span className="text-slate-300">{exchange.name}</span><span className="font-semibold text-copper-300">{exchange.percent.toFixed(1)}%</span></div>)}</div> : <p className="mt-3 text-sm text-slate-400">No holdings yet.</p>}
        </DashboardCard>
        <DashboardCard><h3 className="text-lg font-bold text-white">Risk & concentration</h3><p className="mt-2 text-sm text-slate-400">Largest position: <strong className="text-white">{analytics.topHoldingPercent.toFixed(1)}%</strong></p>
          <p className="mt-2 text-sm text-slate-400">Concentration index: <strong className="text-white">{analytics.concentrationIndex.toFixed(3)}</strong></p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Concentration measures allocation, not predicted returns or investment quality. No benchmark performance is inferred.</p>
        </DashboardCard>
      </div>
    </div>
    <div className="rounded-[28px] border border-slate-700/60 bg-gradient-to-br from-slate-950/65 to-slate-900/90 p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-copper-400">REALIZED RESULTS</p><h3 className="mt-2 text-lg font-bold text-white">Monthly realised P&L</h3>
      {analytics.realizedTimeline?.length ? <div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={analytics.realizedTimeline} margin={{ top: 8, right: 12, bottom: 4, left: -10 }}>
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c18b64" stopOpacity={0.2}/><stop offset="100%" stopColor="#c18b64" stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid stroke="#667786" strokeOpacity={0.14} vertical={false} strokeDasharray="2 8"/>
        <XAxis dataKey="month" tick={{ fill: "#8996a5", fontSize: 11 }} tickFormatter={(value) => value.slice(5) + "/" + value.slice(2, 4)} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fill: "#8996a5", fontSize: 11 }} tickFormatter={(value) => `${Math.round(value)}`} width={64} axisLine={false} tickLine={false}/>
        <ReferenceLine y={0} stroke="#718494" strokeOpacity={0.5}/>
        <Tooltip cursor={{ stroke: "#b77c55", strokeDasharray: "3 4" }} content={({ active, payload }) => active && payload?.[0] ? <div className="rounded-xl border border-copper-500/25 bg-slate-950/95 px-3 py-2 text-xs text-white">{payload[0].payload.month} · {valueText(payload[0].payload.value)}</div> : null}/>
        <Area dataKey="value" type="monotone" fill={`url(#${gradient})`} stroke="none"/>
        <Line dataKey="value" type="monotone" stroke="#c58a62" strokeWidth={2.5} dot={{ r: 3, fill: "#c58a62", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#d9a57e" }}/>
      </ComposedChart></ResponsiveContainer></div> : <p className="py-10 text-sm text-slate-400">No recorded sales yet.</p>}
      <p className="mt-2 text-xs text-slate-500">Historical portfolio valuations are not available from current holdings alone; FinTrack does not fabricate a past equity curve.</p>
    </div>
  </div>;
};
export default InvestmentAnalyticsPanel;
