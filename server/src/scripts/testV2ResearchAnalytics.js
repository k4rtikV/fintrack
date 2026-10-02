import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPortfolioAnalytics } from "../utils/investmentPortfolioAnalytics.js";
import { normalizeCandles } from "../utils/investmentHistory.js";
import { moneycontrolLinkForInstrument, researchLinksForInstrument } from "../utils/investmentResearchLinks.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const research = read("server/src/services/investmentResearch.service.js");
const routes = read("server/src/routes/investment.routes.js");
const analytics = read("server/src/services/investmentAnalytics.service.js");
const investment = read("server/src/services/investment.service.js");
const page = read("client/src/pages/InvestmentsPage.jsx");
const stock = read("client/src/pages/StockDetailPage.jsx");
const chart = read("client/src/components/investments/InvestmentRibbonChart.jsx");
const calendar = read("client/src/components/investments/InvestmentCalendar.jsx");
const insights = read("client/src/components/investments/InvestmentAnalyticsPanel.jsx");
const clientService = read("client/src/services/investmentService.js");
const app = read("client/src/App.jsx");
assert(research.includes("const numeric =") && research.includes("amount: numeric(item.amount)"), "Corporate-action amounts must have a defined normalizer (calendar ReferenceError regression)");
assert(research.includes('"MAX"') && research.includes('from: "2000-01-01"') && read("server/src/validators/investment.validator.js").includes('"MAX"') && stock.includes('"MAX"'), "All-time monthly candles must be accepted by server and client");
assert(read("client/index.html").includes('class="dark"') && !read("client/src/components/layout/Topbar.jsx").includes("ThemeToggle") && !read("client/src/pages/SettingsPage.jsx").includes('setTheme('), "Dark-only mode must remove every user-facing light control");
assert(calendar.includes("Retry calendar") && calendar.includes("getApiError") && calendar.includes("availability"), "Calendar must expose API failures and retain partial provider data");
assert(research.includes("/v3/historical-candle/") && research.includes("/v3/historical-candle/intraday/") && research.includes("getInstrumentHistory"), "Use both Historical and current-session Intraday V3 endpoints");
assert(research.includes("/v2/news") && research.includes('category: "instrument_keys"'), "News must request explicitly chosen instruments, never brokerage holdings");
assert(research.includes("/v2/fundamentals/") && research.includes("/v2/market/holidays") && research.includes("balance-sheet") && research.includes("cash-flow") && research.includes("share-holdings"), "All read-only company fundamentals and holidays must be available server-side");
assert(!research.includes('category: "holdings"') && !research.includes('category: "positions"') && !research.includes("/v2/portfolio"), "Never synchronize personal Upstox account data");
assert(research.includes("responseCache") && research.includes("Promise.allSettled"), "Bound and isolate provider research calls");
assert(research.includes("safeUrl") && research.includes('url.protocol === "https:"'), "News links must be HTTPS");
assert(research.includes("InvestmentHolding.find({ user: userId") && research.includes("InvestmentWatchlistItem.find({ user: userId"), "Calendar tracks only FinTrack-owned instruments");
assert(routes.includes("protect, requireAppUnlocked") && routes.includes("marketLimiter") && routes.includes("validate(historySchema)"), "New routes retain locked-session protection and validation");
assert(app.includes('path="/investments/stocks/:instrumentId"') && stock.includes("getStockHistory") && stock.includes("getStockResearch") && stock.includes("getStockNews"), "Stock research must be reachable");
assert(stock.includes("InvestmentRibbonChart") && chart.includes("#c58a62") && chart.includes("ChartHover"), "Investment charts must match copper ribbon style and expose hover details");
assert(page.includes('"insights"') && page.includes('"calendar"') && calendar.includes("marketHolidays"), "Analytics/calendar tabs and views must be visible");
assert(insights.includes("does not fabricate a past equity curve") && analytics.includes("getPortfolioForUser") && investment.includes("closedPnl"), "Closed realised P&L and no fake historical valuations");
assert(!clientService.includes("UPSTOX_ANALYTICS_TOKEN") && research.includes("UPSTOX_ANALYTICS_TOKEN"), "Upstox token never reaches React");
// Moneycontrol deep links are company-ID based, not NSE-symbol based.
const krnNse = { tradingSymbol: "KRN", exchange: "NSE", name: "KRN HEAT EXCHANGE N REF L", isin: "INE0Q3J01015" };
const krnBse = { ...krnNse, exchange: "BSE" };
assert.equal(moneycontrolLinkForInstrument(krnNse).url,
  "https://www.moneycontrol.com/india/stockpricequote/engineering/krnheatexchangerrefrigeration/KHERL");
assert.deepEqual(moneycontrolLinkForInstrument(krnBse), moneycontrolLinkForInstrument(krnNse), "Both listings have the same company research page");
for (const [symbol, name, suffix] of [
  ["RELIANCE", "Reliance Industries Ltd", "/refineries/relianceindustries/RI"],
  ["RPOWER", "Reliance Power Ltd", "/power-generationdistribution/reliancepower/RP"],
  ["HYUNDAI", "Hyundai Motor India Ltd", "/automobile-passenger-cars/hyundaimotorindia/HMI01"],
  ["TCS", "Tata Consultancy Services Ltd", "/computers-software/tataconsultancyservices/TCS"],
  ["INFY", "Infosys Ltd", "/computers-software/infosys/IT"],
]) {
  const link = moneycontrolLinkForInstrument({ tradingSymbol: symbol, name });
  assert(link.direct && link.url.endsWith(suffix), `${symbol} must deep-link to its verified Moneycontrol company page`);
}
const unknown = moneycontrolLinkForInstrument({ tradingSymbol: "TESTXYZ", exchange: "NSE", isin: "INE000A01011", name: "Example Unknown Industries" });
assert.equal(unknown.direct, false, "Never guess an unverified Moneycontrol ID");
assert(unknown.url.startsWith("https://www.google.com/search?q=") && decodeURIComponent(unknown.url).includes("site:moneycontrol.com/india/stockpricequote/")
  && decodeURIComponent(unknown.url).includes("Example Unknown Industries") && decodeURIComponent(unknown.url).includes("INE000A01011"),
"Unmapped companies must lead to a specific Moneycontrol-only lookup, not the generic stock directory");
assert(researchLinksForInstrument(krnNse).moneycontrolDirect && researchLinksForInstrument(krnBse).moneycontrolDirect, "Watchlist and portfolio must receive the same verified deep link");
assert(stock.includes("overview.data?.research") && !stock.includes('moneycontrol: "https://www.moneycontrol.com/india/stockpricequote/"'), "Stock detail must use backend-resolved research links");
assert(page.includes("moneycontrolDirect"), "Watchlist must distinguish direct links from search fallback");
assert(read("server/src/services/investment.service.js").includes('import { researchLinksForInstrument }') && research.includes("research: researchLinksForInstrument(instrument)"), "Stock and watchlist endpoints must use one research-link builder");
// Phase 6.3 manual refresh / Settings regression: require explicit cache-bypass path.
const settings = read("client/src/pages/SettingsPage.jsx");
assert(/import\s*\{[^}]*\bMonitorCog\b[^}]*\}\s*from\s*["']lucide-react["']/s.test(settings), "Settings must import its Active Sessions icon (runtime crash regression)");
assert(research.includes("forceRefresh = false") && research.includes("if (!forceRefresh && existing?.data") && research.includes("{ forceRefresh }"), "Manual refresh must bypass the server research cache");
assert(read("server/src/services/marketData.service.js").includes("forceRefresh ? unique : unique.filter"), "Manual quote refresh must bypass fresh database snapshots");
assert(read("server/src/controllers/investment.controller.js").includes("forceRefresh: req.validatedData.query.refresh"), "Server must pass the validated refresh flag through to providers");
assert(read("server/src/validators/investment.validator.js").includes('z.enum(["true"])'), "Manual refresh flag must be validated without truthy string coercion");
assert(read("client/src/services/investmentService.js").includes('refresh: "true"'), "Client refresh must request the server cache bypass explicitly");
assert(page.includes("getInvestmentCalendar({ forceRefresh: true })") && stock.includes("getStockOverview(instrumentId, { forceRefresh: true })") && stock.includes("getStockHistory(instrumentId, period, { forceRefresh: true })"), "Both refresh buttons must request fresh provider data");
assert(calendar.includes("disabled={refreshing}") && stock.includes("disabled={refreshing}"), "Disable refresh buttons during a request");
// Exercise cache freshness behavior without an API key or MongoDB connection.
const cacheSource = research.slice(research.indexOf("const cached = async"), research.indexOf("const lookupInstrument"));
const responseCache = new Map();
const cachedLoader = new Function("responseCache", "MAX_CACHE_ENTRIES", `${cacheSource}\nreturn cached;`)(responseCache, 5);
let providerCalls = 0;
const loadPrice = async () => ({ lastPrice: ++providerCalls });
assert.equal((await cachedLoader("test-price", 60000, loadPrice)).lastPrice, 1);
assert.equal((await cachedLoader("test-price", 60000, loadPrice)).lastPrice, 1, "Default polling should reuse fresh cache");
assert.equal((await cachedLoader("test-price", 60000, loadPrice, { forceRefresh: true })).lastPrice, 2, "Manual click must invoke the provider");
assert.equal((await cachedLoader("test-price", 60000, loadPrice)).lastPrice, 2, "Subsequent polling should reuse the refreshed price");
await assert.rejects(() => cachedLoader("test-price", 60000, async () => { throw new Error("Upstox temporarily unavailable"); }, { forceRefresh: true }),
  /Upstox temporarily unavailable/, "Manual refresh must report provider failure");
assert.equal((await cachedLoader("test-price", 60000, loadPrice)).lastPrice, 2, "Provider failure must preserve the previous valid cache");
const result = buildPortfolioAnalytics({
  portfolio: { holdings: [
    { _id: "1", instrument: { exchange: "NSE", tradingSymbol: "AAA" }, account: { name: "Canara" }, marketValue: 300, quote: { lastPrice: 30 } },
    { _id: "2", instrument: { exchange: "BSE", tradingSymbol: "BBB" }, account: { name: "Canara" }, marketValue: 100, quote: {} },
  ], summary: { invested: 350, unrealizedPnl: 50 } },
  accounts: [{ balance: 600 }],
  sells: [{ tradeDate: "2026-10-01T00:00:00.000Z", realizedPnl: 13 }, { tradeDate: "2026-10-15T00:00:00.000Z", realizedPnl: -3 }],
});
const candles = normalizeCandles([
  ["2026-10-01T15:25:00+05:30", 100, 103, 99, 101, 500],
  ["2026-10-02T09:20:00+05:30", 102, 105, 101, 104, 550],
  ["2026-10-02T09:20:00+05:30", 102, 106, 101, 105, 600],
  ["2026-10-02T09:25:00+05:30", 105, 108, 103, 107, 610],
], { days: 1 });
assert.equal(candles.length, 2, "1D candles must select one IST trading day and deduplicate intraday timestamps");
assert.deepEqual(candles.map((item) => item.close), [105, 107], "The latest tick overwrites duplicate historical/intraday candles");
assert.equal(result.equityValue, 400);
assert.equal(result.brokerCash, 600);
assert.equal(result.totalValue, 1000);
assert.equal(result.topHoldingPercent, 75);
assert.equal(result.cashPercent, 60);
assert.equal(result.realizedPnl, 10);
assert.equal(result.totalPnl, 60);
assert.equal(result.quoteFallbackCount, 1);
assert.deepEqual(result.realizedTimeline, [{ month: "2026-10", value: 10 }]);
console.log("FinTrack v2 research/calendar/analytics structural and analytics-math regression tests passed.");
