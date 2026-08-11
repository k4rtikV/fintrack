import { getDateKey } from "./dateUtils";

const neutralizeSpreadsheetFormula = (value) => {
  const text = String(value ?? "");

  // Spreadsheet applications may interpret cells beginning with these
  // characters as formulas. Prefix user-controlled text so CSV exports remain
  // inert when opened in Excel/Sheets while preserving the visible value.
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) {
    return `'${text}`;
  }

  return text;
};

const escapeCsvValue = (value) => {
  const text = neutralizeSpreadsheetFormula(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const exportTransactionsCsv = ({
  transactions,
  filename = "fintrack-transactions.csv",
}) => {
  const header = [
    "Date",
    "Type",
    "Title",
    "Account",
    "Category",
    "Payment method",
    "Amount",
    "Tags",
    "Note",
  ];

  const rows = transactions.map((transaction) => [
    getDateKey(transaction.transactionDate),
    transaction.type,
    transaction.title,
    transaction.account?.name || "",
    transaction.category?.name || "",
    transaction.paymentMethod?.replaceAll("_", " ") || "",
    transaction.amount,
    (transaction.tags || []).join(" | "),
    transaction.note || "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default exportTransactionsCsv;
