import AppError from "./AppError.js";

// Historical trade imports need a separate immutable-ledger replay mechanism.
// Current FIFO cost lots are allocated in recording order and cannot be
// silently re-written by a backdated purchase or sale.
const assertTradeDateNotBeforeLatest = ({ tradeDate, latestTradeDate }) => {
  if (latestTradeDate && tradeDate.getTime() < new Date(latestTradeDate).getTime()) {
    throw new AppError(
      "Trade date is earlier than the latest recorded trade for this account and instrument. Record trades chronologically or reconcile the historical ledger first.",
      409,
      { code: "INVESTMENT_TRADE_BACKDATED" },
    );
  }
};

export { assertTradeDateNotBeforeLatest };
