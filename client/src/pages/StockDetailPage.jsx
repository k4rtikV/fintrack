import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Newspaper,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import InvestmentRibbonChart from "../components/investments/InvestmentRibbonChart";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import {
  getMarketStatus,
  getStockHistory,
  getStockNews,
  getStockOverview,
  getStockResearch,
} from "../services/investmentService";
import getApiError from "../utils/getApiError";
import { formatCurrency } from "../utils/formatters";
import { getQuotePresentation } from "../utils/quotePresentation";

const periods = ["1D", "5D", "1M", "3M", "6M", "1Y", "MAX"];
const financialTabs = [
  { id: "income", label: "Income statement" },
  { id: "balance", label: "Balance sheet" },
  { id: "cashflow", label: "Cash flow" },
];

const asText = (value) => (value == null || value === "" ? "—" : String(value));
const humanize = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
};
const formatResearchNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "—";
};

const FinancialRows = ({ tab, research }) => {
  if (tab === "income") {
    const rows = research?.incomeStatement?.income_statement || [];
    if (!rows.length) {
      return <p className="text-sm text-slate-400">Income-statement data is unavailable for this company.</p>;
    }
    return (
      <div className="grid gap-x-6 gap-y-0 md:grid-cols-2">
        {rows.slice(0, 16).map((section) => {
          const latest = section.history?.[0];
          return (
            <div key={section.category} className="flex items-center justify-between gap-4 border-b border-slate-700/55 py-3 text-sm">
              <span className="text-slate-400">{humanize(section.category)}</span>
              <span className="text-right font-semibold text-white">
                {formatResearchNumber(latest?.value)}
                {latest?.period && <span className="ml-2 text-[11px] font-normal text-slate-500">{latest.period}</span>}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (tab === "balance") {
    const latest = research?.balanceSheet?.history?.[0];
    if (!latest) {
      return <p className="text-sm text-slate-400">Balance-sheet data is unavailable for this company.</p>;
    }
    const rows = Object.entries(latest)
      .filter(([key, value]) => key !== "period" && key !== "year" && Number.isFinite(Number(value)))
      .slice(0, 16);
    return (
      <div>
        {latest.period && <p className="mb-2 text-xs text-slate-500">Latest reported period · {latest.period}</p>}
        <div className="grid gap-x-6 gap-y-0 md:grid-cols-2">
          {rows.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-4 border-b border-slate-700/55 py-3 text-sm">
              <span className="text-slate-400">{humanize(key)}</span>
              <span className="font-semibold text-white">{formatResearchNumber(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rows = research?.cashFlow?.cash_flow || [];
  if (!rows.length) {
    return <p className="text-sm text-slate-400">Cash-flow data is unavailable for this company.</p>;
  }
  return (
    <div className="grid gap-x-6 gap-y-0 md:grid-cols-2">
      {rows.slice(0, 16).map((flow) => {
        const latest = flow.history?.[0];
        return (
          <div key={flow.category} className="flex items-center justify-between gap-4 border-b border-slate-700/55 py-3 text-sm">
            <span className="text-slate-400">{humanize(flow.category)}</span>
            <span className="text-right font-semibold text-white">
              {formatResearchNumber(latest?.value)}
              {latest?.period && <span className="ml-2 text-[11px] font-normal text-slate-500">{latest.period}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const StockDetailPage = () => {
  const { instrumentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("1M");
  const [refreshing, setRefreshing] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [ratiosExpanded, setRatiosExpanded] = useState(false);
  const [financialTab, setFinancialTab] = useState("income");

  const overview = useQuery({
    queryKey: ["stock-overview", instrumentId],
    queryFn: () => getStockOverview(instrumentId),
    refetchInterval: 30000,
  });
  const history = useQuery({
    queryKey: ["stock-history", instrumentId, period],
    queryFn: () => getStockHistory(instrumentId, period),
    staleTime: 60000,
  });
  const research = useQuery({
    queryKey: ["stock-research", instrumentId],
    queryFn: () => getStockResearch(instrumentId),
    staleTime: 3600000,
    retry: false,
  });
  const news = useQuery({
    queryKey: ["stock-news", instrumentId],
    queryFn: () => getStockNews(instrumentId),
    staleTime: 600000,
    retry: false,
  });
  const market = useQuery({
    queryKey: ["investment-market-status"],
    queryFn: getMarketStatus,
    staleTime: 60000,
  });

  const instrument = overview.data?.instrument;
  const quote = overview.data?.quote;
  const status = getQuotePresentation(
    quote,
    market.data?.exchangeStatus?.[instrument?.exchange],
  );
  const links = overview.data?.research || {};
  const ratios = research.data?.ratios || [];
  const visibleRatios = ratiosExpanded ? ratios : ratios.slice(0, 8);
  const companyProfile = research.data?.profile?.company_profile;
  const shareholding = research.data?.shareholding || [];
  const corporateActions = research.data?.corporateActions || [];
  const dailyChange = Number(quote?.change);
  const dailyChangePercent = Number(quote?.changePercent);

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

  return (
    <PageContainer
      title={instrument ? `${instrument.tradingSymbol} · ${instrument.exchange}` : "Stock research"}
      description={instrument?.name || "NSE/BSE instrument analysis using read-only market data"}
      action={
        <Button
          variant="secondary"
          onClick={() => navigate("/investments", { state: { tab: "market" } })}
        >
          <ArrowLeft size={16} />
          Investments
        </Button>
      }
    >
      {overview.isError && (
        <p className="rounded-xl border border-rose-500/25 p-4 text-rose-400">
          {getApiError(overview.error, "Unable to load instrument")}
        </p>
      )}

      {instrument && (
        <div className="space-y-5">
          <DashboardCard>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-copper-300">
                  <span>{instrument.exchange}</span>
                  <span className="text-slate-600">·</span>
                  <span>{status.label}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-3xl font-bold text-white sm:text-4xl">
                    {quote?.lastPrice != null ? formatCurrency(quote.lastPrice, "INR") : "—"}
                  </p>
                  {Number.isFinite(dailyChangePercent) && (
                    <p className={`text-sm font-bold ${dailyChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {dailyChange >= 0 ? "+" : ""}{formatCurrency(dailyChange, "INR")} · {dailyChangePercent >= 0 ? "+" : ""}{dailyChangePercent.toFixed(2)}%
                    </p>
                  )}
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">
                  {instrument.name} · ISIN {instrument.isin}
                  {status.time ? ` · ${status.time}` : ""}
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-3 gap-2 sm:min-w-[440px]">
                {[
                  ["Previous close", quote?.previousClose],
                  ["52W high", quote?.yearHigh],
                  ["52W low", quote?.yearLow],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {value != null ? formatCurrency(value, "INR") : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 border-t border-slate-700/60 pt-3 text-[11px] leading-5 text-slate-500">
              Upstox read-only market data · informational market snapshot, not an execution quote or brokerage-account sync.
            </p>
          </DashboardCard>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">Price history</h2>
                <p className="mt-1 text-xs text-slate-500">Same copper-ribbon interaction language used across FinTrack charts.</p>
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl border border-slate-700 bg-slate-900/70 p-1" aria-label="Chart range">
                {periods.map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setPeriod(value)}
                    aria-pressed={period === value}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${period === value ? "bg-copper-500/20 text-copper-300" : "text-slate-400 hover:text-white"}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            {history.isLoading ? (
              <DashboardCard><p className="py-28 text-center text-slate-400">Loading candles…</p></DashboardCard>
            ) : history.isError ? (
              <DashboardCard><p className="py-12 text-center text-slate-400">{getApiError(history.error, "Historical data unavailable")}</p></DashboardCard>
            ) : (
              <InvestmentRibbonChart candles={history.data?.candles} period={period} />
            )}
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <DashboardCard>
              <h2 className="text-lg font-bold text-white">Company overview</h2>
              {research.isLoading ? (
                <p className="mt-4 text-sm text-slate-400">Loading company research…</p>
              ) : research.isError ? (
                <p className="mt-4 text-sm text-slate-400">{getApiError(research.error, "Company research unavailable")}</p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                    {research.data?.profile?.sector && <span className="rounded-full border border-slate-700 px-2.5 py-1">{asText(research.data.profile.sector)}</span>}
                    {research.data?.profile?.industry && <span className="rounded-full border border-slate-700 px-2.5 py-1">{asText(research.data.profile.industry)}</span>}
                  </div>
                  <p className={`mt-4 text-sm leading-6 text-slate-300 ${profileExpanded ? "" : "line-clamp-5"}`}>
                    {asText(companyProfile)}
                  </p>
                  {companyProfile && String(companyProfile).length > 380 && (
                    <button
                      type="button"
                      onClick={() => setProfileExpanded((current) => !current)}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-copper-300 hover:text-copper-200"
                    >
                      {profileExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {profileExpanded ? "Show less" : "Read full company profile"}
                    </button>
                  )}
                </>
              )}
            </DashboardCard>

            <DashboardCard>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-white">Key ratios</h2>
                <span className="text-[11px] text-slate-500">Company / sector</span>
              </div>
              {research.isLoading ? (
                <p className="mt-4 text-sm text-slate-400">Loading ratios…</p>
              ) : visibleRatios.length ? (
                <>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleRatios.map((ratio) => (
                      <div key={ratio.name} className="rounded-xl border border-slate-700/60 bg-slate-950/25 p-3 text-sm">
                        <p className="text-xs text-slate-400">{ratio.name}</p>
                        <p className="mt-1 font-bold text-white">
                          {asText(ratio.company_value)} <span className="font-normal text-slate-500">/ {asText(ratio.sector_value)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                  {ratios.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setRatiosExpanded((current) => !current)}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-copper-300 hover:text-copper-200"
                    >
                      {ratiosExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {ratiosExpanded ? "Show fewer ratios" : `Show all ${ratios.length} ratios`}
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Ratios are unavailable for this company.</p>
              )}
            </DashboardCard>
          </div>

          <DashboardCard>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Financial statements</h2>
                <p className="mt-1 text-xs text-slate-500">Latest consolidated company figures · ₹ crore where supplied by Upstox.</p>
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl border border-slate-700 bg-slate-950/45 p-1">
                {financialTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFinancialTab(tab.id)}
                    aria-pressed={financialTab === tab.id}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${financialTab === tab.id ? "bg-copper-500/20 text-copper-300" : "text-slate-400 hover:text-white"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              {research.isLoading ? (
                <p className="text-sm text-slate-400">Loading financial statements…</p>
              ) : (
                <FinancialRows tab={financialTab} research={research.data} />
              )}
            </div>
          </DashboardCard>

          <div className="grid items-start gap-5 xl:grid-cols-2">
            <DashboardCard>
              <h2 className="text-lg font-bold text-white">Shareholding pattern</h2>
              <p className="mt-1 text-xs text-slate-500">Latest quarter available from company fundamentals.</p>
              {shareholding.length ? (
                <div className="mt-4 space-y-3">
                  {shareholding.map((item) => {
                    const latest = item.history?.[0];
                    const value = Number(latest?.value);
                    const width = Number.isFinite(value) ? Math.max(0, Math.min(value, 100)) : 0;
                    return (
                      <div key={item.category}>
                        <div className="flex justify-between gap-2 text-xs">
                          <span className="text-slate-300">{humanize(item.category)}</span>
                          <span className="text-copper-300">
                            {Number.isFinite(value) ? `${value.toFixed(2)}%` : "—"} {latest?.period || ""}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-steel-800/60">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#906246] to-[#d3a280]" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Shareholding data is unavailable for this company.</p>
              )}
            </DashboardCard>

            <DashboardCard>
              <div className="flex items-center gap-2">
                <Newspaper size={18} className="text-copper-400" />
                <h2 className="text-lg font-bold text-white">Recent news</h2>
              </div>
              {news.isLoading ? (
                <p className="mt-4 text-sm text-slate-400">Loading news…</p>
              ) : news.isError ? (
                <p className="mt-4 text-sm text-slate-400">{getApiError(news.error, "News unavailable")}</p>
              ) : news.data?.items?.length ? (
                <div className="mt-4 divide-y divide-slate-700/60">
                  {news.data.items.slice(0, 6).map((article, index) => (
                    <a
                      key={`${article.link}-${index}`}
                      href={article.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block py-3 first:pt-0 last:pb-0"
                    >
                      <span className="inline-flex gap-2 text-sm font-semibold leading-5 text-white hover:text-copper-200">
                        {article.heading}
                        <ExternalLink size={13} className="mt-1 shrink-0" />
                      </span>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{article.summary}</p>
                      <p className="mt-1 text-[11px] text-copper-300">{formatDate(article.publishedAt)}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No news from the last seven days.</p>
              )}
            </DashboardCard>
          </div>

          <DashboardCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Corporate actions & external research</h2>
                <p className="mt-1 text-xs text-slate-500">Company events plus direct external research shortcuts.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {links.tradingView && (
                  <a href={links.tradingView} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-copper-500/50">
                    TradingView <ExternalLink size={13} />
                  </a>
                )}
                {links.moneycontrol && (
                  <a href={links.moneycontrol} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-copper-500/50">
                    {links.moneycontrolDirect ? "Moneycontrol" : "Find on Moneycontrol"} <ExternalLink size={13} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={refreshQuotesAndChart}
                  disabled={refreshing}
                  aria-busy={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-copper-500/50 disabled:opacity-60"
                >
                  <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Refreshing…" : "Refresh quotes/chart"}
                </button>
              </div>
            </div>

            {corporateActions.length ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {corporateActions.slice(0, 9).map((event, index) => (
                  <div key={`${event.name}-${index}`} className="rounded-xl border border-slate-700/60 bg-slate-950/25 p-3 text-sm">
                    <p className="font-semibold text-white">{event.name}{event.ratio ? ` · ${event.ratio}` : ""}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {event.expiry_date || "Date not specified"}{event.amount != null ? ` · ₹${event.amount}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No reported corporate actions for this instrument.</p>
            )}

            {research.data?.unavailable?.length > 0 && (
              <p className="mt-4 text-xs text-slate-500">
                Some company data is currently unavailable: {research.data.unavailable.join(", ")}.
              </p>
            )}
          </DashboardCard>
        </div>
      )}
    </PageContainer>
  );
};

export default StockDetailPage;
