const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "TRANSFER"];

const isTransferType = (type) => type === "TRANSFER";

const addDelta = (deltas, accountId, amount) => {
  const key = accountId?.toString();
  if (!key) return;
  deltas.set(key, (deltas.get(key) || 0) + Number(amount || 0));
};

const buildBalanceDeltas = ({
  type,
  amount,
  accountId,
  destinationAccountId = null,
  direction = 1,
}) => {
  const deltas = new Map();
  const normalizedAmount = Number(amount || 0) * Number(direction || 1);

  if (type === "TRANSFER") {
    addDelta(deltas, accountId, -normalizedAmount);
    addDelta(deltas, destinationAccountId, normalizedAmount);
  } else if (type === "INCOME") {
    addDelta(deltas, accountId, normalizedAmount);
  } else if (type === "EXPENSE") {
    addDelta(deltas, accountId, -normalizedAmount);
  }

  return deltas;
};

const mergeBalanceDeltas = (...maps) => {
  const result = new Map();
  for (const map of maps) {
    for (const [accountId, delta] of map.entries()) {
      result.set(accountId, (result.get(accountId) || 0) + delta);
    }
  }
  return result;
};

export { TRANSACTION_TYPES, buildBalanceDeltas, isTransferType, mergeBalanceDeltas };
