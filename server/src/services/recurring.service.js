import mongoose from "mongoose";

import Account from "../models/Account.js";
import Category from "../models/Category.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";

const MAX_OCCURRENCES_PER_PROCESS = 24;

const atStartOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addMonthsClamped = (date, months) => {
  const source = new Date(date);
  const originalDay = source.getDate();

  const target = new Date(source);
  target.setDate(1);
  target.setMonth(target.getMonth() + months);

  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();

  target.setDate(Math.min(originalDay, lastDay));

  return target;
};

const addYearsClamped = (date, years) => {
  const source = new Date(date);
  const month = source.getMonth();
  const day = source.getDate();

  const target = new Date(source);
  target.setDate(1);
  target.setFullYear(target.getFullYear() + years);
  target.setMonth(month);

  const lastDay = new Date(
    target.getFullYear(),
    month + 1,
    0,
  ).getDate();

  target.setDate(Math.min(day, lastDay));

  return target;
};

const getNextOccurrence = ({
  date,
  frequency,
  interval,
}) => {
  const current = new Date(date);

  if (frequency === "DAILY") {
    current.setDate(current.getDate() + interval);
    return current;
  }

  if (frequency === "WEEKLY") {
    current.setDate(current.getDate() + 7 * interval);
    return current;
  }

  if (frequency === "MONTHLY") {
    return addMonthsClamped(current, interval);
  }

  return addYearsClamped(current, interval);
};

const ensureValidObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid recurring transaction ID", 400);
  }
};

const ensureAccountAndCategory = async ({
  userId,
  accountId,
  categoryId,
  type,
  session = null,
}) => {
  const accountQuery = Account.findOne({
    _id: accountId,
    user: userId,
    isArchived: false,
  });

  const categoryQuery = Category.findOne({
    _id: categoryId,
    user: userId,
    isArchived: false,
  });

  if (session) {
    accountQuery.session(session);
    categoryQuery.session(session);
  }

  const [account, category] = await Promise.all([
    accountQuery,
    categoryQuery,
  ]);

  if (!account) {
    throw new AppError("Account not found or archived", 404);
  }

  if (!category) {
    throw new AppError("Category not found or archived", 404);
  }

  if (category.type !== type) {
    throw new AppError(
      `An ${type.toLowerCase()} recurring transaction must use an ${type.toLowerCase()} category`,
      400,
    );
  }

  return { account, category };
};

const populateRecurring = (query) =>
  query
    .populate("account", "name type currency balance isArchived")
    .populate("category", "name type icon color isArchived");

const createRecurringForUser = async ({
  userId,
  accountId,
  categoryId,
  type,
  amount,
  title,
  note,
  paymentMethod,
  tags,
  frequency,
  interval,
  startDate,
  endDate,
}) => {
  await ensureAccountAndCategory({
    userId,
    accountId,
    categoryId,
    type,
  });

  const firstRun = atStartOfDay(startDate);
  const normalizedEndDate = endDate ? atStartOfDay(endDate) : null;

  if (
    normalizedEndDate &&
    normalizedEndDate.getTime() < firstRun.getTime()
  ) {
    throw new AppError("End date cannot be before start date", 400);
  }

  const recurring = await RecurringTransaction.create({
    user: userId,
    account: accountId,
    category: categoryId,
    type,
    amount,
    title,
    note,
    paymentMethod,
    tags,
    frequency,
    interval,
    startDate: firstRun,
    endDate: normalizedEndDate,
    nextRunDate: firstRun,
  });

  return populateRecurring(
    RecurringTransaction.findById(recurring._id),
  );
};

const getRecurringByIdForUser = async ({
  recurringId,
  userId,
}) => {
  ensureValidObjectId(recurringId);

  const recurring = await populateRecurring(
    RecurringTransaction.findOne({
      _id: recurringId,
      user: userId,
    }),
  );

  if (!recurring) {
    throw new AppError("Recurring transaction not found", 404);
  }

  return recurring;
};

const getRecurringForUser = async ({
  userId,
  includeInactive = true,
}) => {
  const filter = {
    user: userId,
  };

  if (!includeInactive) {
    filter.isActive = true;
  }

  return populateRecurring(
    RecurringTransaction.find(filter).sort({
      isActive: -1,
      nextRunDate: 1,
      createdAt: -1,
    }),
  );
};

const calculateNextRunAfterEdit = ({
  startDate,
  lastRunDate,
  frequency,
  interval,
}) => {
  let candidate = atStartOfDay(startDate);

  if (!lastRunDate) {
    return candidate;
  }

  const lastRun = atStartOfDay(lastRunDate);
  let guard = 0;

  while (candidate.getTime() <= lastRun.getTime() && guard < 10000) {
    candidate = getNextOccurrence({
      date: candidate,
      frequency,
      interval,
    });
    guard += 1;
  }

  return candidate;
};

const updateRecurringForUser = async ({
  recurringId,
  userId,
  updates,
}) => {
  ensureValidObjectId(recurringId);

  const recurring = await RecurringTransaction.findOne({
    _id: recurringId,
    user: userId,
  });

  if (!recurring) {
    throw new AppError("Recurring transaction not found", 404);
  }

  const nextType = updates.type ?? recurring.type;
  const nextAccountId =
    updates.accountId ?? recurring.account.toString();
  const nextCategoryId =
    updates.categoryId ?? recurring.category.toString();

  await ensureAccountAndCategory({
    userId,
    accountId: nextAccountId,
    categoryId: nextCategoryId,
    type: nextType,
  });

  const nextStartDate = updates.startDate
    ? atStartOfDay(updates.startDate)
    : recurring.startDate;

  const nextEndDate =
    updates.endDate !== undefined
      ? updates.endDate
        ? atStartOfDay(updates.endDate)
        : null
      : recurring.endDate;

  if (
    nextEndDate &&
    nextEndDate.getTime() < nextStartDate.getTime()
  ) {
    throw new AppError("End date cannot be before start date", 400);
  }

  const fieldMap = {
    accountId: "account",
    categoryId: "category",
    type: "type",
    amount: "amount",
    title: "title",
    note: "note",
    paymentMethod: "paymentMethod",
    tags: "tags",
    frequency: "frequency",
    interval: "interval",
    isActive: "isActive",
  };

  for (const [inputField, modelField] of Object.entries(fieldMap)) {
    if (updates[inputField] !== undefined) {
      recurring[modelField] = updates[inputField];
    }
  }

  recurring.startDate = nextStartDate;
  recurring.endDate = nextEndDate;

  const recurrenceChanged =
    updates.startDate !== undefined ||
    updates.frequency !== undefined ||
    updates.interval !== undefined;

  if (recurrenceChanged) {
    recurring.nextRunDate = calculateNextRunAfterEdit({
      startDate: recurring.startDate,
      lastRunDate: recurring.lastRunDate,
      frequency: recurring.frequency,
      interval: recurring.interval,
    });
  }

  if (
    recurring.endDate &&
    recurring.nextRunDate.getTime() > recurring.endDate.getTime()
  ) {
    recurring.isActive = false;
  }

  await recurring.save();

  return populateRecurring(
    RecurringTransaction.findById(recurring._id),
  );
};

const deleteRecurringForUser = async ({
  recurringId,
  userId,
}) => {
  ensureValidObjectId(recurringId);

  const recurring = await RecurringTransaction.findOneAndDelete({
    _id: recurringId,
    user: userId,
  });

  if (!recurring) {
    throw new AppError("Recurring transaction not found", 404);
  }
};

const createGeneratedTransaction = async ({
  recurring,
  occurrenceDate,
}) => {
  let created = false;

  await mongoose.connection.transaction(async (session) => {
    const existing = await Transaction.findOne({
      user: recurring.user,
      recurringTransaction: recurring._id,
      recurringOccurrenceDate: occurrenceDate,
    }).session(session);

    if (existing) {
      return;
    }

    const { account } = await ensureAccountAndCategory({
      userId: recurring.user,
      accountId: recurring.account,
      categoryId: recurring.category,
      type: recurring.type,
      session,
    });

    const adjustment =
      recurring.type === "INCOME"
        ? recurring.amount
        : -recurring.amount;

    account.balance += adjustment;

    await account.save({
      session,
      validateModifiedOnly: true,
    });

    await Transaction.create(
      [
        {
          user: recurring.user,
          account: recurring.account,
          category: recurring.category,
          type: recurring.type,
          amount: recurring.amount,
          title: recurring.title,
          note: recurring.note,
          transactionDate: occurrenceDate,
          paymentMethod: recurring.paymentMethod,
          tags: recurring.tags,
          recurringTransaction: recurring._id,
          recurringOccurrenceDate: occurrenceDate,
        },
      ],
      { session },
    );

    created = true;
  });

  return created;
};

const processSingleRecurringForUser = async ({
  recurringId,
  userId,
  now = new Date(),
}) => {
  ensureValidObjectId(recurringId);

  const recurring = await RecurringTransaction.findOne({
    _id: recurringId,
    user: userId,
  });

  if (!recurring) {
    throw new AppError("Recurring transaction not found", 404);
  }

  if (!recurring.isActive) {
    throw new AppError("This recurring schedule is paused", 400);
  }

  const today = atStartOfDay(now);
  const nextRun = atStartOfDay(recurring.nextRunDate);

  if (nextRun.getTime() > today.getTime()) {
    throw new AppError("This recurring schedule is not due yet", 400);
  }

  if (
    recurring.endDate &&
    nextRun.getTime() > atStartOfDay(recurring.endDate).getTime()
  ) {
    recurring.isActive = false;
    await recurring.save();
    throw new AppError("This recurring schedule has already ended", 400);
  }

  const created = await createGeneratedTransaction({
    recurring,
    occurrenceDate: nextRun,
  });

  recurring.lastRunDate = nextRun;
  recurring.nextRunDate = getNextOccurrence({
    date: nextRun,
    frequency: recurring.frequency,
    interval: recurring.interval,
  });

  if (
    recurring.endDate &&
    recurring.nextRunDate.getTime() >
      atStartOfDay(recurring.endDate).getTime()
  ) {
    recurring.isActive = false;
  }

  await recurring.save();

  return {
    created,
    recurring: await populateRecurring(
      RecurringTransaction.findById(recurring._id),
    ),
  };
};

const processDueRecurringForUser = async ({
  userId,
  now = new Date(),
}) => {
  const today = atStartOfDay(now);

  const schedules = await RecurringTransaction.find({
    user: userId,
    isActive: true,
    nextRunDate: {
      $lte: today,
    },
  }).sort({ nextRunDate: 1 });

  let generatedCount = 0;

  for (const recurring of schedules) {
    let processedForSchedule = 0;

    while (
      recurring.isActive &&
      recurring.nextRunDate &&
      recurring.nextRunDate.getTime() <= today.getTime() &&
      processedForSchedule < MAX_OCCURRENCES_PER_PROCESS
    ) {
      const occurrenceDate = atStartOfDay(recurring.nextRunDate);

      if (
        recurring.endDate &&
        occurrenceDate.getTime() > atStartOfDay(recurring.endDate).getTime()
      ) {
        recurring.isActive = false;
        break;
      }

      const created = await createGeneratedTransaction({
        recurring,
        occurrenceDate,
      });

      if (created) {
        generatedCount += 1;
      }

      recurring.lastRunDate = occurrenceDate;
      recurring.nextRunDate = getNextOccurrence({
        date: occurrenceDate,
        frequency: recurring.frequency,
        interval: recurring.interval,
      });

      processedForSchedule += 1;

      if (
        recurring.endDate &&
        recurring.nextRunDate.getTime() >
          atStartOfDay(recurring.endDate).getTime()
      ) {
        recurring.isActive = false;
      }
    }

    await recurring.save();
  }

  return {
    generatedCount,
    processedSchedules: schedules.length,
  };
};

export {
  createRecurringForUser,
  deleteRecurringForUser,
  getRecurringByIdForUser,
  getRecurringForUser,
  processDueRecurringForUser,
  processSingleRecurringForUser,
  updateRecurringForUser,
};
