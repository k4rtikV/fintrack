const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DATE_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

const isValidDateKey = (value) => {
  if (!DATE_KEY_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const normalizeTimeZone = (timeZone = DEFAULT_TIMEZONE) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

const getDateKey = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const candidate = value.slice(0, 10);
    if (isValidDateKey(candidate)) return candidate;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const getDateKeyInTimeZone = (
  value = new Date(),
  timeZone = DEFAULT_TIMEZONE,
) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => ["year", "month", "day"].includes(part.type))
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const getMonthKeyInTimeZone = (
  value = new Date(),
  timeZone = DEFAULT_TIMEZONE,
) => getDateKeyInTimeZone(value, timeZone).slice(0, 7);

const dateKeyToUtcDate = (dateKey) => {
  const normalized = getDateKey(dateKey);
  if (!normalized) return null;
  return new Date(`${normalized}T00:00:00.000Z`);
};

const addDaysToDateKey = (dateKey, days) => {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const addMonthsToDateKey = (dateKey, months) => {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return "";

  const originalDay = date.getUTCDate();
  const targetYear = date.getUTCFullYear();
  const targetMonth = date.getUTCMonth() + Number(months || 0);
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(targetYear, targetMonth, Math.min(originalDay, lastDay)),
  )
    .toISOString()
    .slice(0, 10);
};

const getMonthStartKey = (dateKey) => {
  const normalized = getDateKey(dateKey);
  return normalized ? `${normalized.slice(0, 7)}-01` : "";
};

const getMonthEndKey = (dateKey) => {
  const normalized = getDateKey(dateKey);
  if (!normalized) return "";

  const [year, month] = normalized.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
};

const getYearStartKey = (dateKey) => {
  const normalized = getDateKey(dateKey);
  return normalized ? `${normalized.slice(0, 4)}-01-01` : "";
};

const formatDateOnly = (value, locale = "en-IN") => {
  const dateKey = getDateKey(value);
  if (!dateKey) return "—";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateKeyToUtcDate(dateKey));
};

export {
  DEFAULT_TIMEZONE,
  addDaysToDateKey,
  addMonthsToDateKey,
  formatDateOnly,
  getDateKey,
  getDateKeyInTimeZone,
  getMonthEndKey,
  getMonthKeyInTimeZone,
  getMonthStartKey,
  getYearStartKey,
};
