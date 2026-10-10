import { createHash } from "node:crypto";
import AppError from "./AppError.js";
import { isValidDateKey } from "./statementImportValidation.js";

const bad = (message) => { throw new AppError(message, 400); };
const within = (value, max, optional = false) => Number.isInteger(value) && value >= (optional ? -1 : 0) && value < max;
const normalizedText = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

const normalizeMapping = (mapping, rows) => {
  if (!mapping || typeof mapping !== "object") bad("Choose statement columns first");
  const maxColumns = Math.max(1, ...rows.map((row) => row.length));
  const headerRow = Number(mapping.headerRow);
  if (!within(headerRow, Math.min(rows.length, 10))) bad("Choose a valid header row (first ten rows)");
  const mode = mapping.mode;
  if (!["DEBIT_CREDIT", "SIGNED_AMOUNT"].includes(mode)) bad("Choose Debit/Credit or Signed Amount mode");
  const m = {
    headerRow,
    mode,
    dateColumn: Number(mapping.dateColumn),
    descriptionColumn: Number(mapping.descriptionColumn),
    debitColumn: mode === "DEBIT_CREDIT" ? Number(mapping.debitColumn) : -1,
    creditColumn: mode === "DEBIT_CREDIT" ? Number(mapping.creditColumn) : -1,
    amountColumn: mode === "SIGNED_AMOUNT" ? Number(mapping.amountColumn) : -1,
    referenceColumn: mapping.referenceColumn === undefined || mapping.referenceColumn === ""
      ? -1 : Number(mapping.referenceColumn),
    dateOrder: mapping.dateOrder === "MDY" ? "MDY" : "DMY",
  };
  for (const [field, value] of Object.entries(m)) {
    if (field.endsWith("Column") && !within(value, maxColumns, field === "referenceColumn" ||
      (mode === "DEBIT_CREDIT" && field === "amountColumn") ||
      (mode === "SIGNED_AMOUNT" && ["debitColumn", "creditColumn"].includes(field)))) bad(`Invalid ${field}`);
  }
  const required = mode === "DEBIT_CREDIT"
    ? [m.dateColumn, m.descriptionColumn, m.debitColumn, m.creditColumn]
    : [m.dateColumn, m.descriptionColumn, m.amountColumn];
  if (new Set(required).size !== required.length) bad("Required statement columns must be different");
  return m;
};

const amountPaise = (input) => {
  let source = String(input ?? "").trim().replace(/\s|₹|INR|Rs\.?/gi, "");
  if (!source || source === "-") return 0;
  let negative = false;
  if (/^\(.*\)$/.test(source)) { negative = true; source = source.slice(1, -1); }
  const suffix = /(?:CR|DR)$/i.exec(source)?.[0]?.toUpperCase();
  if (suffix) source = source.slice(0, -2);
  source = source.replace(/,/g, "");
  if (!/^[+-]?\d+(?:\.\d{1,2})?$/.test(source)) return null;
  // Debit/credit notation in signed-amount statements carries the direction.
  // Reject contradictory signed/suffixed values rather than treating a debit as income.
  const explicitNegative = negative || source.startsWith("-");
  if (suffix === "CR" && explicitNegative) return null;
  if (suffix === "DR" && source.startsWith("+")) return null;
  const number = Number(source);
  if (!Number.isFinite(number) || Math.abs(number) > 1_000_000_000) return null;
  const magnitude = Math.round(Math.abs(number) * 100);
  return (explicitNegative || suffix === "DR" ? -1 : 1) * magnitude;
};

// Separate debit/credit columns already determine the transaction direction.
// Do not silently turn a negative credit into income, or accept a CR marker
// under the Debit column (and vice versa). A matching DR/CR suffix is fine.
// Statements using signed values should be mapped in SIGNED_AMOUNT mode.
const columnAmountPaise = (input, direction) => {
  const source = String(input ?? "").trim();
  if (/^[\s]*[-(]/.test(source)) return null;
  const suffix = /(?:CR|DR)$/i.exec(source)?.[0]?.toUpperCase();
  if (suffix && suffix !== (direction === "DEBIT" ? "DR" : "CR")) return null;
  const parsed = amountPaise(source);
  return parsed === null ? null : Math.abs(parsed);
};

const parseStatementDate = (input, dateOrder = "DMY", date1904 = false) => {
  const source = String(input ?? "").trim();
  if (/^\d{5}(?:\.0+)?$/.test(source)) {
    const serial = Number(source);
    if (serial < 20000 || serial > 80000) return null;
    const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
    const date = new Date(base + serial * 86400000);
    const key = date.toISOString().slice(0, 10);
    return isValidDateKey(key) ? key : null;
  }
  if (/^\d{4}-\d{2}-\d{2}(?:T|\s)\d{2}:\d{2}:\d{2}/.test(source)) {
    const key = source.slice(0, 10);
    return isValidDateKey(key) ? key : null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return isValidDateKey(source) ? source : null;
  let day, month, year;
  const parts = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(source);
  if (parts) {
    const first = Number(parts[1]), second = Number(parts[2]);
    [day, month] = dateOrder === "MDY" ? [second, first] : [first, second];
    year = parts[3].length === 2 ? (Number(parts[3]) >= 70 ? 1900 : 2000) + Number(parts[3]) : Number(parts[3]);
  } else {
    const textual = /^(\d{1,2})[\s/-]+([A-Za-z]{3,9})[\s/-]+(\d{2}|\d{4})$/.exec(source);
    if (!textual) return null;
    const names = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    day = Number(textual[1]); month = names.indexOf(textual[2].slice(0, 3).toLowerCase()) + 1; year = textual[3].length === 2 ? (Number(textual[3]) >= 70 ? 1900 : 2000) + Number(textual[3]) : Number(textual[3]);
  }
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidDateKey(key) ? key : null;
};

const normalizeStatementRows = ({ rows, mapping, date1904 }) => {
  const m = normalizeMapping(mapping, rows);
  const repeated = new Map();
  const normalized = [];
  for (let i = m.headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((item) => String(item || "").trim())) continue;
    const value = (index) => index < 0 ? "" : row[index] ?? "";
    const title = normalizedText(value(m.descriptionColumn)).slice(0, 100);
    const date = parseStatementDate(value(m.dateColumn), m.dateOrder, date1904);
    const ref = normalizedText(value(m.referenceColumn)).slice(0, 100);
    let paise, type;
    let error = null;
    if (m.mode === "SIGNED_AMOUNT") {
      const signed = amountPaise(value(m.amountColumn));
      if (signed === null || signed === 0) error = "Amount is missing or invalid";
      else { paise = Math.abs(signed); type = signed < 0 ? "EXPENSE" : "INCOME"; }
    } else {
      const debit = columnAmountPaise(value(m.debitColumn), "DEBIT");
      const credit = columnAmountPaise(value(m.creditColumn), "CREDIT");
      if (debit === null || credit === null || (Math.abs(debit) > 0 && Math.abs(credit) > 0) || (!debit && !credit)) {
        error = "Exactly one nonnegative debit or credit amount is required; use signed-amount mode for signed values";
      } else {
        type = Math.abs(debit) > 0 ? "EXPENSE" : "INCOME";
        paise = Math.abs(debit || credit);
      }
    }
    if (!date) error = "Invalid date; use YYYY-MM-DD or DD/MM/YYYY";
    if (title.length < 2) error = "Description must contain at least two characters";
    if (date && (date < "1990-01-01" || date > "2100-12-31")) error = "Date is outside the supported range";
    if (!error && (!Number.isSafeInteger(paise) || paise < 1 || paise > 100_000_000_000)) error = "Amount is out of range";
    let fingerprint = null;
    if (!error) {
      const base = [date, type, paise, title.toLocaleLowerCase("en-IN"), ref.toLocaleLowerCase("en-IN")].join("\u001f");
      const ordinal = repeated.get(base) || 0;
      repeated.set(base, ordinal + 1);
      fingerprint = createHash("sha256").update(`${base}\u001f${ordinal}`).digest("hex");
    }
    normalized.push({ rowIndex: i, date, title, reference: ref, type, amount: paise ? paise / 100 : null, paise, fingerprint, error });
  }
  if (normalized.length > 500) bad("Statement contains more than 500 transactions; split the file into smaller batches");
  if (!normalized.length) bad("Statement contains no data rows after the chosen header");
  return { mapping: m, rows: normalized };
};

export { normalizeStatementRows, parseStatementDate, amountPaise };
