import RecurringTransaction from "../models/RecurringTransaction.js";
import User from "../models/User.js";
import { processDueRecurringForUser } from "./recurring.service.js";

const DEFAULT_INTERVAL_MINUTES = 15;
const MIN_INTERVAL_MINUTES = 5;
const MAX_INTERVAL_MINUTES = 24 * 60;

let intervalHandle = null;
let sweepInProgress = false;

const getAutopaySchedulerIntervalMinutes = () => {
  const configured = Number.parseInt(
    process.env.AUTOPAY_SCHEDULER_INTERVAL_MINUTES || "",
    10,
  );

  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_INTERVAL_MINUTES;
  }

  return Math.min(
    Math.max(configured, MIN_INTERVAL_MINUTES),
    MAX_INTERVAL_MINUTES,
  );
};

const runAutopaySweep = async ({
  now = new Date(),
  reason = "scheduled",
} = {}) => {
  if (sweepInProgress) {
    return {
      skipped: true,
      reason: "already-running",
      generatedCount: 0,
      processedSchedules: 0,
      processedUsers: 0,
      failures: [],
    };
  }

  sweepInProgress = true;

  try {
    const userIds = await RecurringTransaction.distinct("user", {
      isActive: true,
    });

    if (!userIds.length) {
      return {
        skipped: false,
        reason,
        generatedCount: 0,
        processedSchedules: 0,
        processedUsers: 0,
        failures: [],
      };
    }

    const users = await User.find({
      _id: { $in: userIds },
      isActive: true,
    })
      .select("_id timezone")
      .lean();

    const summary = {
      skipped: false,
      reason,
      generatedCount: 0,
      processedSchedules: 0,
      processedUsers: 0,
      failures: [],
    };

    for (const user of users) {
      try {
        const result = await processDueRecurringForUser({
          userId: user._id,
          timezone: user.timezone || "Asia/Kolkata",
          now,
        });

        summary.generatedCount += result.generatedCount || 0;
        summary.processedSchedules += result.processedSchedules || 0;
        summary.processedUsers += 1;
      } catch (error) {
        summary.failures.push({
          userId: String(user._id),
          message: error?.message || "Unknown Autopay processing error",
        });
      }
    }

    return summary;
  } finally {
    sweepInProgress = false;
  }
};

const logSweepResult = (summary) => {
  if (!summary || summary.skipped) {
    return;
  }

  if (summary.generatedCount > 0 || summary.failures.length > 0) {
    console.log(
      `[Autopay] ${summary.reason}: generated ${summary.generatedCount} transaction(s) across ${summary.processedUsers} user(s).`,
    );
  }

  for (const failure of summary.failures) {
    console.error(
      `[Autopay] user ${failure.userId}: ${failure.message}`,
    );
  }
};

const startAutopayScheduler = () => {
  if (intervalHandle) {
    return intervalHandle;
  }

  const intervalMinutes = getAutopaySchedulerIntervalMinutes();
  const intervalMs = intervalMinutes * 60 * 1000;

  intervalHandle = setInterval(() => {
    void runAutopaySweep({ reason: "interval" })
      .then(logSweepResult)
      .catch((error) => {
        console.error(`[Autopay] scheduler sweep failed: ${error.message}`);
      });
  }, intervalMs);

  intervalHandle.unref?.();
  console.log(`[Autopay] scheduler active every ${intervalMinutes} minute(s).`);

  return intervalHandle;
};

const stopAutopayScheduler = () => {
  if (!intervalHandle) {
    return;
  }

  clearInterval(intervalHandle);
  intervalHandle = null;
};

export {
  getAutopaySchedulerIntervalMinutes,
  logSweepResult,
  runAutopaySweep,
  startAutopayScheduler,
  stopAutopayScheduler,
};
