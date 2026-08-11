import { formatDateOnly } from "./dateUtils";

const formatCurrency = (value, currency = "INR") => {
  const numericValue = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const formatCompactCurrency = (value, currency = "INR") => {
  const numericValue = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericValue);
};

const formatDate = (value) => formatDateOnly(value);

export { formatCompactCurrency, formatCurrency, formatDate };
