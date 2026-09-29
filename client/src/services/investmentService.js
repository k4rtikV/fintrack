import api from "../api/axios";

const getMarketStatus = async () =>
  (await api.get("/investments/market/status")).data.data.market;

const searchInstruments = async ({ query, page = 1, records = 20 }) => {
  const response = await api.get("/investments/market/search", {
    params: { query, page, records },
  });
  return {
    instruments: response.data.data.instruments,
    pagination: response.data.pagination,
  };
};

const getInstrumentQuote = async (instrumentId) =>
  (await api.get(`/investments/market/quote/${instrumentId}`)).data.data;

const getInvestmentAccounts = async () =>
  (await api.get("/investments/accounts")).data.data.accounts;

const getPortfolio = async () =>
  (await api.get("/investments/portfolio")).data.data;

const getInvestmentTrades = async (limit = 50) =>
  (await api.get("/investments/trades", { params: { limit } })).data.data.trades;

const createInvestmentTrade = async (payload) =>
  (await api.post("/investments/trades", payload)).data;

const getWatchlist = async () =>
  (await api.get("/investments/watchlist")).data.data;

const addWatchlistItem = async (instrumentId) =>
  (await api.post("/investments/watchlist", { instrumentId })).data;

const removeWatchlistItem = async (watchlistId) =>
  (await api.delete(`/investments/watchlist/${watchlistId}`)).data;

export {
  addWatchlistItem,
  createInvestmentTrade,
  getInstrumentQuote,
  getInvestmentAccounts,
  getInvestmentTrades,
  getMarketStatus,
  getPortfolio,
  getWatchlist,
  removeWatchlistItem,
  searchInstruments,
};
