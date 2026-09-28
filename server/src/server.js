import dotenv from "dotenv";

dotenv.config();

const { validateEnvironment } = await import("./config/env.js");
validateEnvironment();

const { default: connectDatabase } = await import("./config/db.js");
const { default: app } = await import("./app.js");
const {
  logSweepResult,
  runAutopaySweep,
  startAutopayScheduler,
  stopAutopayScheduler,
} = await import("./services/autopayScheduler.service.js");

const PORT = process.env.PORT || 5000;

await connectDatabase();

try {
  const startupSweep = await runAutopaySweep({ reason: "startup" });
  logSweepResult(startupSweep);
} catch (error) {
  // Autopay catch-up must never prevent the API from starting. Existing
  // occurrence uniqueness + Mongo transactions keep later retries safe.
  console.error(`[Autopay] startup catch-up failed: ${error.message}`);
}

const server = app.listen(PORT, () => {
  console.log(
    `FinTrack server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
  );
});

startAutopayScheduler();

const shutdown = (signal) => {
  console.log(`${signal} received. Closing server...`);
  stopAutopayScheduler();

  server.close(async () => {
    const mongoose = await import("mongoose");

    await mongoose.default.connection.close();

    console.log("HTTP server and MongoDB connection closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (error) => {
  console.error(`Unhandled rejection: ${error.message}`);
  stopAutopayScheduler();

  server.close(() => {
    process.exit(1);
  });
});
