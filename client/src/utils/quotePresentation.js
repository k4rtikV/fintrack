// Shared NSE/BSE quote presentation: a polling cadence is NOT proof of a live trade.
const asDate = (value) => {
  if (value == null || value === "") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const formatMarketTime = (value) => {
  const date = asDate(value);
  return date ? `${new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(date)} IST` : null;
};

const getQuotePresentation = (quote, exchangeStatus = "UNKNOWN", hasCostBasis = false) => {
  if (quote?.lastPrice == null || Number(quote.lastPrice) <= 0) {
    return { label: hasCostBasis ? "COST BASIS · NO QUOTE" : "QUOTE UNAVAILABLE", time: null, live: false };
  }
  const fetched = asDate(quote.quoteFetchedAt || quote.quoteUpdatedAt);
  const traded = asDate(quote.lastTradeAt);
  const fetchedRecently = fetched && Date.now() - fetched.getTime() >= 0 && Date.now() - fetched.getTime() < 35000;
  const tradedRecently = traded && Date.now() - traded.getTime() >= 0 && Date.now() - traded.getTime() < 180000;
  const live = exchangeStatus === "OPEN" && fetchedRecently && tradedRecently;
  const label = live ? "RECENT TRADE" : exchangeStatus === "CLOSED" ? "MARKET CLOSED"
    : exchangeStatus === "OPEN" && fetchedRecently ? "QUOTE REFRESHED" : "CACHED PRICE";
  const timestamp = traded ? `Last trade ${formatMarketTime(traded)}`
    : quote.quoteUpdatedAt ? `Snapshot ${formatMarketTime(quote.quoteUpdatedAt)}`
      : fetched ? `Checked ${formatMarketTime(fetched)}` : null;
  return { label, time: timestamp, live: Boolean(live) };
};

export { formatMarketTime, getQuotePresentation };
