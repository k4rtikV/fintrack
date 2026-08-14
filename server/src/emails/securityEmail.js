import { getPrimaryClientUrl } from "../config/clientOrigins.js";
import { emailLayout, escapeHtml } from "./emailLayout.js";

const formatLoginTime = ({ date, locale, timezone }) => {
  try {
    return new Intl.DateTimeFormat(locale || "en-IN", {
      dateStyle: "medium",
      timeStyle: "long",
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return date.toISOString();
  }
};

const buildLoginAlertEmail = ({
  user,
  securityContext,
  loginAt = new Date(),
}) => {
  const loginTime = formatLoginTime({
    date: loginAt,
    locale: user.locale,
    timezone: user.timezone,
  });

  const bodyHtml = `
    <p style="margin:0 0 12px">Hi ${escapeHtml(user.fullName || "there")},</p>
    <p style="margin:0 0 18px">A new authenticated session was created for your FinTrack account.</p>
    <div style="margin:20px 0;padding:18px;border-radius:14px;background:#f8fafc">
      <div><strong>Device:</strong> ${escapeHtml(securityContext.deviceType)}</div>
      <div style="margin-top:6px"><strong>Browser:</strong> ${escapeHtml(securityContext.browser)}</div>
      <div style="margin-top:6px"><strong>Operating system:</strong> ${escapeHtml(securityContext.os)}</div>
      <div style="margin-top:6px"><strong>Network address:</strong> ${escapeHtml(securityContext.ipAddress)}</div>
      <div style="margin-top:6px"><strong>Time:</strong> ${escapeHtml(loginTime)}</div>
    </div>
    <p style="margin:0">If this was you, no action is needed. If you do not recognize this login, review your active sessions and change your password immediately.</p>`;

  return emailLayout({
    preheader: "New login to your FinTrack account",
    title: "New FinTrack login",
    bodyHtml,
    action: {
      url: `${getPrimaryClientUrl()}/settings`,
      label: "Review account security",
    },
  });
};

export { buildLoginAlertEmail };
