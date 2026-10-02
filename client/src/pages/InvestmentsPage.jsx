import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  CalendarDays,
  PieChart,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  LineChart,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AccountModal from "../components/accounts/AccountModal";
import InvestmentHoldingCard from "../components/investments/InvestmentHoldingCard";
import InvestmentAnalyticsPanel from "../components/investments/InvestmentAnalyticsPanel";
import InvestmentCalendar from "../components/investments/InvestmentCalendar";
import InvestmentTradeModal from "../components/investments/InvestmentTradeModal";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Loader from "../components/ui/Loader";
import { createAccount } from "../services/accountService";
import {
  addWatchlistItem,
  createInvestmentTrade,
  getInstrumentQuote,
  getPortfolioAnalytics, getInvestmentCalendar,
  getInvestmentAccounts,
  getInvestmentTrades,
  getMarketStatus,
  getPortfolio,
  getWatchlist,
  removeWatchlistItem,
  searchInstruments,
} from "../services/investmentService";
import { formatCurrency, formatDate } from "../utils/formatters";
import { getQuotePresentation } from "../utils/quotePresentation";
import getApiError from "../utils/getApiError";

const tabs = [
  ["portfolio", BarChart3, "Portfolio"],
  ["market", Search, "Market"],
  ["watchlist", Eye, "Watchlist"],
  ["activity", Activity, "Activity"],
  ["insights", PieChart, "Insights"],
  ["calendar", CalendarDays, "Calendar"],
];

const pct = (value) => `${Number(value || 0) >= 0 ? "+" : ""}${Number(value || 0).toFixed(2)}%`;

const InvestmentsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(() => tabs.some(([value]) => value === location.state?.tab) ? location.state.tab : "portfolio");
  const [searchText, setSearchText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountActions, setAccountActions] = useState(null);
  const [tradeState, setTradeState] = useState(null);
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [calendarRefreshing, setCalendarRefreshing] = useState(false);
  const tradeRequest = useRef(0);

  const marketStatusQuery = useQuery({ queryKey: ["investment-market-status"], queryFn: getMarketStatus, refetchInterval: 60000 });
  const isMarketOpen = Object.values(marketStatusQuery.data?.exchangeStatus || {}).includes("OPEN");
  const accountsQuery = useQuery({ queryKey: ["investment-accounts"], queryFn: getInvestmentAccounts });
  const portfolioQuery = useQuery({
    queryKey: ["investment-portfolio"],
    queryFn: getPortfolio,
    refetchInterval: marketStatusQuery.data?.configured && isMarketOpen ? 15000 : false,
  });
  const watchlistQuery = useQuery({
    queryKey: ["investment-watchlist"],
    queryFn: getWatchlist,
    refetchInterval: tab === "watchlist" && marketStatusQuery.data?.configured && isMarketOpen ? 15000 : false,
  });
  const tradesQuery = useQuery({
    queryKey: ["investment-trades"],
    queryFn: () => getInvestmentTrades(50),
    enabled: tab === "activity",
  });
  const analyticsQuery = useQuery({
    queryKey: ["investment-analytics"], queryFn: getPortfolioAnalytics,
    enabled: tab === "insights", refetchInterval: tab === "insights" && marketStatusQuery.data?.configured && isMarketOpen ? 60000 : false,
  });
  const calendarQuery = useQuery({
    queryKey: ["investment-calendar"], queryFn: getInvestmentCalendar,
    enabled: tab === "calendar", staleTime: 60 * 60 * 1000, retry: false,
  });
  const refreshCalendar = async () => {
    if (calendarRefreshing) return;
    setCalendarRefreshing(true);
    try {
      const data = await getInvestmentCalendar({ forceRefresh: true });
      queryClient.setQueryData(["investment-calendar"], data);
      if (data.warning) toast("Calendar checked. Some Upstox data is currently unavailable.");
      else toast.success("Calendar refreshed from Upstox");
    } catch (error) {
      toast.error(getApiError(error, "Unable to refresh the calendar"));
    } finally {
      setCalendarRefreshing(false);
    }
  };
  const searchQuery = useQuery({
    queryKey: ["investment-search", searchTerm],
    queryFn: () => searchInstruments({ query: searchTerm }),
    enabled: Boolean(marketStatusQuery.data?.configured && searchTerm.length >= 2),
    retry: false,
  });

  const accounts = accountsQuery.data || [];
  const portfolio = portfolioQuery.data;
  const watchlist = watchlistQuery.data?.items || [];
  const watchlistedInstrumentIds = useMemo(
    () => new Set(watchlist.map((item) => String(item.instrument?._id))),
    [watchlist],
  );

  const refreshInvestmentData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["investment-portfolio"] }),
      queryClient.invalidateQueries({ queryKey: ["investment-analytics"] }),
      queryClient.invalidateQueries({ queryKey: ["investment-calendar"] }),
      queryClient.invalidateQueries({ queryKey: ["investment-trades"] }),
      queryClient.invalidateQueries({ queryKey: ["investment-accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["investment-watchlist"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
    ]);
  };

  const createAccountMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: async (response) => {
      toast.success(response.message || "Investment account created");
      setIsAccountModalOpen(false);
      await refreshInvestmentData();
    },
    onError: (error) => toast.error(getApiError(error, "Unable to create investment account")),
  });

  const tradeMutation = useMutation({
    mutationFn: createInvestmentTrade,
    onSuccess: async (response) => {
      toast.success(response.message || "Investment trade recorded");
      setTradeState(null);
      setSuggestedPrice("");
      await refreshInvestmentData();
    },
    onError: (error) => toast.error(getApiError(error, "Unable to record investment trade")),
  });

  const addWatchlistMutation = useMutation({
    mutationFn: addWatchlistItem,
    onSuccess: async () => {
      toast.success("Added to watchlist");
      await queryClient.invalidateQueries({ queryKey: ["investment-watchlist"] });
    },
    onError: (error) => toast.error(getApiError(error, "Unable to update watchlist")),
  });

  const removeWatchlistMutation = useMutation({
    mutationFn: removeWatchlistItem,
    onSuccess: async () => {
      toast.success("Removed from watchlist");
      await queryClient.invalidateQueries({ queryKey: ["investment-watchlist"] });
    },
    onError: (error) => toast.error(getApiError(error, "Unable to update watchlist")),
  });

  const openTrade = async ({ instrument, holding = null, type = "BUY", quote = null }) => {
    const request = ++tradeRequest.current;
    const initialQuote = quote || {
      lastPrice: instrument?.lastPrice,
      quoteUpdatedAt: instrument?.quoteUpdatedAt,
      quoteFetchedAt: instrument?.quoteFetchedAt,
      lastTradeAt: instrument?.lastTradeAt,
    };
    setSuggestedPrice(initialQuote.lastPrice || holding?.currentPrice || "");
    setTradeState({ instrument, holding, type, quote: initialQuote });

    if (marketStatusQuery.data?.configured) {
      try {
        const fresh = await getInstrumentQuote(instrument._id);
        if (request !== tradeRequest.current) return;
        if (fresh.quote?.lastPrice) {
          setSuggestedPrice(fresh.quote.lastPrice);
          setTradeState((current) => current?.instrument?._id === instrument._id ? { ...current, quote: fresh.quote } : current);
        }
      } catch {
        // Manual price entry remains available when the provider is temporarily unavailable.
      }
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const normalized = searchText.trim();
    if (normalized.length < 2) {
      toast.error("Enter at least 2 characters to search NSE/BSE shares");
      return;
    }
    setSearchTerm(normalized);
  };

  const summary = portfolio?.summary || {};
  const summaryCards = [
    ["Portfolio value", formatCurrency(summary.marketValue, "INR"), LineChart, "text-copper-500 bg-copper-500/10"],
    ["Invested", formatCurrency(summary.invested, "INR"), ArrowDownToLine, "text-steel-500 bg-steel-500/10"],
    ["Unrealised P&L", `${Number(summary.unrealizedPnl || 0) >= 0 ? "+" : ""}${formatCurrency(summary.unrealizedPnl, "INR")}`, TrendingUp, Number(summary.unrealizedPnl || 0) >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"],
    ["Return", pct(summary.returnPercent), BarChart3, Number(summary.returnPercent || 0) >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"],
  ];

  const marketConfigured = Boolean(marketStatusQuery.data?.configured);
  const marketStatusLabel = Object.entries(marketStatusQuery.data?.exchangeStatus || {})
    .map(([exchange, status]) => `${exchange} ${status}`).join(" · ") || "MARKET STATUS UNKNOWN";
  const pageLoading = accountsQuery.isLoading || portfolioQuery.isLoading || marketStatusQuery.isLoading;

  return (
    <PageContainer
      title="Investments"
      description="Track NSE/BSE holdings, live market prices, watchlists, broker cash, and portfolio P&L without mixing trades into income or expenses."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <div className="relative">
            <Button variant="secondary" onClick={() => accounts.length ? setAccountActions((current) => current === "menu" ? null : "menu") : setIsAccountModalOpen(true)} aria-expanded={accountActions === "menu"}>
              <WalletCards size={17} /> Investment account {accounts.length > 0 && <ChevronDown size={15} />}
            </Button>
            {accountActions === "menu" && accounts.length > 0 && (
              <div className="absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-steel-700 dark:bg-steel-900" role="menu" aria-label="Investment account actions">
                <button type="button" role="menuitem" onClick={() => setAccountActions("list")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-steel-800"><WalletCards size={16} /> View investment accounts</button>
                <button type="button" role="menuitem" onClick={() => { setAccountActions(null); setIsAccountModalOpen(true); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-steel-800"><Plus size={16} /> Create another account</button>
              </div>
            )}
          </div>
          <Button onClick={() => setTab("market")}>
            <Search size={17} /> Find shares
          </Button>
        </div>
      }
    >
      {pageLoading ? (
        <div className="flex min-h-72 items-center justify-center"><Loader /></div>
      ) : (
        <>
          {accountActions === "list" && (
            <DashboardCard className="mx-auto mb-5 max-w-3xl">
              <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-950 dark:text-white">Your investment accounts</h2><button type="button" onClick={() => setAccountActions(null)} className="text-xs font-semibold text-steel-600 hover:text-copper-500 dark:text-steel-300">Close</button></div>
              <div className="mt-3 space-y-2">
                {accounts.map((account) => <div key={account._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-steel-700"><div><p className="font-semibold text-slate-900 dark:text-white">{account.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">Broker cash · {formatCurrency(account.balance, account.currency)}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" className="px-3 py-2" onClick={() => navigate(`/transactions?accountId=${encodeURIComponent(account._id)}`)}><History size={15} /> History</Button><Button variant="secondary" className="px-3 py-2" onClick={() => navigate("/accounts")}>View account</Button></div></div>)}
              </div>
            </DashboardCard>
          )}
          {!marketConfigured && (
            <div className="mb-5 rounded-2xl border border-amber-300/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
              <strong>Live NSE/BSE data is not configured yet.</strong> Portfolio bookkeeping still works, but market search and live quotes require the server-side <code>UPSTOX_ANALYTICS_TOKEN</code>.
            </div>
          )}

          {portfolio?.market?.warning && (
            <div className="mb-5 rounded-2xl border border-steel-300/60 bg-steel-50/75 px-4 py-3 text-sm text-steel-800 dark:border-steel-700 dark:bg-steel-900/55 dark:text-steel-200">
              Live quotes are temporarily unavailable. FinTrack is showing the latest cached quote or average cost instead.
            </div>
          )}

          <div className="mx-auto mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 p-1.5 dark:border-slate-700 dark:bg-slate-900/80">
            {tabs.map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === value ? "bg-copper-500/15 text-copper-700 dark:text-copper-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
              >
                <Icon size={16} />{label}
              </button>
            ))}
          </div>

          {tab === "portfolio" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map(([label, value, Icon, tone]) => (
                  <DashboardCard key={label}>
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{value}</p></div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}><Icon size={19} /></div>
                    </div>
                  </DashboardCard>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">Your holdings</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Broker cash stays in the investment account; share value is tracked separately from ordinary transactions.</p>
                </div>
                <span className="text-xs font-semibold text-slate-400">{marketConfigured ? `${marketStatusLabel} · ${isMarketOpen ? "UP TO 15S REFRESH" : "LAST AVAILABLE PRICES"}` : "COST BASIS / CACHED PRICES"}</span>
              </div>

              {accounts.length === 0 ? (
                <EmptyState
                  icon={WalletCards}
                  title="Create an investment account first"
                  description="Use an INR investment account as the broker-cash container. Transfer money into it, then record buys and sells here."
                  action={<Button onClick={() => setIsAccountModalOpen(true)}><Plus size={17} />Create investment account</Button>}
                />
              ) : portfolio?.holdings?.length ? (
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {portfolio.holdings.map((holding) => (
                    <InvestmentHoldingCard
                      key={holding._id}
                      holding={holding}
                      exchangeStatus={marketStatusQuery.data?.exchangeStatus?.[holding.instrument.exchange]}
                      onDetails={(item) => navigate(`/investments/stocks/${item.instrument._id}`)}
                      onBuy={(item) => openTrade({ instrument: item.instrument, holding: item, type: "BUY", quote: item.quote })}
                      onSell={(item) => openTrade({ instrument: item.instrument, holding: item, type: "SELL", quote: item.quote })}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No holdings yet"
                  description="Search NSE/BSE shares and record your first buy. FinTrack will track FIFO lots, average cost and P&L."
                  action={<Button onClick={() => setTab("market")}><Search size={17} />Find shares</Button>}
                />
              )}
            </>
          )}

          {tab === "market" && (
            <div className="mx-auto max-w-5xl">
              <DashboardCard>
                <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search RELIANCE, TCS, HDFC BANK, ISIN..."
                      maxLength={50}
                      disabled={!marketConfigured}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-copper-400 focus:ring-2 focus:ring-copper-400/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <Button type="submit" disabled={!marketConfigured || searchQuery.isFetching}>Search NSE/BSE</Button>
                </form>
              </DashboardCard>

              {searchQuery.isFetching ? (
                <div className="flex min-h-56 items-center justify-center"><Loader /></div>
              ) : searchQuery.isError ? (
                <EmptyState icon={RefreshCw} title="Unable to search the market" description={getApiError(searchQuery.error, "Live market search is temporarily unavailable.")} />
              ) : searchQuery.data?.instruments?.length ? (
                <div className="mt-5 space-y-3">
                  {searchQuery.data.instruments.map((instrument) => {
                    const watched = watchlistedInstrumentIds.has(String(instrument._id));
                    return (
                      <div key={instrument._id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900/90">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-bold text-slate-950 dark:text-white">{instrument.tradingSymbol}</span><span className="rounded-full bg-steel-500/10 px-2 py-0.5 text-xs font-bold text-steel-600 dark:text-steel-300">{instrument.exchange}</span></div>
                          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{instrument.shortName || instrument.name}</p>
                          <p className="mt-1 text-xs text-slate-400">ISIN {instrument.isin}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => navigate(`/investments/stocks/${instrument._id}`)}><LineChart size={16} />Details</Button>
                          <Button variant="secondary" disabled={watched || addWatchlistMutation.isPending} onClick={() => addWatchlistMutation.mutate(instrument._id)}>
                            {watched ? <Eye size={16} /> : <Plus size={16} />}{watched ? "Watching" : "Watch"}
                          </Button>
                          <Button disabled={accounts.length === 0} onClick={() => openTrade({ instrument, type: "BUY" })}><ArrowDownToLine size={16} />Buy</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchTerm ? (
                <EmptyState icon={Search} title="No matching NSE/BSE shares" description="Try the trading symbol, company name, or ISIN." />
              ) : (
                <EmptyState icon={Search} title="Search Indian equities" description="FinTrack searches NSE and BSE equity instruments only. Derivatives and order placement are intentionally outside this module." />
              )}
            </div>
          )}

          {tab === "watchlist" && (
            watchlistQuery.isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader /></div> : watchlist.length ? (
              <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
                {watchlist.map((item) => {
                  const q = item.quote || {};
                  const positive = Number(q.change || 0) >= 0;
                  return (
                    <DashboardCard key={item._id}>
                      <div className="flex items-start justify-between gap-3">
                        <div><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-slate-950 dark:text-white">{item.instrument.tradingSymbol}</h3><span className="text-xs font-bold text-steel-500">{item.instrument.exchange}</span></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.instrument.shortName || item.instrument.name}</p></div>
                        <button type="button" onClick={() => removeWatchlistMutation.mutate(item._id)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800" aria-label={`Remove ${item.instrument.tradingSymbol} from watchlist`}><EyeOff size={18} /></button>
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-4">
                        <div><p className="text-xs uppercase tracking-[0.12em] text-slate-400">Last price</p><p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{q.lastPrice != null ? formatCurrency(q.lastPrice, "INR") : "—"}</p><p className="mt-1 text-xs text-slate-400">{(() => { const state = getQuotePresentation(q, marketStatusQuery.data?.exchangeStatus?.[item.instrument.exchange]); return `${state.label}${state.time ? ` · ${state.time}` : ""}`; })()}</p></div>
                        <div className={`text-right text-sm font-bold ${positive ? "text-emerald-500" : "text-rose-500"}`}>{q.change != null ? `${q.change >= 0 ? "+" : ""}${formatCurrency(q.change, "INR")} (${pct(q.changePercent)})` : "No live quote"}</div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button className="px-3 py-2" disabled={accounts.length === 0} onClick={() => openTrade({ instrument: item.instrument, type: "BUY", quote: q })}>Buy</Button>
                        <Button variant="secondary" className="px-3 py-2" onClick={() => navigate(`/investments/stocks/${item.instrument._id}`)}>Details <LineChart size={13}/></Button>
                        <a href={item.research?.moneycontrol} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">{item.research?.moneycontrolDirect ? "Moneycontrol" : "Find on Moneycontrol"} <ExternalLink size={13} /></a>
                      </div>
                    </DashboardCard>
                  );
                })}
              </div>
            ) : <EmptyState icon={Eye} title="Watchlist is empty" description="Search the market and add shares you want to follow without adding them to your portfolio." action={<Button onClick={() => setTab("market")}>Find shares</Button>} />
          )}

          {tab === "insights" && <InvestmentAnalyticsPanel analytics={analyticsQuery.data} loading={analyticsQuery.isLoading} error={analyticsQuery.isError} />}
          {tab === "calendar" && <InvestmentCalendar calendar={calendarQuery.data} loading={calendarQuery.isLoading || calendarQuery.isFetching && !calendarQuery.data} error={calendarQuery.error} refreshing={calendarRefreshing} onRetry={refreshCalendar} />}

          {tab === "activity" && (
            tradesQuery.isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader /></div> : tradesQuery.data?.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.1em] text-slate-400 dark:border-slate-800"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Share</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Cash</th><th className="px-5 py-3">Realised P&L</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {tradesQuery.data.map((trade) => <tr key={trade._id}><td className="px-5 py-4 text-slate-500">{formatDate(trade.tradeDate)}</td><td className="px-5 py-4"><div className="font-bold text-slate-900 dark:text-white">{trade.instrument?.tradingSymbol}</div><div className="text-xs text-slate-400">{trade.account?.name}</div></td><td className={`px-5 py-4 font-bold ${trade.type === "BUY" ? "text-copper-500" : "text-emerald-500"}`}>{trade.type}</td><td className="px-5 py-4">{trade.quantity}</td><td className="px-5 py-4">{formatCurrency(trade.price, "INR")}</td><td className={`px-5 py-4 font-semibold ${trade.netCashAmount >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatCurrency(trade.netCashAmount, "INR")}</td><td className="px-5 py-4">{trade.type === "SELL" ? formatCurrency(trade.realizedPnl, "INR") : "—"}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <EmptyState icon={Activity} title="No investment activity yet" description="Buy and sell records will appear here separately from ordinary income, expenses and transfers." />
          )}
        </>
      )}

      <AccountModal
        isOpen={isAccountModalOpen}
        isSaving={createAccountMutation.isPending}
        onClose={() => setIsAccountModalOpen(false)}
        onSubmit={(payload) => createAccountMutation.mutateAsync({ ...payload, type: "INVESTMENT", currency: "INR" })}
        defaultCurrency="INR"
        defaultType="INVESTMENT"
        fixedType
        fixedCurrency
      />

      <InvestmentTradeModal
        isOpen={Boolean(tradeState)}
        instrument={tradeState?.instrument}
        holding={tradeState?.holding}
        defaultType={tradeState?.type || "BUY"}
        accounts={accounts}
        suggestedPrice={suggestedPrice}
        quote={tradeState?.quote}
        exchangeStatus={marketStatusQuery.data?.exchangeStatus?.[tradeState?.instrument?.exchange]}
        isSaving={tradeMutation.isPending}
        onClose={() => { tradeRequest.current += 1; setTradeState(null); setSuggestedPrice(""); }}
        onSubmit={(payload) => tradeMutation.mutateAsync(payload)}
      />
    </PageContainer>
  );
};

export default InvestmentsPage;
