import mongoose from "mongoose";

import Account from "../models/Account.js";
import Category from "../models/Category.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";
import {
  addDaysDateOnly,
  addMonthsDateOnlyClamped,
  addYearsDateOnlyClamped,
  endOfUtcDateOnly,
  getDateKeyInTimeZone,
  normalizeStoredDateOnly,
  toUtcDateOnly,
} from "../utils/dateOnly.js";
import {
  createRecurringProcessedAlert,
  syncBudgetAlertsForTransaction,
} from "./notification.service.js";

const MAX_OCCURRENCES_PER_PROCESS = 24;

const atStartOfDay = (value) => toUtcDateOnly(value);

const getNextOccurrence = ({
  date,
  frequency,
  interval,
}) => {
  if (frequency === "DAILY") {
    return addDaysDateOnly(date, interval);
  }

  if (frequency === "WEEKLY") {
    return addDaysDateOnly(date, 7 * interval);
  }

  if (frequency === "MONTHLY") {
    return addMonthsDateOnlyClamped(date, interval);
  }

  return addYearsDateOnlyClamped(date, interval);
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

const normalizeRecurringCalendarDates = (recurring, timezone) => {
  for (const field of [
    "startDate",
    "endDate",
    "nextRunDate",
    "lastRunDate",
  ]) {
    if (recurring[field]) {
      recurring[field] = normalizeStoredDateOnly(recurring[field], timezone);
    }
  }

  return recurring;
};

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
  timezone = "Asia/Kolkata",
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

  return normalizeRecurringCalendarDates(recurring, timezone);
};

const getRecurringForUser = async ({
  userId,
  includeInactive = true,
  timezone = "Asia/Kolkata",
}) => {
  const filter = {
    user: userId,
  };

  if (!includeInactive) {
    filter.isActive = true;
  }

  const recurring = await populateRecurring(
    RecurringTransaction.find(filter).sort({
      isActive: -1,
      nextRunDate: 1,
      createdAt: -1,
    }),
  );

  return recurring.map((item) =>
    normalizeRecurringCalendarDates(item, timezone),
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
  timezone = "Asia/Kolkata",
}) => {
  ensureValidObjectId(recurringId);

  const recurring = await RecurringTransaction.findOne({
    _id: recurringId,
    user: userId,
  });

  if (!recurring) {
    throw new AppError("Recurring transaction not found", 404);
  }

  normalizeRecurringCalendarDates(recurring, timezone);

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

  if (created) {
    await createRecurringProcessedAlert({
      userId: recurring.user,
      recurring,
      occurrenceDate,
    });

    if (recurring.type === "EXPENSE") {
      await syncBudgetAlertsForTransaction({
        userId: recurring.user,
        categoryId: recurring.category,
        transactionDate: occurrenceDate,
      });
    }
  }

  return created;
};

const processSingleRecurringForUser = async ({
  recurringId,
  userId,
  now = new Date(),
  timezone = "Asia/Kolkata",
}) => {
  ensureValidObjectId(recurringId);

  const recurring = await RecurringTransaction.findOne({
    _id: recurringId,
    user: userId,
  });

  if (!recurring) {
    throw new AppError("Recurring transaction not found", 404);
  }

  normalizeRecurringCalendarDates(recurring, timezone);

  if (!recurring.isActive) {
    throw new AppError("This recurring schedule is paused", 400);
  }

  const today = atStartOfDay(getDateKeyInTimeZone(now, timezone));
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
  timezone = "Asia/Kolkata",
}) => {
  const today = atStartOfDay(getDateKeyInTimeZone(now, timezone));

  const schedules = await RecurringTransaction.find({
    user: userId,
    isActive: true,
    nextRunDate: {
      $lte: endOfUtcDateOnly(today),
    },
  }).sort({ nextRunDate: 1 });

  let generatedCount = 0;

  for (const recurring of schedules) {
    normalizeRecurringCalendarDates(recurring, timezone);
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
