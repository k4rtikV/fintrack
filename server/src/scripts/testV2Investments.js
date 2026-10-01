import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { planFifoSale } from "../utils/investmentMath.js";


const fifo = planFifoSale({
  quantity: 7,
  lots: [
    { _id: "old", quantityRemaining: 5, unitCost: 100 },
    { _id: "new", quantityRemaining: 5, unitCost: 120 },
  ],
});
assert.equal(fifo.unallocated, 0);
assert.equal(fifo.costBasis, 740);
assert.deepEqual(fifo.allocations.map(({ lotId, consumed, quantityRemaining }) => ({ lotId, consumed, quantityRemaining })), [
  { lotId: "old", consumed: 5, quantityRemaining: 0 },
  { lotId: "new", consumed: 2, quantityRemaining: 3 },
]);

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

const app = read("server/src/app.js");
const envExample = read("server/.env.example");
const routes = read("server/src/routes/investment.routes.js");
const validator = read("server/src/validators/investment.validator.js");
const service = read("server/src/services/investment.service.js");
const market = read("server/src/services/marketData.service.js");
const accountService = read("server/src/services/account.service.js");
const analytics = read("server/src/services/analytics.service.js");
const holdingModel = read("server/src/models/InvestmentHolding.js");
const lotModel = read("server/src/models/InvestmentLot.js");
const tradeModel = read("server/src/models/InvestmentTrade.js");
const watchlistModel = read("server/src/models/InvestmentWatchlistItem.js");
const clientApp = read("client/src/App.jsx");
const investmentsPage = read("client/src/pages/InvestmentsPage.jsx");
const tradeModal = read("client/src/components/investments/InvestmentTradeModal.jsx");

assert(app.includes('app.use("/api/investments", investmentRoutes)'), "Investment API must be mounted");
assert(routes.includes("protect, requireAppUnlocked"), "Investment APIs must require auth and an unlocked app session");
assert(routes.includes("marketLimiter"), "Market provider proxy must be rate limited per authenticated user");
assert(envExample.includes("UPSTOX_ANALYTICS_TOKEN"), "Read-only Upstox token configuration must be documented");

assert(market.includes("UPSTOX_ANALYTICS_TOKEN"), "Market token must remain server-side");
assert(market.includes('/v2/instruments/search'), "NSE/BSE instrument search must use provider search API");
assert(market.includes('/v3/market-quote/quotes'), "Quotes must use current full market quote endpoint");
assert(market.includes('exchanges: "NSE,BSE"') && market.includes('segments: "EQ"'), "Search must stay scoped to Indian equities");
assert(market.includes("QUOTE_CACHE_MS"), "Market quotes must be cached to avoid unnecessary provider calls");
assert(!read("client/src/services/investmentService.js").includes("UPSTOX_ANALYTICS_TOKEN"), "Provider token must never appear in client code");

assert(holdingModel.includes("{ user: 1, account: 1, instrument: 1 }") && holdingModel.includes("unique: true"), "A user account must have one aggregate holding per instrument");
assert(lotModel.includes("quantityRemaining"), "Investment lots must preserve remaining FIFO quantity");
assert(tradeModel.includes('["BUY", "SELL"]'), "Investment trades must be first-class BUY/SELL records");
assert(watchlistModel.includes("{ user: 1, instrument: 1 }") && watchlistModel.includes("unique: true"), "Watchlist entries must be unique per user/instrument");

assert(service.includes('type: "INVESTMENT"'), "Trades must settle only against investment accounts");
assert(service.includes('account.currency !== "INR"'), "NSE/BSE trading must not silently mix currencies");
assert(service.includes("mongoose.connection.transaction"), "Trade settlement must be atomic");
assert(service.includes("planFifoSale") && service.includes("sort({ acquiredAt: 1, _id: 1 })"), "SELL must consume lots FIFO");
assert(service.includes("account.balance") && service.includes("netCashAmount"), "Trades must move broker cash without creating ordinary transactions");
assert(service.includes("INVESTMENT_SELL_EXCEEDS_HOLDING"), "Overselling must be rejected explicitly");
assert(accountService.includes("InvestmentHolding.countDocuments") && accountService.includes("INVESTMENT_ACCOUNT_HAS_OPEN_HOLDINGS"), "Accounts with open holdings must not be archived");
assert(accountService.includes("InvestmentTrade.exists"), "Investment trade history must lock account currency semantics");
assert(analytics.includes("getInvestmentValuationByAccount") && analytics.includes("investmentHoldingsValue"), "Dashboard/account summaries must retain holding value after broker cash is spent on shares");

assert(validator.includes('z.enum(["BUY", "SELL"])'), "Trade inputs must validate BUY/SELL type");
assert(validator.includes("max(30)"), "Instrument search must respect provider page-size limits");

assert(clientApp.includes('path="/investments" element={<InvestmentsPage />}'), "Investments placeholder must be replaced by the real page");
assert(investmentsPage.includes('marketStatusLabel') && investmentsPage.includes('UP TO 15S REFRESH') && investmentsPage.includes('LAST AVAILABLE PRICES'), "Investment UI must reflect exchange status and avoid claiming that old quotes are live");
assert(investmentsPage.includes("Watchlist") && investmentsPage.includes("Activity"), "Investments workspace must expose watchlist and trade activity");
assert(investmentsPage.includes("TradingView") || investmentsPage.includes("tradingView"), "External research link must be exposed");
assert(tradeModal.includes("FIFO lots") && tradeModal.includes("ordinary income or expenses"), "Trade UX must explain investment-specific cash semantics");

console.log("FinTrack v2 Investments regression tests passed.");
