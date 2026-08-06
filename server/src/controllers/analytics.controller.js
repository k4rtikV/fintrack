import {
  getAccountSummaryForUser,
  getCategoryBreakdownForUser,
  getMonthlyTrendForUser,
  getOverviewForUser,
  getTopExpensesForUser,
} from "../services/analytics.service.js";

const getOverview = async (req, res) => {
  const overview = await getOverviewForUser({
    userId: req.user._id,
    ...req.validatedData.query,
  });

  res.status(200).json({
    success: true,
    data: {
      overview,
    },
  });
};

const getCategoryBreakdown = async (req, res) => {
  const categories = await getCategoryBreakdownForUser({
    userId: req.user._id,
    ...req.validatedData.query,
  });

  res.status(200).json({
    success: true,
    results: categories.length,
    data: {
      categories,
    },
  });
};

const getMonthlyTrend = async (req, res) => {
  const trend = await getMonthlyTrendForUser({
    userId: req.user._id,
    ...req.validatedData.query,
  });

  res.status(200).json({
    success: true,
    results: trend.length,
    data: {
      trend,
    },
  });
};

const getTopExpenses = async (req, res) => {
  const expenses = await getTopExpensesForUser({
    userId: req.user._id,
    ...req.validatedData.query,
  });

  res.status(200).json({
    success: true,
    results: expenses.length,
    data: {
      expenses,
    },
  });
};

const getAccountSummary = async (req, res) => {
  const accounts = await getAccountSummaryForUser({
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    results: accounts.length,
    data: {
      accounts,
    },
  });
};

export {
  getAccountSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getOverview,
  getTopExpenses,
};