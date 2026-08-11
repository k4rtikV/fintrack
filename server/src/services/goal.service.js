import mongoose from "mongoose";

import Goal from "../models/Goal.js";
import AppError from "../utils/AppError.js";
import {
  differenceInCalendarDays,
  getDateKey,
  getDateKeyInTimeZone,
  toUtcDateOnly,
} from "../utils/dateOnly.js";
import { createGoalMilestoneAlerts } from "./notification.service.js";

const ensureValidObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid goal ID", 400);
  }
};

const getGoalWithProgress = (goal, timezone = "Asia/Kolkata") => {
  const goalObject = goal.toObject ? goal.toObject() : goal;

  const targetAmount = Number(goalObject.targetAmount) || 0;
  const currentAmount = Number(goalObject.currentAmount) || 0;
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);

  const rawPercentage =
    targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

  const percentageComplete = Number(
    Math.min(Math.max(rawPercentage, 0), 100).toFixed(2),
  );

  const targetDateKey = getDateKey(goalObject.targetDate);
  const todayDateKey = getDateKeyInTimeZone(new Date(), timezone);
  const daysRemaining = differenceInCalendarDays(
    targetDateKey,
    todayDateKey,
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
  timezone = "Asia/Kolkata",
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
    targetDate: toUtcDateOnly(targetDate),
    note,
    color,
    icon,
  });

  const goalWithProgress = getGoalWithProgress(goal, timezone);

  await createGoalMilestoneAlerts({
    userId,
    goal: goalWithProgress,
    previousPercentage: 0,
  });

  return goalWithProgress;
};

const getGoalsForUser = async ({ userId, timezone = "Asia/Kolkata" }) => {
  const goals = await Goal.find({
    user: userId,
  }).sort({
    targetDate: 1,
    createdAt: -1,
  });

  return goals.map((goal) => getGoalWithProgress(goal, timezone));
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
  timezone = "Asia/Kolkata",
}) => {
  const goal = await getGoalByIdForUser({
    goalId,
    userId,
  });

  return getGoalWithProgress(goal, timezone);
};

const updateGoalForUser = async ({
  goalId,
  userId,
  updates,
  timezone = "Asia/Kolkata",
}) => {
  const goal = await getGoalByIdForUser({
    goalId,
    userId,
  });

  const previousPercentage = getGoalWithProgress(goal, timezone).percentageComplete;

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
    goal.targetDate = toUtcDateOnly(updates.targetDate);
  }

  await goal.save();

  const goalWithProgress = getGoalWithProgress(goal, timezone);

  await createGoalMilestoneAlerts({
    userId,
    goal: goalWithProgress,
    previousPercentage,
  });

  return goalWithProgress;
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
