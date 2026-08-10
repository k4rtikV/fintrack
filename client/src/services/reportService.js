import api from "../api/axios";

const getReportAnalytics = async ({ startDate, endDate }) => {
  const range = { startDate, endDate };

  const [overviewResponse, categoryResponse, expensesResponse, trendResponse] =
    await Promise.all([
      api.get("/analytics/overview", { params: range }),
      api.get("/analytics/category-breakdown", { params: range }),
      api.get("/analytics/top-expenses", {
        params: {
          ...range,
          limit: 10,
        },
      }),
      api.get("/analytics/monthly-trend", {
        params: range,
      }),
    ]);

  return {
    overview: overviewResponse.data.data.overview,
    categories: categoryResponse.data.data.categories,
    expenses: expensesResponse.data.data.expenses,
    trend: trendResponse.data.data.trend,
  };
};

export { getReportAnalytics };
