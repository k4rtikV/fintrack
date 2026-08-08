import mongoose from "mongoose";

import Goal from "../models/Goal.js";
import AppError from "../utils/AppError.js";

const ensureValidObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid goal ID", 400);
  }
};

const getStartOfTodayUtc = () => {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

const getGoalWithProgress = (goal) => {
  const goalObject = goal.toObject ? goal.toObject() : goal;

  const targetAmount = Number(goalObject.targetAmount) || 0;
  const currentAmount = Number(goalObject.currentAmount) || 0;
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);

  const rawPercentage =
    targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

  const percentageComplete = Number(
    Math.min(Math.max(rawPercentage, 0), 100).toFixed(2),
  );

  const targetDate = new Date(goalObject.targetDate);
  const today = getStartOfTodayUtc();
  const targetDay = new Date(
    Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
    ),
  );

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil(
    (targetDay.getTime() - today.getTime()) / millisecondsPerDay,
  );

  const isCompleted = currentAmount >= targetAmount;
  const isOverdue = !isCompleted && daysRemaining < 0;

  let status = "IN_PROGRESS";

  if (isCompleted) {
    status = "COMPLETED";
  } else if (isOverdue) {
    status = "OVERDUE";
  }

  return {
    ...goalObject,
    remainingAmount,
    percentageComplete,
    daysRemaining,
    status,
    isCompleted,
    isOverdue,
  };
};

const ensureUniqueActiveName = async ({
  userId,
  name,
  excludeGoalId,
}) => {
  const filter = {
    user: userId,
    name: {
      $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    },
  };

  if (excludeGoalId) {
    filter._id = {
      $ne: excludeGoalId,
    };
  }

  const duplicate = await Goal.findOne(filter);

  if (duplicate) {
    throw new AppError("You already have a goal with this name", 409);
  }
};

const createGoalForUser = async ({
  userId,
  name,
  targetAmount,
  currentAmount,
  targetDate,
  note,
  color,
  icon,
}) => {
  await ensureUniqueActiveName({
    userId,
    name,
  });

  const goal = await Goal.create({
    user: userId,
    name,
    targetAmount,
    currentAmount,
    targetDate: new Date(targetDate),
    note,
    color,
    icon,
  });

  return getGoalWithProgress(goal);
};

const getGoalsForUser = async ({ userId }) => {
  const goals = await Goal.find({
    user: userId,
  }).sort({
    targetDate: 1,
    createdAt: -1,
  });

  return goals.map(getGoalWithProgress);
};

const getGoalByIdForUser = async ({
  goalId,
  userId,
}) => {
  ensureValidObjectId(goalId);

  const goal = await Goal.findOne({
    _id: goalId,
    user: userId,
  });

  if (!goal) {
    throw new AppError("Goal not found", 404);
  }

  return goal;
};

const getGoalWithProgressByIdForUser = async ({
  goalId,
  userId,
}) => {
  const goal = await getGoalByIdForUser({
    goalId,
    userId,
  });

  return getGoalWithProgress(goal);
};

const updateGoalForUser = async ({
  goalId,
  userId,
  updates,
}) => {
  const goal = await getGoalByIdForUser({
    goalId,
    userId,
  });

  if (updates.name !== undefined && updates.name !== goal.name) {
    await ensureUniqueActiveName({
      userId,
      name: updates.name,
      excludeGoalId: goal._id,
    });
  }

  const allowedFields = [
    "name",
    "targetAmount",
    "currentAmount",
    "note",
    "color",
    "icon",
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      goal[field] = updates[field];
    }
  }

  if (updates.targetDate !== undefined) {
    goal.targetDate = new Date(updates.targetDate);
  }

  await goal.save();

  return getGoalWithProgress(goal);
};

const deleteGoalForUser = async ({
  goalId,
  userId,
}) => {
  ensureValidObjectId(goalId);

  const goal = await Goal.findOneAndDelete({
    _id: goalId,
    user: userId,
  });

  if (!goal) {
    throw new AppError("Goal not found", 404);
  }
};

export {
  createGoalForUser,
  deleteGoalForUser,
  getGoalWithProgressByIdForUser,
  getGoalsForUser,
  updateGoalForUser,
};
