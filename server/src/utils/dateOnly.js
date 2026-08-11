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

const toUtcDateOnly = (value) => {
  const dateKey = getDateKey(value);
  return dateKey ? new Date(`${dateKey}T00:00:00.000Z`) : null;
};


const normalizeStoredDateOnly = (
  value,
  timeZone = DEFAULT_TIMEZONE,
) => {
  if (!value) return null;

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const isAlreadyCanonical =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  const dateKey = isAlreadyCanonical
    ? getDateKey(date)
    : getDateKeyInTimeZone(date, timeZone);

  return toUtcDateOnly(dateKey);
};

const endOfUtcDateOnly = (value) => {
  const dateKey = getDateKey(value);
  return dateKey ? new Date(`${dateKey}T23:59:59.999Z`) : null;
};

const addDaysDateOnly = (value, days) => {
  const date = toUtcDateOnly(value);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date;
};

const addMonthsDateOnlyClamped = (value, months) => {
  const source = toUtcDateOnly(value);
  const originalDay = source.getUTCDate();
  const targetYear = source.getUTCFullYear();
  const targetMonth = source.getUTCMonth() + Number(months || 0);
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(targetYear, targetMonth, Math.min(originalDay, lastDay)),
  );
};

const addYearsDateOnlyClamped = (value, years) => {
  const source = toUtcDateOnly(value);
  const targetYear = source.getUTCFullYear() + Number(years || 0);
  const month = source.getUTCMonth();
  const day = source.getUTCDate();
  const lastDay = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();

  return new Date(Date.UTC(targetYear, month, Math.min(day, lastDay)));
};

const differenceInCalendarDays = (left, right) => {
  const leftDate = toUtcDateOnly(left);
  const rightDate = toUtcDateOnly(right);
  return Math.round((leftDate.getTime() - rightDate.getTime()) / 86400000);
};

const getDateOnlyAsOfInTimeZone = (
  value = new Date(),
  timeZone = DEFAULT_TIMEZONE,
) => endOfUtcDateOnly(getDateKeyInTimeZone(value, timeZone)).toISOString();

export {
  DEFAULT_TIMEZONE,
  addDaysDateOnly,
  addMonthsDateOnlyClamped,
  addYearsDateOnlyClamped,
  differenceInCalendarDays,
  endOfUtcDateOnly,
  getDateKey,
  getDateKeyInTimeZone,
  getDateOnlyAsOfInTimeZone,
  getMonthKeyInTimeZone,
  normalizeStoredDateOnly,
  toUtcDateOnly,
};
