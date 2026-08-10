import api from "../api/axios";

const getDashboardAnalytics = async () => {
  const [
    overviewResponse,
    trendResponse,
    categoryResponse,
    expensesResponse,
    accountsResponse,
  ] = await Promise.all([
    api.get("/analytics/overview"),
    api.get("/analytics/monthly-trend", {
      params: {
        months: 6,
      },
    }),
    api.get("/analytics/category-breakdown"),
    api.get("/analytics/top-expenses", {
      params: {
        limit: 5,
      },
    }),
    api.get("/analytics/account-summary"),
  ]);

  return {
    overview: overviewResponse.data.data.overview,
    trend: trendResponse.data.data.trend,
    categories: categoryResponse.data.data.categories,
    expenses: expensesResponse.data.data.expenses,
    accounts: accountsResponse.data.data.accounts,
  };
};

export { getDashboardAnalytics };
