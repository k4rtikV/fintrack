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
  sendTransactionalEmail,
};
