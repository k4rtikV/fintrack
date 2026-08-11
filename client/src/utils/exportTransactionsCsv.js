import { getDateKey } from "./dateUtils";

const escapeCsvValue = (value) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

const exportTransactionsCsv = ({ transactions, filename = "fintrack-transactions.csv" }) => {
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

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default exportTransactionsCsv;
