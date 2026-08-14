import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

import {
  getAllowedClientOrigins,
  normalizeClientOrigin,
} from "./config/clientOrigins.js";
import protectCookieAuthenticatedMutation from "./middleware/csrf.middleware.js";
import {
  errorHandler,
  notFound,
} from "./middleware/error.middleware.js";

import accountRoutes from "./routes/account.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import assistantRoutes from "./routes/assistant.routes.js";
import authRoutes from "./routes/auth.routes.js";
import budgetRoutes from "./routes/budget.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import goalRoutes from "./routes/goal.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import recurringRoutes from "./routes/recurring.routes.js";
import reportRoutes from "./routes/report.routes.js";
import securityRoutes from "./routes/security.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";

const app = express();

if (process.env.NODE_ENV === "production") {
  const configuredHops = Number.parseInt(
    process.env.TRUST_PROXY_HOPS || "1",
    10,
  );

  app.set(
    "trust proxy",
    Number.isFinite(configuredHops) && configuredHops > 0
      ? configuredHops
      : 1,
  );
}

app.disable("x-powered-by");
app.use(helmet());

const allowedClientOrigins = getAllowedClientOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser tools such as health checks do not send an Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(
        null,
        allowedClientOrigins.includes(normalizeClientOrigin(origin)),
      );
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(protectCookieAuthenticatedMutation);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FinTrack backend is running",
  });
});

app.get("/api/health", (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected
      ? "FinTrack API is working"
      : "FinTrack API is running but the database is unavailable",
    environment: process.env.NODE_ENV,
    database: databaseConnected ? "connected" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
