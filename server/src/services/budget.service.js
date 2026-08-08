import mongoose from "mongoose";

import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";

const ensureValidObjectId = (id, label = "budget") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${label} ID`, 400);
  }
};

const getMonthDateRange = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);

  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const endDate = new Date(Date.UTC(year, monthNumber, 1));

  return {
    startDate,
    endDate,
  };
};

const ensureExpenseCategoryBelongsToUser = async ({
  categoryId,
  userId,
}) => {
  ensureValidObjectId(categoryId, "category");

  const category = await Category.findOne({
    _id: categoryId,
    user: userId,
    type: "EXPENSE",
    isArchived: false,
  });

  if (!category) {
    throw new AppError(
      "Budget category must be an active expense category",
      404,
    );
  }

  return category;
};

const addBudgetProgress = async ({
  budgets,
  userId,
}) => {
  if (budgets.length === 0) {
    return [];
  }

  const months = [...new Set(budgets.map((budget) => budget.month))];
  const monthRanges = months.map((month) => ({
    month,
    ...getMonthDateRange(month),
  }));

  const spentByKey = new Map();

  await Promise.all(
    monthRanges.map(async ({ month, startDate, endDate }) => {
      const categoryIds = budgets
        .filter((budget) => budget.month === month)
        .map((budget) => budget.category._id ?? budget.category);

      const spending = await Transaction.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            type: "EXPENSE",
            category: {
              $in: categoryIds.map(
                (id) => new mongoose.Types.ObjectId(id),
              ),
            },
            transactionDate: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $group: {
            _id: "$category",
            spent: {
              $sum: "$amount",
            },
          },
        },
      ]);

      for (const item of spending) {
        spentByKey.set(`${month}:${item._id.toString()}`, item.spent);
      }
    }),
  );

  return budgets.map((budget) => {
    const budgetObject = budget.toObject();
    const categoryId = (
      budget.category._id ?? budget.category
    ).toString();

    const spent = spentByKey.get(`${budget.month}:${categoryId}`) ?? 0;
    const remaining = budget.amount - spent;
    const percentageUsed =
      budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    return {
      ...budgetObject,
      spent,
      remaining,
      percentageUsed: Number(percentageUsed.toFixed(2)),
      isOverBudget: spent > budget.amount,
    };
  });
};

const createBudgetForUser = async ({
  userId,
  categoryId,
  month,
  amount,
  note,
}) => {
  await ensureExpenseCategoryBelongsToUser({
    categoryId,
    userId,
  });

  const existingBudget = await Budget.findOne({
    user: userId,
    category: categoryId,
    month,
  });

  if (existingBudget) {
    throw new AppError(
      "A budget already exists for this category and month",
      409,
    );
  }

  const budget = await Budget.create({
    user: userId,
    category: categoryId,
    month,
    amount,
    note,
  });

  await budget.populate("category", "name type icon color");

  const [budgetWithProgress] = await addBudgetProgress({
    budgets: [budget],
    userId,
  });

  return budgetWithProgress;
};

const getBudgetsForUser = async ({
  userId,
  month,
}) => {
  const filter = {
    user: userId,
  };

  if (month) {
    filter.month = month;
  }

  const budgets = await Budget.find(filter)
    .populate("category", "name type icon color isArchived")
    .sort({
      month: -1,
      createdAt: 1,
    });

  return addBudgetProgress({
    budgets,
    userId,
  });
};

const getBudgetByIdForUser = async ({
  budgetId,
  userId,
}) => {
  ensureValidObjectId(budgetId);

  const budget = await Budget.findOne({
    _id: budgetId,
    user: userId,
  }).populate("category", "name type icon color isArchived");

  if (!budget) {
    throw new AppError("Budget not found", 404);
  }

  const [budgetWithProgress] = await addBudgetProgress({
    budgets: [budget],
    userId,
  });

  return budgetWithProgress;
};

const updateBudgetForUser = async ({
  budgetId,
  userId,
  updates,
}) => {
  ensureValidObjectId(budgetId);

  const budget = await Budget.findOne({
    _id: budgetId,
    user: userId,
  });

  if (!budget) {
    throw new AppError("Budget not found", 404);
  }

  if (updates.amount !== undefined) {
    budget.amount = updates.amount;
  }

  if (updates.note !== undefined) {
    budget.note = updates.note;
  }

  await budget.save();
  await budget.populate("category", "name type icon color isArchived");

  const [budgetWithProgress] = await addBudgetProgress({
    budgets: [budget],
    userId,
  });

  return budgetWithProgress;
};

const deleteBudgetForUser = async ({
  budgetId,
  userId,
}) => {
  ensureValidObjectId(budgetId);

  const budget = await Budget.findOneAndDelete({
    _id: budgetId,
    user: userId,
  });

  if (!budget) {
    throw new AppError("Budget not found", 404);
  }
};

export {
  createBudgetForUser,
  deleteBudgetForUser,
  getBudgetByIdForUser,
  getBudgetsForUser,
  updateBudgetForUser,
};
