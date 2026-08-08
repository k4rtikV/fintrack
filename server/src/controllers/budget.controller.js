import {
  createBudgetForUser,
  deleteBudgetForUser,
  getBudgetByIdForUser,
  getBudgetsForUser,
  updateBudgetForUser,
} from "../services/budget.service.js";

const createBudget = async (req, res) => {
  const budget = await createBudgetForUser({
    userId: req.user._id,
    ...req.validatedData.body,
  });

  res.status(201).json({
    success: true,
    message: "Budget created successfully",
    data: {
      budget,
    },
  });
};

const getBudgets = async (req, res) => {
  const budgets = await getBudgetsForUser({
    userId: req.user._id,
    month: req.validatedData.query.month,
  });

  res.status(200).json({
    success: true,
    results: budgets.length,
    data: {
      budgets,
    },
  });
};

const getBudget = async (req, res) => {
  const budget = await getBudgetByIdForUser({
    budgetId: req.validatedData.params.budgetId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    data: {
      budget,
    },
  });
};

const updateBudget = async (req, res) => {
  const budget = await updateBudgetForUser({
    budgetId: req.validatedData.params.budgetId,
    userId: req.user._id,
    updates: req.validatedData.body,
  });

  res.status(200).json({
    success: true,
    message: "Budget updated successfully",
    data: {
      budget,
    },
  });
};

const deleteBudget = async (req, res) => {
  await deleteBudgetForUser({
    budgetId: req.validatedData.params.budgetId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: "Budget deleted successfully",
  });
};

export {
  createBudget,
  deleteBudget,
  getBudget,
  getBudgets,
  updateBudget,
};
