import mongoose from "mongoose";

import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import Notification from "../models/Notification.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { sendNotificationEmail } from "./email.service.js";

const toMonthKey = (dateValue) => {
  const date = new Date(dateValue);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const getMonthRange = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    startDate: new Date(Date.UTC(year, monthNumber - 1, 1)),
    endDate: new Date(Date.UTC(year, monthNumber, 1)),
  };
};

const deliverNotificationEmail = async (notification) => {
  try {
    const user = await User.findById(notification.user);
    if (!user?.email || !user.emailVerified) return;
    await sendNotificationEmail({ user, notification });
  } catch (error) {
    console.error("FinTrack notification email failed:", error.message);
  }
};

const createNotificationForUser = async ({
  userId,
  type,
  title,
  message,
  actionUrl = "",
  metadata = {},
  dedupeKey = null,
  email = true,
}) => {
  let notification;

  try {
    notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      actionUrl,
      metadata,
      dedupeKey,
    });
  } catch (error) {
    if (error?.code === 11000 && dedupeKey) {
      return Notification.findOne({ user: userId, dedupeKey });
    }
    throw error;
  }

  if (email) {
    void deliverNotificationEmail(notification);
  }

  return notification;
};

const getNotificationsForUser = async ({ userId, limit = 30 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(safeLimit),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  return { notifications, unreadCount };
};

const markNotificationReadForUser = async ({ notificationId, userId }) => {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new AppError("Invalid notification ID", 400);
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true },
  );

  if (!notification) throw new AppError("Notification not found", 404);
  return notification;
};

const markAllNotificationsReadForUser = async ({ userId }) => {
  await Notification.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
};

const syncBudgetAlertsForTransactionUnsafe = async ({ userId, categoryId, transactionDate }) => {
  const month = toMonthKey(transactionDate);
  const budget = await Budget.findOne({ user: userId, category: categoryId, month }).populate(
    "category",
    "name",
  );

  if (!budget) return;

  const { startDate, endDate } = getMonthRange(month);
  const spending = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        category: new mongoose.Types.ObjectId(categoryId),
        type: "EXPENSE",
        transactionDate: { $gte: startDate, $lt: endDate },
      },
    },
    { $group: { _id: null, spent: { $sum: "$amount" } } },
  ]);

  const spent = spending[0]?.spent ?? 0;
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const categoryName = budget.category?.name || "category";
  const thresholds = percentage >= 100 ? [80, 100] : percentage >= 80 ? [80] : [];

  for (const threshold of thresholds) {
    const exceeded = threshold === 100;
    await createNotificationForUser({
      userId,
      type: "BUDGET",
      title: exceeded ? `${categoryName} budget exceeded` : `${categoryName} budget is 80% used`,
      message: exceeded
        ? `You have spent more than your ${categoryName} budget for ${month}.`
        : `You have used at least 80% of your ${categoryName} budget for ${month}.`,
      actionUrl: "/budgets",
      dedupeKey: `budget:${budget._id}:${threshold}`,
      metadata: {
        budgetId: budget._id,
        categoryId,
        categoryName,
        month,
        threshold,
        spent,
        budgetAmount: budget.amount,
        percentage: Number(percentage.toFixed(2)),
      },
    });
  }
};

const createGoalMilestoneAlertsUnsafe = async ({ userId, goal, previousPercentage = 0 }) => {
  const milestones = [50, 75, 100];

  for (const milestone of milestones) {
    if (previousPercentage < milestone && goal.percentageComplete >= milestone) {
      await createNotificationForUser({
        userId,
        type: "GOAL",
        title: milestone === 100 ? `${goal.name} completed` : `${goal.name} reached ${milestone}%`,
        message:
          milestone === 100
            ? `Great progress — you reached your ${goal.name} savings goal.`
            : `Your ${goal.name} goal has reached ${milestone}% completion.`,
        actionUrl: "/goals",
        dedupeKey: `goal:${goal._id}:${milestone}`,
        metadata: {
          goalId: goal._id,
          goalName: goal.name,
          percentage: milestone,
          currentAmount: goal.currentAmount,
          targetAmount: goal.targetAmount,
        },
      });
    }
  }
};

const createRecurringProcessedAlertUnsafe = async ({ userId, recurring, occurrenceDate }) => {
  const occurrenceKey = new Date(occurrenceDate).toISOString().slice(0, 10);
  const title = `${recurring.title} processed`;
  await createNotificationForUser({
    userId,
    type: "RECURRING",
    title,
    message: `Your recurring ${recurring.type.toLowerCase()} “${recurring.title}” was added to transactions.`,
    actionUrl: "/transactions",
    dedupeKey: `recurring:${recurring._id}:${occurrenceKey}`,
    metadata: {
      recurringId: recurring._id,
      transactionTitle: recurring.title,
      transactionType: recurring.type,
      amount: recurring.amount,
      occurrenceDate,
    },
  });
};

const runAlertSafely = async (label, callback) => {
  try {
    return await callback();
  } catch (error) {
    console.error(`FinTrack ${label} notification failed:`, error.message);
    return null;
  }
};

const syncBudgetAlertsForTransaction = (payload) =>
  runAlertSafely("budget", () => syncBudgetAlertsForTransactionUnsafe(payload));

const createGoalMilestoneAlerts = (payload) =>
  runAlertSafely("goal", () => createGoalMilestoneAlertsUnsafe(payload));

const createRecurringProcessedAlert = (payload) =>
  runAlertSafely("recurring", () => createRecurringProcessedAlertUnsafe(payload));

export {
  createGoalMilestoneAlerts,
  createNotificationForUser,
  createRecurringProcessedAlert,
  getNotificationsForUser,
  markAllNotificationsReadForUser,
  markNotificationReadForUser,
  syncBudgetAlertsForTransaction,
};
