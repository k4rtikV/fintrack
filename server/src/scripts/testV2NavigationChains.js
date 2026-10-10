import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const shell = read("client/src/layouts/DashboardLayout.jsx");
const host = read("client/src/components/transactions/StatementImportHost.jsx");
const page = read("client/src/pages/TransactionsPage.jsx");
const modal = read("client/src/components/transactions/StatementImportModal.jsx");
const auth = read("client/src/context/AuthContext.jsx");
const assistant = read("client/src/pages/AssistantPage.jsx");
const notification = read("client/src/components/notifications/NotificationPanel.jsx");
const topbar = read("client/src/components/layout/Topbar.jsx");
const statement = read("server/src/services/statementImport.service.js");

assert.match(shell, /<StatementImportHost key=/);
const animatedOutlet = read("client/src/components/layout/AnimatedOutlet.jsx");
assert.match(animatedOutlet, /key=\{location\.pathname\}/);
assert.doesNotMatch(animatedOutlet, /key=\{location\.key/);
assert.ok(shell.indexOf("<StatementImportHost") < shell.indexOf("<AnimatedOutlet"), "Import host must outlive route remounts");
assert.match(host, /<StatementImportModal/);
assert.match(host, /invalidateQueries\(\{ queryKey: \["transactions"\]/);
assert.doesNotMatch(page, /<StatementImportModal/);
assert.match(page, /useStatementImport\(\)/);
assert.match(modal, /activeActionRef\.current/);
assert.match(modal, /if \(!aliveRef\.current\) return/);
assert.match(modal, /onKeyDown=\{handleDialogKeyDown\}/);
assert.match(modal, /getClientRects\(\)/);
assert.match(modal, /Some statement rows have no bank reference\/UTR/);
assert.match(statement, /mongoose\.connection\.transaction/);
assert.match(statement, /alreadyCommitted: true/);
assert.match(auth, /authRevisionRef\.current === revision/);
assert.match(auth, /refreshSequenceRef\.current === sequence/);
assert.match(auth, /cancelPendingTransactionExports\(\)/);
assert.match(assistant, /pane\.scrollTo\(/);
assert.doesNotMatch(assistant, /messagesEndRef\.current\?\.scrollIntoView/);
assert.ok(notification.indexOf("navigate(notification.actionUrl)") < notification.indexOf("onMarkRead(notification._id)"));
assert.match(topbar, /notificationsRevisionRef\.current/);
const bulk = page.split("const handleBulkDelete = async () => {")[1].split("const handleExport")[0];
assert.match(bulk, /for \(const id of ids\)/);
assert.doesNotMatch(bulk, /Promise\.all\(selectedIds/);

// Exercise the actual route-independent export coordinator with an isolated
// API mock. This is an executable lifecycle test, not just source matching.
const source = read("client/src/services/transactionService.js")
  .replace(/^import [^\n]+;\s*$/gm, "")
  .replace(/export\s*\{[\s\S]*?\};?\s*$/, "");
const makeService = new Function("api", "exportTransactionsCsv", "getDateKeyInTimeZone",
  `${source}\nreturn { downloadTransactionsCsv, cancelPendingTransactionExports, subscribeTransactionExports, getTransactionExportSnapshot };`);
let writes = 0, calls = 0, listeners = 0;
let releaseFirst;
const api = {
  get(_url, { signal }) {
    calls++;
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(Object.assign(new Error("Canceled"), { code: "ERR_CANCELED" }));
      signal?.addEventListener("abort", onAbort, { once: true });
      releaseFirst = () => {
        signal?.removeEventListener("abort", onAbort);
        resolve({ data: { data: { transactions: [{ _id: "1", title: "Salary" }] }, pagination: { pages: 1 } } });
      };
    });
  },
};
const service = makeService(api, () => { writes++; }, () => "2026-10-10");
const unsubscribe = service.subscribeTransactionExports(() => listeners++);
const first = service.downloadTransactionsCsv({ params: {}, userId: "user-A" });
const second = service.downloadTransactionsCsv({ params: {}, userId: "user-A" });
assert.strictEqual(first, second, "Repeat click must join existing export");
await Promise.resolve();
assert.equal(calls, 1);
assert.equal(service.getTransactionExportSnapshot(), "user-A");
// Unsubscribe simulates route navigation; coordinator still finishes the job.
unsubscribe();
releaseFirst();
assert.equal(await first, 1);
assert.equal(writes, 1, "Export must still deliver on navigation");
assert.equal(service.getTransactionExportSnapshot(), "");
assert.ok(listeners > 0);
const inFlight = service.downloadTransactionsCsv({ params: {}, userId: "user-A" });
await Promise.resolve();
service.cancelPendingTransactionExports();
await assert.rejects(inFlight, (error) => error.code === "ERR_CANCELED");
assert.equal(writes, 1, "Logout or lock must not write private CSV later");
assert.equal(service.getTransactionExportSnapshot(), "");
console.log("FinTrack V2 import, auth, notification, assistant, bulk-delete and route-independent export regressions passed.");
