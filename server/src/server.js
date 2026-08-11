import dotenv from "dotenv";

dotenv.config();

const { validateEnvironment } = await import("./config/env.js");
validateEnvironment();

const { default: connectDatabase } = await import("./config/db.js");
const { default: app } = await import("./app.js");

const PORT = process.env.PORT || 5000;

await connectDatabase();

const server = app.listen(PORT, () => {
  console.log(
    `FinTrack server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
  );
});

const shutdown = (signal) => {
  console.log(`${signal} received. Closing server...`);

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

  server.close(() => {
    process.exit(1);
  });
});
