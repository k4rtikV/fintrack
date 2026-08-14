import axios from "axios";

import { buildNotificationEmail } from "../emails/notificationEmail.js";
import { buildLoginAlertEmail } from "../emails/securityEmail.js";

const sendTransactionalEmail = async ({ to, subject, htmlContent }) => {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
    throw new Error("Brevo email configuration is incomplete");
  }

  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        name: process.env.BREVO_SENDER_NAME || "FinTrack",
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    },
    {
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      timeout: 10000,
    },
  );
};

const sendOtpEmail = async ({ email, fullName, otp, purpose }) => {
  const isRegistration = purpose === "registration";
  const title = isRegistration
    ? "Verify your FinTrack account"
    : "Confirm your FinTrack login";
  const description = isRegistration
    ? "Use this code to verify your email address and activate your FinTrack account."
    : "Use this code to complete your FinTrack login.";
  const expiryMinutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10;

  const htmlContent = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:560px;margin:40px auto;padding:24px;">
          <div style="background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e2e8f0;">
            <div style="font-size:14px;font-weight:700;color:#059669;letter-spacing:1px;">FINTRACK</div>
            <h1 style="font-size:26px;margin:14px 0 8px;">${title}</h1>
            <p style="color:#475569;line-height:1.6;">Hi ${fullName},</p>
            <p style="color:#475569;line-height:1.6;">${description}</p>
            <div style="margin:28px 0;padding:20px;text-align:center;background:#ecfdf5;border-radius:16px;">
              <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#047857;">${otp}</div>
            </div>
            <p style="font-size:14px;color:#64748b;">This code expires in ${expiryMinutes} minutes. Do not share it with anyone.</p>
            <p style="font-size:13px;color:#94a3b8;margin-top:28px;">If you did not request this code, you can ignore this email.</p>
          </div>
        </div>
      </body>
    </html>`;

  await sendTransactionalEmail({
    to: email,
    subject: title,
    htmlContent,
  });
};


const sendLoginAlertEmail = async ({
  user,
  securityContext,
  loginAt,
}) => {
  await sendTransactionalEmail({
    to: user.email,
    subject: "FinTrack security: new login",
    htmlContent: buildLoginAlertEmail({
      user,
      securityContext,
      loginAt,
    }),
  });
};

const sendNotificationEmail = async ({ user, notification }) => {
  await sendTransactionalEmail({
    to: user.email,
    subject: `FinTrack: ${notification.title}`,
    htmlContent: buildNotificationEmail({ user, notification }),
  });
};

export {
  sendLoginAlertEmail,
  sendNotificationEmail,
  sendOtpEmail,
  sendTransactionalEmail,
};
