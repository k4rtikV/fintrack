import api from "../api/axios";

const getMonthDateRange = (date = new Date()) => {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

const getDashboardAnalytics = async () => {
  const monthRange = getMonthDateRange();

  const [
    overviewResponse,
    trendResponse,
    categoryResponse,
    expensesResponse,
    accountsResponse,
  ] = await Promise.all([
    api.get("/analytics/overview", {
      params: monthRange,
    }),
    api.get("/analytics/monthly-trend", {
      params: {
        months: 6,
      },
    }),
    api.get("/analytics/category-breakdown", {
      params: monthRange,
    }),
    api.get("/analytics/top-expenses", {
      params: {
        ...monthRange,
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

export { getDashboardAnalytics, getMonthDateRange };
