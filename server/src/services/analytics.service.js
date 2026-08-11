import mongoose from "mongoose";

import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import {
  endOfUtcDateOnly,
  getDateKeyInTimeZone,
  toUtcDateOnly,
} from "../utils/dateOnly.js";

const toObjectId = (value) => {
  return new mongoose.Types.ObjectId(value.toString());
};

const buildDateMatch = ({ startDate, endDate }) => {
  if (!startDate && !endDate) {
    return {};
  }

  const transactionDate = {};

  if (startDate) {
    transactionDate.$gte = toUtcDateOnly(startDate);
  }

  if (endDate) {
    transactionDate.$lte = endOfUtcDateOnly(endDate);
  }

  return {
    transactionDate,
  };
};

const getOverviewForUser = async ({
  userId,
  startDate,
  endDate,
}) => {
  const userObjectId = toObjectId(userId);

  const transactionMatch = {
    user: userObjectId,
    ...buildDateMatch({
      startDate,
      endDate,
    }),
  };

  const [transactionTotals, accountTotals] = await Promise.all([
    Transaction.aggregate([
      {
        $match: transactionMatch,
      },
      {
        $group: {
          _id: "$type",
          total: {
            $sum: "$amount",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]),

    Account.aggregate([
      {
        $match: {
          user: userObjectId,
          isArchived: false,
        },
      },
      {
        $group: {
          _id: null,
          totalBalance: {
            $sum: "$balance",
          },
          accountCount: {
            $sum: 1,
          },
        },
      },
    ]),
  ]);

  const incomeRecord = transactionTotals.find(
    (item) => item._id === "INCOME",
  );

  const expenseRecord = transactionTotals.find(
    (item) => item._id === "EXPENSE",
  );

  const totalIncome = incomeRecord?.total || 0;
  const totalExpense = expenseRecord?.total || 0;
  const netSavings = totalIncome - totalExpense;

  const savingsRate =
    totalIncome > 0
      ? Number(((netSavings / totalIncome) * 100).toFixed(2))
      : 0;

  return {
    totalBalance: accountTotals[0]?.totalBalance || 0,
    accountCount: accountTotals[0]?.accountCount || 0,
    totalIncome,
    incomeTransactionCount: incomeRecord?.count || 0,
    totalExpense,
    expenseTransactionCount: expenseRecord?.count || 0,
    netSavings,
    savingsRate,
    totalTransactionCount:
      (incomeRecord?.count || 0) + (expenseRecord?.count || 0),
  };
};

const getCategoryBreakdownForUser = async ({
  userId,
  startDate,
  endDate,
}) => {
  const userObjectId = toObjectId(userId);

  const breakdown = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: "EXPENSE",
        ...buildDateMatch({
          startDate,
          endDate,
        }),
      },
    },
    {
      $group: {
        _id: "$category",
        amount: {
          $sum: "$amount",
        },
        transactionCount: {
          $sum: 1,
        },
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: "$category",
    },
    {
      $project: {
        _id: 0,
        categoryId: "$category._id",
        name: "$category.name",
        icon: "$category.icon",
        color: "$category.color",
        amount: 1,
        transactionCount: 1,
      },
    },
    {
      $sort: {
        amount: -1,
      },
    },
  ]);

  const totalExpense = breakdown.reduce(
    (total, item) => total + item.amount,
    0,
  );

  return breakdown.map((item) => ({
    ...item,
    percentage:
      totalExpense > 0
        ? Number(((item.amount / totalExpense) * 100).toFixed(2))
        : 0,
  }));
};

const getMonthlyTrendForUser = async ({
  userId,
  months = 6,
  startDate,
  endDate,
  timezone = "Asia/Kolkata",
}) => {
  const userObjectId = toObjectId(userId);
  const hasDateRange = Boolean(startDate || endDate);

  let rangeStart;
  let rangeEnd;

  if (hasDateRange) {
    rangeStart = startDate ? toUtcDateOnly(startDate) : new Date(0);
    rangeEnd = endDate
      ? toUtcDateOnly(endDate)
      : toUtcDateOnly(getDateKeyInTimeZone(new Date(), timezone));
  } else {
    rangeEnd = toUtcDateOnly(getDateKeyInTimeZone(new Date(), timezone));
    rangeStart = new Date(
      Date.UTC(
        rangeEnd.getUTCFullYear(),
        rangeEnd.getUTCMonth() - (months - 1),
        1,
      ),
    );
  }

  const inclusiveEndDate = endOfUtcDateOnly(rangeEnd);

  const results = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        transactionDate: {
          $gte: rangeStart,
          $lte: inclusiveEndDate,
        },
      },
    },
    {
      $group: {
        _id: {
          year: {
            $year: "$transactionDate",
          },
          month: {
            $month: "$transactionDate",
          },
          type: "$type",
        },
        total: {
          $sum: "$amount",
        },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },
  ]);

  const resultMap = new Map();

  for (const item of results) {
    const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;

    if (!resultMap.has(key)) {
      resultMap.set(key, {
        income: 0,
        expense: 0,
      });
    }

    const monthRecord = resultMap.get(key);

    if (item._id.type === "INCOME") {
      monthRecord.income = item.total;
    } else {
      monthRecord.expense = item.total;
    }
  }

  const firstMonth = new Date(
    Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1),
  );
  const lastMonth = new Date(
    Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), 1),
  );

  const trend = [];
  const cursor = new Date(firstMonth);

  while (cursor <= lastMonth) {
    const year = cursor.getUTCFullYear();
    const monthNumber = cursor.getUTCMonth() + 1;
    const key = `${year}-${String(monthNumber).padStart(2, "0")}`;

    const totals = resultMap.get(key) || {
      income: 0,
      expense: 0,
    };

    trend.push({
      key,
      year,
      month: monthNumber,
      label: cursor.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      income: totals.income,
      expense: totals.expense,
      netSavings: totals.income - totals.expense,
    });

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return trend;
};

const getTopExpensesForUser = async ({
  userId,
  limit = 5,
  startDate,
  endDate,
}) => {
  return Transaction.find({
    user: userId,
    type: "EXPENSE",
    ...buildDateMatch({
      startDate,
      endDate,
    }),
  })
    .populate("account", "name type currency")
    .populate("category", "name icon color")
    .sort({
      amount: -1,
      transactionDate: -1,
    })
    .limit(limit);
};

const getAccountSummaryForUser = async ({
  userId,
}) => {
  const accounts = await Account.find({
    user: userId,
    isArchived: false,
  })
    .select(
      "name type balance currency color icon createdAt",
    )
    .sort({
      balance: -1,
    });

  const totalBalance = accounts.reduce(
    (total, account) => total + account.balance,
    0,
  );

  return accounts.map((account) => ({
    ...account.toObject(),

    percentage:
      totalBalance !== 0
        ? Number(
            (
              (account.balance / totalBalance) *
              100
            ).toFixed(2),
          )
        : 0,
  }));
};

export {
  getAccountSummaryForUser,
  getCategoryBreakdownForUser,
  getMonthlyTrendForUser,
  getOverviewForUser,
  getTopExpensesForUser,
};