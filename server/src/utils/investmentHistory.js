// Normalize Upstox V3 OHLC candles without relying on provider array ordering.
const istDay = (value) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
}).format(value);
const numeric = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
const normalizeCandles = (candles, config) => {
  const result = (Array.isArray(candles) ? candles : []).map((row) => ({
    at: row?.[0], open: numeric(row?.[1]), high: numeric(row?.[2]),
    low: numeric(row?.[3]), close: numeric(row?.[4]), volume: numeric(row?.[5]),
  })).filter((row) => Number.isFinite(Date.parse(row.at)) && row.close > 0 && row.open > 0 && row.high >= row.low);
  result.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const unique = [...new Map(result.map((row) => [row.at, row])).values()];
  if (config.days) {
    const dates = [...new Set(unique.map((row) => istDay(new Date(row.at))))].slice(-config.days);
    return unique.filter((row) => dates.includes(istDay(new Date(row.at)))).slice(-500);
  }
  return unique.slice(-500);
};
export { normalizeCandles };
