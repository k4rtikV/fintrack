import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPortfolioAnalytics } from "../utils/investmentPortfolioAnalytics.js";
import { normalizeCandles } from "../utils/investmentHistory.js";
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
