import { roundMoney } from "./investmentMath.js";

const percent = (part, total) => total > 0 ? Math.round((part / total) * 10000) / 100 : 0;
const makeAllocation = (items, total) => items.sort((a, b) => b.value - a.value).map((item) => ({
  ...item, value: roundMoney(item.value), percent: percent(item.value, total),
}));
const buildPortfolioAnalytics = ({ portfolio, accounts, sells }) => {
  const holdings = portfolio.holdings || [];
  const equityValue = roundMoney(holdings.reduce((sum, holding) => sum + Number(holding.marketValue || 0), 0));
  const brokerCash = roundMoney(accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0));
  const byExchange = new Map();
  const byAccount = new Map();
  for (const holding of holdings) {
    const value = Number(holding.marketValue || 0);
    const exchange = holding.instrument?.exchange || "OTHER";
    byExchange.set(exchange, (byExchange.get(exchange) || 0) + value);
    const account = holding.account?.name || "Investment account";
    byAccount.set(account, (byAccount.get(account) || 0) + value);
  }
  const totalValue = roundMoney(equityValue + brokerCash);
  const byHolding = makeAllocation(holdings.map((holding) => ({
    id: String(holding._id), symbol: holding.instrument?.tradingSymbol || "—",
    exchange: holding.instrument?.exchange || "", account: holding.account?.name || "",
    value: Number(holding.marketValue || 0), estimated: !Number(holding.quote?.lastPrice),
  })), equityValue);
  const monthlyMap = new Map();
  for (const trade of sells) {
    const month = new Date(trade.tradeDate).toISOString().slice(0, 7);
    monthlyMap.set(month, roundMoney((monthlyMap.get(month) || 0) + Number(trade.realizedPnl || 0)));
  }
  const realized = roundMoney(sells.reduce((sum, trade) => sum + Number(trade.realizedPnl || 0), 0));
  return {
    currency: "INR", totalValue, brokerCash, equityValue,
    invested: portfolio.summary?.invested || 0, unrealizedPnl: portfolio.summary?.unrealizedPnl || 0,
    realizedPnl: realized, totalPnl: roundMoney(realized + Number(portfolio.summary?.unrealizedPnl || 0)),
    equityPercent: percent(equityValue, Math.max(totalValue, 0)),
    cashPercent: percent(brokerCash, Math.max(totalValue, 0)),
    topHoldingPercent: byHolding[0]?.percent || 0,
    concentrationIndex: byHolding.reduce((sum, item) => sum + Math.pow(item.percent / 100, 2), 0),
    quoteFallbackCount: byHolding.filter((item) => item.estimated).length,
    byHolding, byExchange: makeAllocation([...byExchange].map(([name, value]) => ({ name, value })), equityValue),
    byAccount: makeAllocation([...byAccount].map(([name, value]) => ({ name, value })), equityValue),
    realizedTimeline: [...monthlyMap].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, value]) => ({ month, value })),
    valuationHistoryAvailable: false, // Never fabricate historical portfolio value from present holdings.
  };
};
export { buildPortfolioAnalytics };
