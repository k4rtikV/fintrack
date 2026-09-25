const isAccountCurrencyChangeLocked = ({
  currentCurrency,
  nextCurrency,
  hasFinancialReferences,
  currentBalance = 0,
}) => {
  if (!nextCurrency || nextCurrency === currentCurrency) {
    return false;
  }

  return Boolean(hasFinancialReferences) || Number(currentBalance || 0) !== 0;
};

const addCurrencyRelativePercentages = (accounts = []) => {
  const totalsByCurrency = accounts.reduce((totals, account) => {
    const currency = account.currency || "UNKNOWN";
    totals.set(currency, (totals.get(currency) || 0) + Number(account.balance || 0));
    return totals;
  }, new Map());

  return accounts.map((account) => {
    const currency = account.currency || "UNKNOWN";
    const currencyTotal = totalsByCurrency.get(currency) || 0;
    const percentage =
      currencyTotal !== 0
        ? Number(((Number(account.balance || 0) / currencyTotal) * 100).toFixed(2))
        : 0;

    return {
      ...account,
      percentage,
      currencyTotal,
    };
  });
};

const buildCurrencyScopedTransactionStages = (currency) => {
  if (!currency) {
    return [];
  }

  return [
    {
      $lookup: {
        from: "accounts",
        localField: "account",
        foreignField: "_id",
        as: "analyticsAccount",
      },
    },
    { $unwind: "$analyticsAccount" },
    {
      $match: {
        "analyticsAccount.currency": currency,
      },
    },
  ];
};

const summarizeRecurringAggregateRows = (rows = []) => {
  const incomeRecord = rows.find((item) => item._id === "INCOME");
  const expenseRecord = rows.find((item) => item._id === "EXPENSE");

  return {
    count: (Number(incomeRecord?.count) || 0) + (Number(expenseRecord?.count) || 0),
    income: Number(incomeRecord?.amount) || 0,
    expense: Number(expenseRecord?.amount) || 0,
  };
};

export {
  addCurrencyRelativePercentages,
  buildCurrencyScopedTransactionStages,
  isAccountCurrencyChangeLocked,
  summarizeRecurringAggregateRows,
};
