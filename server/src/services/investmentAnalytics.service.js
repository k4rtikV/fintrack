import InvestmentTrade from "../models/InvestmentTrade.js";
import { buildPortfolioAnalytics } from "../utils/investmentPortfolioAnalytics.js";
import { getInvestmentAccountsForUser, getPortfolioForUser } from "./investment.service.js";

const getPortfolioAnalyticsForUser = async ({ userId }) => {
  const [portfolio, accounts, sells] = await Promise.all([
    getPortfolioForUser({ userId }), getInvestmentAccountsForUser({ userId }),
    InvestmentTrade.find({ user: userId, type: "SELL" }).select("tradeDate realizedPnl").lean(),
  ]);
  return buildPortfolioAnalytics({ portfolio, accounts, sells });
};
export { buildPortfolioAnalytics, getPortfolioAnalyticsForUser };
