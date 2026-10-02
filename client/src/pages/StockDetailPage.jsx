import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import InvestmentRibbonChart from "../components/investments/InvestmentRibbonChart";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import { formatCurrency } from "../utils/formatters";
import { getQuotePresentation } from "../utils/quotePresentation";
import getApiError from "../utils/getApiError";
import { getStockOverview, getStockHistory, getStockResearch, getStockNews, getMarketStatus } from "../services/investmentService";

const periods = ["1D", "5D", "1M", "3M", "6M", "1Y", "MAX"];
const asText = (value) => value == null || value === "" ? "—" : String(value);
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }) : "—";
};
const StockDetailPage = () => {
  const { instrumentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("1M");
  const [refreshing, setRefreshing] = useState(false);
  const overview = useQuery({ queryKey: ["stock-overview", instrumentId], queryFn: () => getStockOverview(instrumentId), refetchInterval: 30000 });
  const history = useQuery({ queryKey: ["stock-history", instrumentId, period], queryFn: () => getStockHistory(instrumentId, period), staleTime: 60000 });
  const research = useQuery({ queryKey: ["stock-research", instrumentId], queryFn: () => getStockResearch(instrumentId), staleTime: 3600000, retry: false });
  const news = useQuery({ queryKey: ["stock-news", instrumentId], queryFn: () => getStockNews(instrumentId), staleTime: 600000, retry: false });
  const market = useQuery({ queryKey: ["investment-market-status"], queryFn: getMarketStatus, staleTime: 60000 });
  const instrument = overview.data?.instrument;
  const quote = overview.data?.quote;
  const status = getQuotePresentation(quote, market.data?.exchangeStatus?.[instrument?.exchange]);
  const links = overview.data?.research || {};
  const refreshQuotesAndChart = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const results = await Promise.allSettled([
        getStockOverview(instrumentId, { forceRefresh: true }),
        getStockHistory(instrumentId, period, { forceRefresh: true }),
      ]);
      if (results[0].status === "fulfilled") {
        queryClient.setQueryData(["stock-overview", instrumentId], results[0].value);
        if (results[0].value.market?.warning) toast(results[0].value.market.warning);
      }
      if (results[1].status === "fulfilled") {
        queryClient.setQueryData(["stock-history", instrumentId, period], results[1].value);
      }
      const failures = results.filter((item) => item.status === "rejected");
      if (failures.length) {
        toast.error(getApiError(failures[0].reason, "Some market data could not be refreshed"));
      } else if (!results[0].value.market?.warning) {
        toast.success("Quote and chart checked with Upstox");
      }
    } catch (error) {
      toast.error(getApiError(error, "Unable to refresh quote and chart"));
    } finally {
      setRefreshing(false);
    }
  };
  return <PageContainer title={instrument ? `${instrument.tradingSymbol} · ${instrument.exchange}` : "Stock research"}
    description={instrument?.name || "NSE/BSE instrument analysis using read-only market data"}
    action={<Button variant="secondary" onClick={() => navigate("/investments", { state: { tab: "market" } })}><ArrowLeft size={16}/> Investments</Button>}>
    {overview.isError && <p className="rounded-xl border border-rose-500/25 p-4 text-rose-400">{getApiError(overview.error, "Unable to load instrument")}</p>}
    {instrument && <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Last available price", quote?.lastPrice != null ? formatCurrency(quote.lastPrice, "INR") : "—"],
          ["Previous close", quote?.previousClose != null ? formatCurrency(quote.previousClose, "INR") : "—"],
          ["52-week high", quote?.yearHigh != null ? formatCurrency(quote.yearHigh, "INR") : "—"],
          ["52-week low", quote?.yearLow != null ? formatCurrency(quote.yearLow, "INR") : "—"],
        ].map(([label, value]) => <DashboardCard key={label}><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-xl font-bold text-white">{value}</p></DashboardCard>)}
      </div>
      <p className="text-xs text-slate-400">{status.label}{status.time ? ` · ${status.time}` : ""} · ISIN {instrument.isin} · Upstox market data, not an execution quote</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">Price history</h2>
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-700 bg-slate-900/70 p-1" aria-label="Chart range">
          {periods.map((value) => <button type="button" key={value} onClick={() => setPeriod(value)} aria-pressed={period === value}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${period === value ? "bg-copper-500/20 text-copper-300" : "text-slate-400 hover:text-white"}`}>{value}</button>)}
        </div>
      </div>
      {history.isLoading ? <DashboardCard><p className="py-28 text-center text-slate-400">Loading candles…</p></DashboardCard>
        : history.isError ? <DashboardCard><p className="py-12 text-center text-slate-400">{getApiError(history.error, "Historical data unavailable")}</p></DashboardCard>
          : <InvestmentRibbonChart candles={history.data?.candles} period={period} />}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard><h2 className="mb-3 text-lg font-bold text-white">Company & fundamentals</h2>
          {research.isLoading ? <p className="text-sm text-slate-400">Loading company research…</p> : research.isError ? <p className="text-sm text-slate-400">{getApiError(research.error, "Company research unavailable")}</p> : <>
            <p className="text-sm leading-relaxed text-slate-300">{asText(research.data?.profile?.company_profile)}</p>
            {research.data?.profile?.sector && <p className="mt-2 text-xs text-slate-400">Sector: {asText(research.data.profile.sector)}</p>}
            <h3 className="mb-2 mt-5 text-sm font-bold text-copper-300">Key ratios · company / sector</h3>
            {research.data?.ratios?.length ? <div className="grid gap-2 sm:grid-cols-2">{research.data.ratios.map((ratio) => <div key={ratio.name} className="rounded-xl border border-slate-700/60 p-3 text-sm"><p className="text-slate-400">{ratio.name}</p><p className="mt-1 font-bold text-white">{asText(ratio.company_value)} <span className="font-normal text-slate-500">/ {asText(ratio.sector_value)}</span></p></div>)}</div> : <p className="text-xs text-slate-400">Ratios not available for this company.</p>}
            {research.data?.incomeStatement?.income_statement?.length > 0 && <><h3 className="mb-2 mt-5 text-sm font-bold text-copper-300">Financial performance · ₹ crore</h3><div className="space-y-2">{research.data.incomeStatement.income_statement.map((section) => <div className="flex justify-between gap-3 border-b border-slate-700/50 pb-2 text-sm" key={section.category}><span className="capitalize text-slate-400">{section.category.replaceAll("_", " ")}</span><span className="text-right text-white">{section.history?.[0]?.value?.toLocaleString("en-IN") ?? "—"}<span className="ml-2 text-xs text-slate-400">{section.history?.[0]?.period || ""}</span></span></div>)}</div></>}
            {research.data?.balanceSheet?.history?.length > 0 && <><h3 className="mb-2 mt-5 text-sm font-bold text-copper-300">Balance sheet · ₹ crore</h3>
              <div className="grid gap-2 sm:grid-cols-2">{[["Total assets", research.data.balanceSheet.history[0].total_asset], ["Total liabilities", research.data.balanceSheet.history[0].total_liability]].map(([name, value]) => <div key={name} className="rounded-xl border border-slate-700/60 p-3 text-sm"><p className="text-slate-400">{name}</p><p className="mt-1 font-bold text-white">{value == null ? "—" : Number(value).toLocaleString("en-IN")}</p><p className="text-xs text-slate-500">{research.data.balanceSheet.history[0].period || ""}</p></div>)}</div></>}
            {research.data?.cashFlow?.cash_flow?.length > 0 && <><h3 className="mb-2 mt-5 text-sm font-bold text-copper-300">Company cash flow · ₹ crore</h3>
              <div className="space-y-2">{research.data.cashFlow.cash_flow.map((flow) => <div key={flow.category} className="flex justify-between gap-3 border-b border-slate-700/50 pb-2 text-sm"><span className="capitalize text-slate-400">{flow.category}</span><span className="text-right text-white">{flow.history?.[0]?.value?.toLocaleString("en-IN") ?? "—"}<span className="ml-2 text-xs text-slate-400">{flow.history?.[0]?.period || ""}</span></span></div>)}</div></>}
            {research.data?.shareholding?.length > 0 && <><h3 className="mb-2 mt-5 text-sm font-bold text-copper-300">Shareholding pattern · latest quarter</h3><div className="space-y-3">{research.data.shareholding.map((item) => {
              const latest = item.history?.[0];
              const value = Number(latest?.value);
              return <div key={item.category}><div className="flex justify-between gap-2 text-xs"><span className="capitalize text-slate-300">{String(item.category || "").replaceAll("_", " ")}</span><span className="text-copper-300">{Number.isFinite(value) ? `${value.toFixed(2)}%` : "—"} {latest?.period || ""}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-steel-800/60"><div className="h-full rounded-full bg-gradient-to-r from-[#906246] to-[#d3a280]" style={{ width: `${Number.isFinite(value) ? Math.max(0, Math.min(value, 100)) : 0}%` }}/></div></div>;
            })}</div></>}
            {research.data?.unavailable?.length > 0 && <p className="mt-3 text-xs text-slate-500">Some company data is unavailable: {research.data.unavailable.join(", ")}.</p>}
          </>}
        </DashboardCard>
        <div className="space-y-5">
          <DashboardCard><div className="flex items-center gap-2"><Newspaper size={18} className="text-copper-400"/><h2 className="text-lg font-bold text-white">Recent news</h2></div>
            {news.isLoading ? <p className="mt-4 text-sm text-slate-400">Loading news…</p> : news.isError ? <p className="mt-4 text-sm text-slate-400">{getApiError(news.error, "News unavailable")}</p> : news.data?.items?.length ? <div className="mt-4 space-y-3">{news.data.items.map((article, index) => <a key={`${article.link}-${index}`} href={article.link} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-700/70 p-3 transition hover:border-copper-500/50"><span className="inline-flex gap-2 text-sm font-semibold text-white">{article.heading} <ExternalLink size={13} className="shrink-0"/></span><p className="mt-1 text-xs text-slate-400">{article.summary}</p><p className="mt-1 text-[11px] text-copper-300">{formatDate(article.publishedAt)}</p></a>)}</div> : <p className="mt-4 text-sm text-slate-400">No news from the last seven days.</p>}
          </DashboardCard>
          <DashboardCard><h2 className="mb-3 text-lg font-bold text-white">Corporate actions</h2>
            {research.data?.corporateActions?.length ? <div className="space-y-2">{research.data.corporateActions.slice(0, 8).map((event, i) => <div className="border-b border-slate-700/60 pb-2 text-sm" key={`${event.name}-${i}`}><p className="font-semibold text-white">{event.name}{event.ratio ? ` · ${event.ratio}` : ""}</p><p className="text-xs text-slate-400">{event.expiry_date || "Date not specified"}{event.amount != null ? ` · ₹${event.amount}` : ""}</p></div>)}</div> : <p className="text-sm text-slate-400">No reported corporate actions.</p>}
          </DashboardCard>
          <div className="flex flex-wrap gap-2"><a href={links.tradingView} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">TradingView <ExternalLink size={14}/></a><a href={links.moneycontrol} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">{links.moneycontrolDirect ? "Moneycontrol" : "Find on Moneycontrol"} <ExternalLink size={14}/></a><button type="button" onClick={refreshQuotesAndChart} disabled={refreshing} aria-busy={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-60"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""}/>{refreshing ? "Refreshing…" : "Refresh quotes/chart"}</button></div>
        </div>
      </div>
    </div>}
  </PageContainer>;
};
export default StockDetailPage;
