import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

const server = read("server/src/server.js");
const controller = read("server/src/controllers/recurring.controller.js");
const scheduler = read("server/src/services/autopayScheduler.service.js");
const recurringService = read("server/src/services/recurring.service.js");
const transactionModel = read("server/src/models/Transaction.js");
const envExample = read("server/.env.example");

assert(
  server.includes('runAutopaySweep({ reason: "startup" })'),
  "Server startup must perform overdue Autopay catch-up before serving normal traffic",
);
assert(
  server.includes("startAutopayScheduler()"),
  "Server must start the recurring Autopay scheduler",
);
assert(
  server.includes("stopAutopayScheduler()"),
  "Scheduler must stop during graceful shutdown",
);
assert(
  scheduler.includes("setInterval") && scheduler.includes("sweepInProgress"),
  "Autopay scheduler must run periodically and prevent overlapping local sweeps",
);
assert(
  scheduler.includes('RecurringTransaction.distinct("user"'),
  "Scheduler must discover users with active Autopay rules independently of page visits",
);
assert(
  scheduler.includes("processDueRecurringForUser"),
  "Scheduler must reuse the authoritative existing Autopay processing service",
);
assert(
  envExample.includes("AUTOPAY_SCHEDULER_INTERVAL_MINUTES=15"),
  "Scheduler cadence must be documented in the environment example",
);

const getRecurringBlock = controller.match(
  /const getRecurring = async[\s\S]*?\n};/,
)?.[0] || "";
assert(
  !getRecurringBlock.includes("processDueRecurringForUser"),
  "GET /api/recurring must remain read-only; viewing Autopay must not trigger deductions",
);
assert(
  recurringService.includes("MAX_OCCURRENCES_PER_PROCESS"),
  "Catch-up must retain the bounded per-schedule processing cap",
);
assert(
  transactionModel.includes("recurringOccurrenceDate") &&
    transactionModel.includes("unique: true"),
  "Generated Autopay occurrences must retain database-level duplicate protection",
);

console.log("FinTrack v2 automatic Autopay scheduler regression tests passed.");
