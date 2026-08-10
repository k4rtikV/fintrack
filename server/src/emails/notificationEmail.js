import { emailLayout, escapeHtml } from "./emailLayout.js";

const formatCurrency = (amount, currency = "INR", locale = "en-IN") =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const buildNotificationEmail = ({ user, notification }) => {
  const name = escapeHtml(user.fullName || "there");
  const metadata = notification.metadata || {};
  let details = "";

  if (notification.type === "BUDGET") {
    details = `
      <div style="margin:20px 0;padding:18px;border-radius:14px;background:#f8fafc">
        <div><strong>${escapeHtml(metadata.categoryName || "Budget")}</strong></div>
        <div style="margin-top:8px">Spent: <strong>${formatCurrency(metadata.spent, user.preferredCurrency, user.locale)}</strong></div>
        <div>Budget: ${formatCurrency(metadata.budgetAmount, user.preferredCurrency, user.locale)}</div>
      </div>`;
  }

  if (notification.type === "GOAL") {
    details = `
      <div style="margin:20px 0;padding:18px;border-radius:14px;background:#f8fafc">
        <div><strong>${escapeHtml(metadata.goalName || "Goal")}</strong></div>
        <div style="margin-top:8px">Progress: <strong>${Number(metadata.percentage || 0).toFixed(0)}%</strong></div>
        <div>Saved: ${formatCurrency(metadata.currentAmount, user.preferredCurrency, user.locale)} of ${formatCurrency(metadata.targetAmount, user.preferredCurrency, user.locale)}</div>
      </div>`;
  }

  if (notification.type === "RECURRING") {
    details = `
      <div style="margin:20px 0;padding:18px;border-radius:14px;background:#f8fafc">
        <div><strong>${escapeHtml(metadata.transactionTitle || "Recurring transaction")}</strong></div>
        <div style="margin-top:8px">Amount: <strong>${formatCurrency(metadata.amount, user.preferredCurrency, user.locale)}</strong></div>
        <div>Type: ${escapeHtml(metadata.transactionType || "")}</div>
      </div>`;
  }

  const bodyHtml = `
    <p style="margin:0 0 12px">Hi ${name},</p>
    <p style="margin:0">${escapeHtml(notification.message)}</p>
    ${details}`;

  return emailLayout({
    preheader: notification.title,
    title: notification.title,
    bodyHtml,
    action: notification.actionUrl
      ? {
          url: `${process.env.CLIENT_URL || "http://localhost:5173"}${notification.actionUrl}`,
          label: "View in FinTrack",
        }
      : null,
  });
};

export { buildNotificationEmail };
